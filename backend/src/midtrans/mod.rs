//! Client Midtrans: Snap (membuat transaksi & URL pembayaran) dan Core API (cek status).
//! Autentikasi memakai server key sebagai username Basic Auth dan password kosong.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha512};
use subtle::ConstantTimeEq;

use crate::{
    config::Config,
    error::{AppError, AppResult},
};

pub struct SnapItem {
    pub id: String,
    pub name: String,
    pub price: i64,
    pub qty: u32,
}

pub struct SnapRequest {
    /// Harus unik per transaksi dan hanya berisi huruf, angka, '-', '_', '~', '.'.
    pub order_id: String,
    pub gross_amount: i64,
    pub items: Vec<SnapItem>,
    pub customer_name: String,
    pub customer_email: String,
    pub finish_url: String,
    pub expiry_minutes: i64,
    /// Daftar metode yang ditampilkan di Snap (mis. ["qris"]). None = semua metode.
    pub enabled_payments: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct SnapResponse {
    pub redirect_url: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TxStatus {
    pub order_id: String,
    pub status_code: String,
    pub gross_amount: String,
    pub transaction_status: String,
    #[serde(default)]
    pub transaction_id: Option<String>,
    #[serde(default)]
    pub payment_type: Option<String>,
    #[serde(default)]
    pub fraud_status: Option<String>,
}

fn ensure_configured(cfg: &Config) -> AppResult<()> {
    if cfg.midtrans_server_key.is_empty() {
        return Err(AppError::Gateway("MIDTRANS_SERVER_KEY belum diset".into()));
    }
    Ok(())
}

/// Membuat transaksi Snap. Respons berisi `redirect_url` ke halaman pembayaran Midtrans.
pub async fn create_snap(http: &reqwest::Client, cfg: &Config, req: &SnapRequest) -> AppResult<SnapResponse> {
    ensure_configured(cfg)?;
    let items: Vec<Value> = req
        .items
        .iter()
        .map(|i| json!({ "id": i.id, "name": i.name, "price": i.price, "quantity": i.qty }))
        .collect();
    let mut body = json!({
        "transaction_details": { "order_id": req.order_id, "gross_amount": req.gross_amount },
        "item_details": items,
        "customer_details": { "first_name": req.customer_name, "email": req.customer_email },
        "callbacks": { "finish": req.finish_url },
        "expiry": { "unit": "minutes", "duration": req.expiry_minutes.max(1) },
    });
    if let Some(methods) = &req.enabled_payments {
        body["enabled_payments"] = json!(methods);
    }

    let resp = http
        .post(format!("{}/snap/v1/transactions", cfg.midtrans_snap_base))
        .basic_auth(&cfg.midtrans_server_key, Some(""))
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Gateway(e.to_string()))?;
    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Gateway(format!("midtrans snap HTTP {status}: {text}")));
    }
    resp.json::<SnapResponse>()
        .await
        .map_err(|e| AppError::Gateway(format!("respons midtrans tidak valid: {e}")))
}

/// Status transaksi dari Core API. `None` jika transaksi belum pernah dibuka pembeli (404).
pub async fn get_status(http: &reqwest::Client, cfg: &Config, order_id: &str) -> AppResult<Option<TxStatus>> {
    ensure_configured(cfg)?;
    let resp = http
        .get(format!("{}/v2/{}/status", cfg.midtrans_api_base, order_id))
        .basic_auth(&cfg.midtrans_server_key, Some(""))
        .send()
        .await
        .map_err(|e| AppError::Gateway(e.to_string()))?;
    let status = resp.status();
    if status == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Gateway(format!("midtrans status HTTP {status}: {text}")));
    }
    let parsed = resp
        .json::<TxStatus>()
        .await
        .map_err(|e| AppError::Gateway(format!("respons status midtrans tidak valid: {e}")))?;
    Ok(Some(parsed))
}

/// signature_key = SHA512(order_id + status_code + gross_amount + server_key)
pub fn verify_signature(
    server_key: &str,
    order_id: &str,
    status_code: &str,
    gross_amount: &str,
    signature: &str,
) -> bool {
    if server_key.is_empty() {
        return false;
    }
    let mut hasher = Sha512::new();
    hasher.update(order_id.as_bytes());
    hasher.update(status_code.as_bytes());
    hasher.update(gross_amount.as_bytes());
    hasher.update(server_key.as_bytes());
    let expected: String = hasher.finalize().iter().map(|b| format!("{b:02x}")).collect();
    expected.as_bytes().ct_eq(signature.as_bytes()).into()
}
