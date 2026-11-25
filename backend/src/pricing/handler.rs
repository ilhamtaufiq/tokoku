use axum::{extract::State, routing::post, Json, Router};
use rust_decimal::Decimal;
use serde::Deserialize;
use std::collections::HashMap;

use super::{calculate, Breakdown, PricingLine};
use crate::{
    error::{AppError, AppResult},
    promo, settings,
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new().route("/preview", post(preview))
}

#[derive(Debug, Deserialize)]
pub struct PreviewItem {
    pub product_id: u64,
    #[serde(default)]
    pub variant_id: u64,
    pub qty: u32,
}

#[derive(Debug, Deserialize)]
pub struct PreviewReq {
    pub items: Vec<PreviewItem>,
    pub promo_code: Option<String>,
}

/// Pratinjau rincian harga. Ongkir dan PPN dihitung server; tidak menyimpan apa pun.
async fn preview(State(state): State<AppState>, Json(req): Json<PreviewReq>) -> AppResult<Json<Breakdown>> {
    if req.items.is_empty() {
        return Err(AppError::BadRequest("keranjang kosong".into()));
    }
    let ids: Vec<u64> = req.items.iter().map(|i| i.product_id).collect();
    let placeholders = vec!["?"; ids.len()].join(",");
    let sql = format!(
        "SELECT id, name, price, is_taxable, is_active FROM products WHERE id IN ({placeholders})"
    );
    let mut query = sqlx::query_as::<_, (u64, String, Decimal, bool, bool)>(sqlx::AssertSqlSafe(sql));
    for id in &ids {
        query = query.bind(id);
    }
    let found: HashMap<u64, (String, Decimal, bool, bool)> = query
        .fetch_all(&state.pool)
        .await?
        .into_iter()
        .map(|(id, name, price, taxable, active)| (id, (name, price, taxable, active)))
        .collect();

    // Varian yang dipilih (harga dan stok per varian)
    let variant_ids: Vec<u64> = req.items.iter().map(|i| i.variant_id).filter(|v| *v > 0).collect();
    let mut variants: HashMap<u64, (u64, String, Decimal, bool)> = HashMap::new();
    if !variant_ids.is_empty() {
        let placeholders = vec!["?"; variant_ids.len()].join(",");
        let sql = format!("SELECT id, product_id, name, price, is_active FROM product_variants WHERE id IN ({placeholders})");
        let mut q = sqlx::query_as::<_, (u64, u64, String, Decimal, bool)>(sqlx::AssertSqlSafe(sql));
        for id in &variant_ids {
            q = q.bind(id);
        }
        for (id, pid, name, price, active) in q.fetch_all(&state.pool).await? {
            variants.insert(id, (pid, name, price, active));
        }
    }

    let mut lines = Vec::with_capacity(req.items.len());
    for item in &req.items {
        let (name, price, taxable, active) = found
            .get(&item.product_id)
            .cloned()
            .ok_or_else(|| AppError::NotFound(format!("produk {}", item.product_id)))?;
        if !active {
            return Err(AppError::BadRequest(format!("produk {} tidak tersedia", item.product_id)));
        }
        let (name, price, active) = if item.variant_id > 0 {
            match variants.get(&item.variant_id) {
                Some((pid, vname, vprice, vactive)) if *pid == item.product_id && *vactive => {
                    (format!("{name} · {vname}"), *vprice, true)
                }
                _ => return Err(AppError::BadRequest("varian tidak tersedia".into())),
            }
        } else {
            (name, price, active)
        };
        if !active {
            return Err(AppError::BadRequest(format!("produk {} tidak tersedia", item.product_id)));
        }
        lines.push(PricingLine {
            product_id: item.product_id,
            name,
            unit_price: price,
            qty: item.qty,
            is_taxable: taxable,
        });
    }

    let ppn = settings::ppn_percent(&state.pool).await?;
    let shipping = settings::shipping_flat_fee(&state.pool).await?;
    let base = calculate(&lines, Decimal::ZERO, shipping, ppn)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let discount = match req.promo_code.as_deref().map(str::trim).filter(|c| !c.is_empty()) {
        Some(code) => {
            let p = promo::find(&state.pool, code).await?;
            promo::discount_amount(&p, base.subtotal)?
        }
        None => Decimal::ZERO,
    };

    let breakdown = calculate(&lines, discount, shipping, ppn)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    Ok(Json(breakdown))
}
