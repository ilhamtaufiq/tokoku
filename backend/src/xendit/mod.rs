//! Client minimal untuk Xendit Invoice API (v2).
//! Dokumen ini hanya memakai endpoint create dan get invoice.

use std::str::FromStr;

use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

use crate::{
    config::Config,
    error::{AppError, AppResult},
};

#[derive(Debug, Clone)]
pub struct InvoiceItem {
    pub name: String,
    pub price: Decimal,
}

#[derive(Debug, Clone)]
pub struct CreateInvoice {
    pub external_id: String,
    pub amount: Decimal,
    pub payer_email: String,
    pub description: String,
    pub duration_secs: i64,
    pub success_url: String,
    pub failure_url: String,
    pub items: Vec<InvoiceItem>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Invoice {
    pub id: String,
    pub external_id: String,
    pub status: String,
    pub amount: Value,
    #[serde(default)]
    pub invoice_url: Option<String>,
    #[serde(default)]
    pub payment_channel: Option<String>,
}

impl Invoice {
    pub fn amount_decimal(&self) -> Option<Decimal> {
        value_to_decimal(&self.amount)
    }
}

pub fn value_to_decimal(v: &Value) -> Option<Decimal> {
    match v {
        Value::Number(n) => Decimal::from_str(&n.to_string()).ok(),
        Value::String(s) => Decimal::from_str(s).ok(),
        _ => None,
    }
}

fn ensure_configured(cfg: &Config) -> AppResult<()> {
    if cfg.xendit_secret_key.is_empty() {
        return Err(AppError::Gateway("XENDIT_SECRET_KEY belum diset".into()));
    }
    Ok(())
}

pub async fn create_invoice(http: &reqwest::Client, cfg: &Config, req: &CreateInvoice) -> AppResult<Invoice> {
    ensure_configured(cfg)?;
    let amount = req.amount.trunc().to_i64().unwrap_or(0);
    let items: Vec<Value> = req
        .items
        .iter()
        .map(|i| json!({ "name": i.name, "quantity": 1, "price": i.price.trunc().to_i64().unwrap_or(0) }))
        .collect();

    let body = json!({
        "external_id": req.external_id,
        "amount": amount,
        "payer_email": req.payer_email,
        "description": req.description,
        "invoice_duration": req.duration_secs,
        "currency": "IDR",
        "success_redirect_url": req.success_url,
        "failure_redirect_url": req.failure_url,
        "items": items,
    });

    let resp = http
        .post(format!("{}/v2/invoices", cfg.xendit_base_url))
        .basic_auth(&cfg.xendit_secret_key, Some(""))
        .json(&body)
        .send()
        .await
        .map_err(|e| AppError::Gateway(e.to_string()))?;
    parse(resp).await
}

pub async fn get_invoice(http: &reqwest::Client, cfg: &Config, id: &str) -> AppResult<Invoice> {
    ensure_configured(cfg)?;
    let resp = http
        .get(format!("{}/v2/invoices/{}", cfg.xendit_base_url, id))
        .basic_auth(&cfg.xendit_secret_key, Some(""))
        .send()
        .await
        .map_err(|e| AppError::Gateway(e.to_string()))?;
    parse(resp).await
}

async fn parse(resp: reqwest::Response) -> AppResult<Invoice> {
    let status = resp.status();
    if !status.is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Gateway(format!("xendit HTTP {status}: {text}")));
    }
    resp.json::<Invoice>()
        .await
        .map_err(|e| AppError::Gateway(format!("respons xendit tidak valid: {e}")))
}
