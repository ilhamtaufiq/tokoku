use axum::{extract::State, routing::post, Json, Router};
use rust_decimal::Decimal;
use serde::Deserialize;
use std::collections::HashMap;

use super::{Breakdown, PricingLine};
use crate::{
    error::{AppError, AppResult},
    orders::plan::{aggregate, plan, StoreGroup},
    promo, settings,
    shipping::{quote_for_store, Choice},
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
    /// Tujuan pengiriman (id RajaOngkir). Dibutuhkan jika cek ongkir aktif.
    #[serde(default)]
    pub destination_id: Option<u64>,
    /// Pilihan kurir per toko.
    #[serde(default)]
    pub shipping: Vec<Choice>,
}

/// Pratinjau rincian harga. Ongkir dihitung server; tidak menyimpan apa pun.
async fn preview(State(state): State<AppState>, Json(req): Json<PreviewReq>) -> AppResult<Json<Breakdown>> {
    if req.items.is_empty() {
        return Err(AppError::BadRequest("keranjang kosong".into()));
    }
    let ids: Vec<u64> = req.items.iter().map(|i| i.product_id).collect();
    let placeholders = vec!["?"; ids.len()].join(",");
    let sql = format!(
        "SELECT id, name, price, is_taxable, is_active, store_id, weight_grams FROM products WHERE id IN ({placeholders})"
    );
    let mut query = sqlx::query_as::<_, (u64, String, Decimal, bool, bool, u64, u32)>(sqlx::AssertSqlSafe(sql));
    for id in &ids {
        query = query.bind(id);
    }
    let mut found: HashMap<u64, (String, Decimal, bool, bool, u64, u32)> = HashMap::new();
    for (id, name, price, taxable, active, store, weight) in query.fetch_all(&state.pool).await? {
        found.insert(id, (name, price, taxable, active, store, weight));
    }

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

    let mut groups: Vec<StoreGroup> = Vec::new();
    for item in &req.items {
        let (name, price, taxable, active, store_id, weight) = found
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
        let line = PricingLine {
            product_id: item.product_id,
            name,
            unit_price: price,
            qty: item.qty,
            is_taxable: taxable,
        };
        let added_weight = weight.saturating_mul(item.qty);
        match groups.iter_mut().find(|g| g.store_id == store_id) {
            Some(group) => {
                group.lines.push(line);
                group.weight_grams = group.weight_grams.saturating_add(added_weight);
            }
            None => groups.push(StoreGroup {
                store_id,
                shipping: Decimal::ZERO,
                weight_grams: added_weight,
                lines: vec![line],
            }),
        }
    }

    // Status toko, ongkir flat, dan lokasi asal per toko
    let store_ids: Vec<u64> = groups.iter().map(|g| g.store_id).collect();
    let placeholders = vec!["?"; store_ids.len()].join(",");
    let sql = format!(
        "SELECT id, name, status, shipping_flat_fee, origin_location_id FROM stores WHERE id IN ({placeholders})"
    );
    let mut sq = sqlx::query_as::<_, (u64, String, String, Decimal, Option<u64>)>(sqlx::AssertSqlSafe(sql));
    for id in &store_ids {
        sq = sq.bind(id);
    }
    let stores: HashMap<u64, (String, String, Decimal, Option<u64>)> = sq
        .fetch_all(&state.pool)
        .await?
        .into_iter()
        .map(|(id, name, status, fee, origin)| (id, (name, status, fee, origin)))
        .collect();

    for g in groups.iter_mut() {
        let (name, status, flat, origin) = stores
            .get(&g.store_id)
            .ok_or_else(|| AppError::NotFound(format!("toko {}", g.store_id)))?;
        if status != "active" {
            return Err(AppError::BadRequest("salah satu toko di keranjang sedang tidak aktif".into()));
        }
        let choice = req.shipping.iter().find(|c| c.store_id == g.store_id);
        g.shipping = match quote_for_store(&state, name, *origin, req.destination_id, g.weight_grams, choice).await? {
            Some(quote) => quote.option.cost,
            None => *flat,
        };
    }

    let ppn = settings::ppn_percent(&state.pool).await?;
    let promos = match req.promo_code.as_deref().map(str::trim).filter(|c| !c.is_empty()) {
        Some(code) => promo::find_for_stores(&state.pool, code, &store_ids).await?,
        None => Vec::new(),
    };
    let plans = plan(&groups, &promos, ppn)?;
    let breakdown = aggregate(&plans)
        .ok_or_else(|| AppError::BadRequest("keranjang kosong".into()))?;
    Ok(Json(breakdown))
}
