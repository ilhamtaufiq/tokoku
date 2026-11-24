//! Integrasi pembayaran Xendit: webhook, sinkronisasi status, dan job latar belakang.
//!
//! Prinsip: webhook hanya PEMICU. Status yang dipakai selalu diambil ulang dari API Xendit
//! (`GET /v2/invoices/{id}`), lalu diterapkan secara idempotent.

use std::time::Duration;

use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    routing::post,
    Json, Router,
};
use serde_json::Value;
use subtle::ConstantTimeEq;

use crate::{
    error::{AppError, AppResult},
    orders,
    state::AppState,
    xendit,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/xendit", post(xendit_webhook))
}

fn token_matches(expected: &str, provided: &str) -> bool {
    !expected.is_empty() && expected.as_bytes().ct_eq(provided.as_bytes()).into()
}

async fn xendit_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<Value>,
) -> AppResult<StatusCode> {
    let provided = headers
        .get("x-callback-token")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !token_matches(&state.cfg.xendit_callback_token, provided) {
        return Err(AppError::Unauthorized);
    }

    let invoice_id = body.get("id").and_then(Value::as_str).ok_or_else(|| {
        AppError::BadRequest("field id tidak ada di webhook".into())
    })?;
    let status = body.get("status").and_then(Value::as_str).unwrap_or("UNKNOWN");

    // Catat event untuk audit. Duplikat dibiarkan; sinkronisasi di bawah tetap idempotent.
    sqlx::query(
        "INSERT IGNORE INTO webhook_events (provider, event_id, event_type, payload) VALUES ('xendit', ?, ?, ?)",
    )
    .bind(format!("{invoice_id}:{status}"))
    .bind(format!("invoice.{}", status.to_lowercase()))
    .bind(body.to_string())
    .execute(&state.pool)
    .await?;

    sync_invoice(&state, invoice_id).await?;

    sqlx::query("UPDATE webhook_events SET processed_at = UTC_TIMESTAMP() WHERE provider = 'xendit' AND event_id = ?")
        .bind(format!("{invoice_id}:{status}"))
        .execute(&state.pool)
        .await?;

    Ok(StatusCode::OK)
}

/// Ambil status invoice dari Xendit lalu terapkan ke pesanan.
pub async fn sync_invoice(state: &AppState, invoice_id: &str) -> AppResult<&'static str> {
    let invoice = xendit::get_invoice(&state.http, &state.cfg, invoice_id).await?;
    let raw = serde_json::to_value(&invoice).unwrap_or(Value::Null);

    match invoice.status.as_str() {
        "PAID" | "SETTLED" => {
            let amount = invoice
                .amount_decimal()
                .ok_or_else(|| AppError::Internal("nominal invoice tidak terbaca".into()))?;
            let mut tx = state.pool.begin().await?;
            let outcome = orders::mark_paid_tx(
                &mut tx,
                &invoice.external_id,
                &invoice.id,
                amount,
                invoice.payment_channel.as_deref(),
                &raw,
            )
            .await?;
            tx.commit().await?;
            tracing::info!(invoice = %invoice.external_id, outcome, "invoice PAID diproses");
            Ok(outcome)
        }
        "EXPIRED" => {
            let mut tx = state.pool.begin().await?;
            let order: Option<(u64,)> = sqlx::query_as("SELECT id FROM orders WHERE invoice_no = ? FOR UPDATE")
                .bind(&invoice.external_id)
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
            tracing::info!(invoice = %invoice.external_id, outcome, "invoice EXPIRED diproses");
            Ok(outcome)
        }
        _ => Ok("pending"),
    }
}

/// Job latar belakang: pembatalan pesanan kedaluwarsa dan rekonsiliasi status Xendit.
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

    if state.cfg.xendit_secret_key.is_empty() {
        tracing::warn!("XENDIT_SECRET_KEY kosong: rekonsiliasi pembayaran dinonaktifkan");
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
    let ids: Vec<(String,)> = sqlx::query_as(
        "SELECT xendit_invoice_id FROM orders
         WHERE payment_status = 'unpaid' AND status = 'pending_payment' AND xendit_invoice_id IS NOT NULL
         LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await?;
    for (invoice_id,) in ids {
        if let Err(e) = sync_invoice(state, &invoice_id).await {
            tracing::warn!(invoice_id, error = %e, "rekonsiliasi satu invoice gagal");
        }
    }
    Ok(())
}
