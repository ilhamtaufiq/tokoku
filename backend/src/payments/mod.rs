//! Integrasi pembayaran Midtrans: webhook, sinkronisasi status, dan job latar belakang.
//!
//! Prinsip: notifikasi hanya PEMICU. Signature SHA512 diverifikasi dulu, lalu status
//! selalu diambil ulang dari Core API Midtrans sebelum diterapkan ke pesanan.

use std::time::Duration;

use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use rust_decimal::Decimal;
use serde_json::Value;

use crate::{
    error::{AppError, AppResult},
    midtrans::{self, TxStatus},
    orders,
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/midtrans", post(midtrans_webhook))
}

fn str_field<'a>(body: &'a Value, key: &str) -> AppResult<&'a str> {
    body.get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| AppError::BadRequest(format!("field {key} tidak ada di notifikasi")))
}

async fn midtrans_webhook(State(state): State<AppState>, Json(body): Json<Value>) -> AppResult<StatusCode> {
    let order_id = str_field(&body, "order_id")?;
    let status_code = str_field(&body, "status_code")?;
    let gross_amount = str_field(&body, "gross_amount")?;
    let signature = str_field(&body, "signature_key")?;
    let transaction_status = body.get("transaction_status").and_then(Value::as_str).unwrap_or("unknown");

    if !midtrans::verify_signature(&state.cfg.midtrans_server_key, order_id, status_code, gross_amount, signature) {
        tracing::warn!(order_id, "notifikasi Midtrans dengan signature tidak valid ditolak");
        return Err(AppError::Unauthorized);
    }

    // Catat notifikasi untuk audit. Duplikat dibiarkan; sinkronisasi tetap idempotent.
    let event_id = format!("{order_id}:{transaction_status}:{status_code}");
    sqlx::query(
        "INSERT IGNORE INTO webhook_events (provider, event_id, event_type, payload) VALUES ('midtrans', ?, ?, ?)",
    )
    .bind(&event_id)
    .bind(format!("transaction.{transaction_status}"))
    .bind(body.to_string())
    .execute(&state.pool)
    .await?;

    sync_transaction(&state, order_id).await?;

    sqlx::query("UPDATE webhook_events SET processed_at = UTC_TIMESTAMP() WHERE provider = 'midtrans' AND event_id = ?")
        .bind(&event_id)
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::OK)
}

#[derive(Debug, PartialEq, Eq)]
enum Outcome {
    Paid,
    Expired,
    Pending,
}

/// Menerjemahkan transaction_status Midtrans menjadi keputusan internal.
/// Kartu kredit `capture` hanya dianggap lunas jika fraud_status = accept.
fn classify(status: &TxStatus) -> Outcome {
    match status.transaction_status.as_str() {
        "settlement" => Outcome::Paid,
        "capture" if status.fraud_status.as_deref() == Some("accept") => Outcome::Paid,
        "deny" | "cancel" | "expire" | "failure" => Outcome::Expired,
        _ => Outcome::Pending,
    }
}

/// Ambil status transaksi dari Core API lalu terapkan ke pesanan.
pub async fn sync_transaction(state: &AppState, order_id: &str) -> AppResult<&'static str> {
    let Some(status) = midtrans::get_status(&state.http, &state.cfg, order_id).await? else {
        return Ok("not_opened");
    };
    let raw = serde_json::to_value(&status).unwrap_or(Value::Null);

    match classify(&status) {
        Outcome::Paid => {
            let amount: Decimal = status
                .gross_amount
                .parse()
                .map_err(|_| AppError::Internal("nominal transaksi tidak terbaca".into()))?;
            let transaction_id = status
                .transaction_id
                .clone()
                .ok_or_else(|| AppError::Internal("transaction_id tidak ada".into()))?;
            let mut tx = state.pool.begin().await?;
            let outcome = orders::mark_paid_tx(
                &mut tx,
                &status.order_id,
                &transaction_id,
                amount,
                status.payment_type.as_deref(),
                &raw,
            )
            .await?;
            tx.commit().await?;
            tracing::info!(order_ref = %status.order_id, outcome, "transaksi Midtrans lunas diproses");
            Ok(outcome)
        }
        Outcome::Expired => {
            let mut tx = state.pool.begin().await?;
            let order: Option<(u64,)> = sqlx::query_as("SELECT id FROM orders WHERE payment_ref = ? FOR UPDATE")
                .bind(&status.order_id)
                .fetch_optional(&mut *tx)
                .await?;
            let outcome = match order {
                Some((order_id,)) => {
                    if orders::cancel_unpaid_tx(&mut tx, order_id, "expired").await? {
                        "cancelled"
                    } else {
                        "already_final"
                    }
                }
                None => "not_found",
            };
            tx.commit().await?;
            tracing::info!(order_ref = %status.order_id, outcome, "transaksi Midtrans gagal/kedaluwarsa diproses");
            Ok(outcome)
        }
        Outcome::Pending => Ok("pending"),
    }
}

/// Job latar belakang: pembatalan pesanan kedaluwarsa dan rekonsiliasi status Midtrans.
pub fn spawn_jobs(state: AppState) {
    let expiry_state = state.clone();
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(60));
        loop {
            tick.tick().await;
            if let Err(e) = expire_overdue_orders(&expiry_state).await {
                tracing::error!(error = %e, "job kedaluwarsa gagal");
            }
        }
    });

    if state.cfg.midtrans_server_key.is_empty() {
        tracing::warn!("MIDTRANS_SERVER_KEY kosong: rekonsiliasi pembayaran dinonaktifkan");
        return;
    }
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(300));
        loop {
            tick.tick().await;
            if let Err(e) = reconcile_pending(&state).await {
                tracing::error!(error = %e, "job rekonsiliasi gagal");
            }
        }
    });
}

async fn expire_overdue_orders(state: &AppState) -> AppResult<()> {
    let ids: Vec<(u64,)> = sqlx::query_as(
        "SELECT id FROM orders WHERE payment_status = 'unpaid' AND status = 'pending_payment'
         AND expires_at < UTC_TIMESTAMP() LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await?;
    for (id,) in ids {
        let mut tx = state.pool.begin().await?;
        let cancelled = orders::cancel_unpaid_tx(&mut tx, id, "expired").await?;
        tx.commit().await?;
        if cancelled {
            tracing::info!(order_id = id, "pesanan kedaluwarsa dibatalkan, stok dikembalikan");
        }
    }
    Ok(())
}

async fn reconcile_pending(state: &AppState) -> AppResult<()> {
    let refs: Vec<(String,)> = sqlx::query_as(
        "SELECT payment_ref FROM orders
         WHERE payment_status = 'unpaid' AND status = 'pending_payment' AND payment_ref IS NOT NULL
         LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await?;
    for (order_ref,) in refs {
        if let Err(e) = sync_transaction(state, &order_ref).await {
            tracing::warn!(order_ref, error = %e, "rekonsiliasi satu transaksi gagal");
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn st(ts: &str, fraud: Option<&str>) -> TxStatus {
        TxStatus {
            order_id: "INV-202611-000001".into(),
            status_code: "200".into(),
            gross_amount: "170000.00".into(),
            transaction_status: ts.into(),
            transaction_id: Some("t-1".into()),
            payment_type: Some("bank_transfer".into()),
            fraud_status: fraud.map(str::to_string),
        }
    }

    #[test]
    fn klasifikasi_status() {
        assert_eq!(classify(&st("settlement", None)), Outcome::Paid);
        assert_eq!(classify(&st("capture", Some("accept"))), Outcome::Paid);
        assert_eq!(classify(&st("capture", Some("challenge"))), Outcome::Pending);
        assert_eq!(classify(&st("pending", None)), Outcome::Pending);
        assert_eq!(classify(&st("expire", None)), Outcome::Expired);
        assert_eq!(classify(&st("deny", None)), Outcome::Expired);
    }

    #[test]
    fn signature_sha512_benar_dan_salah() {
        // SHA512("INV-1" + "200" + "170000.00" + "KEY")
        let key = "KEY";
        let good = {
            use sha2::{Digest, Sha512};
            let mut h = Sha512::new();
            h.update(b"INV-1200170000.00KEY");
            h.finalize().iter().map(|b| format!("{b:02x}")).collect::<String>()
        };
        assert!(midtrans::verify_signature(key, "INV-1", "200", "170000.00", &good));
        assert!(!midtrans::verify_signature(key, "INV-1", "200", "170000.01", &good));
        assert!(!midtrans::verify_signature("", "INV-1", "200", "170000.00", &good));
    }
}
