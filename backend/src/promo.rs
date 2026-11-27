use axum::{extract::State, http::StatusCode, response::IntoResponse, routing::post, Json, Router};
use chrono::NaiveDateTime;
use rust_decimal::{Decimal, RoundingStrategy};
use rust_decimal_macros::dec;
use serde::Deserialize;
use sqlx::{AssertSqlSafe, FromRow, MySql, MySqlPool, Transaction};

use crate::{
    error::{AppError, AppResult},
    state::AppState,
    tenant::Scope,
};

pub fn admin_router() -> Router<AppState> {
    Router::new().route("/promos", post(create_promo))
}

#[derive(Debug, Clone, FromRow)]
pub struct PromoRow {
    pub id: u64,
    pub code: String,
    pub discount_type: String,
    pub discount_value: Decimal,
    pub min_subtotal: Decimal,
    pub usage_limit: Option<u32>,
    pub used_count: u32,
    pub store_id: u64,
}

/// Promo aktif dengan kode tertentu di toko-toko yang diberikan. Kode yang sama bisa ada di beberapa toko.
fn promo_select(store_count: usize) -> String {
    let placeholders = vec!["?"; store_count].join(",");
    format!(
        "SELECT id, code, CAST(discount_type AS CHAR) AS discount_type, discount_value,
         min_subtotal, usage_limit, used_count, store_id FROM promo_codes
         WHERE code = ? AND store_id IN ({placeholders})
           AND (valid_from IS NULL OR valid_from <= UTC_TIMESTAMP())
           AND (valid_until IS NULL OR valid_until >= UTC_TIMESTAMP())"
    )
}

fn normalize(code: &str) -> String {
    code.trim().to_uppercase()
}

const NO_PROMO_FOR_CART: &str = "kode promo tidak berlaku untuk toko di keranjang";

/// Baca promo tanpa mengunci (untuk pratinjau). Minimal satu toko harus punya promo dengan kode ini.
pub async fn find_for_stores(pool: &MySqlPool, code: &str, store_ids: &[u64]) -> AppResult<Vec<PromoRow>> {
    let mut query = sqlx::query_as::<_, PromoRow>(AssertSqlSafe(promo_select(store_ids.len())))
        .bind(normalize(code));
    for id in store_ids {
        query = query.bind(id);
    }
    let rows = query.fetch_all(pool).await?;
    if rows.is_empty() {
        return Err(AppError::BadRequest(NO_PROMO_FOR_CART.into()));
    }
    Ok(rows)
}

/// Kunci baris promo di dalam transaksi checkout.
pub async fn lock_for_stores(
    tx: &mut Transaction<'_, MySql>,
    code: &str,
    store_ids: &[u64],
) -> AppResult<Vec<PromoRow>> {
    let sql = format!("{} FOR UPDATE", promo_select(store_ids.len()));
    let mut query = sqlx::query_as::<_, PromoRow>(AssertSqlSafe(sql)).bind(normalize(code));
    for id in store_ids {
        query = query.bind(id);
    }
    let rows = query.fetch_all(&mut **tx).await?;
    if rows.is_empty() {
        return Err(AppError::BadRequest(NO_PROMO_FOR_CART.into()));
    }
    Ok(rows)
}

/// Nilai diskon (rupiah, termasuk PPN) untuk subtotal tertentu.
pub fn discount_amount(promo: &PromoRow, subtotal: Decimal) -> AppResult<Decimal> {
    if subtotal < promo.min_subtotal {
        return Err(AppError::BadRequest(format!(
            "minimum belanja untuk promo {} adalah {}",
            promo.code,
            promo.min_subtotal.round_dp(0)
        )));
    }
    if let Some(limit) = promo.usage_limit {
        if promo.used_count >= limit {
            return Err(AppError::BadRequest("kuota promo sudah habis".into()));
        }
    }
    let raw = match promo.discount_type.as_str() {
        "percent" => (subtotal * promo.discount_value / dec!(100))
            .round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero),
        "fixed" => promo.discount_value,
        other => return Err(AppError::Internal(format!("tipe promo tidak dikenal: {other}"))),
    };
    Ok(raw.min(subtotal).max(Decimal::ZERO))
}

#[derive(Debug, Deserialize)]
pub struct PromoReq {
    pub code: String,
    pub discount_type: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub discount_value: Decimal,
    #[serde(default, with = "rust_decimal::serde::str")]
    pub min_subtotal: Decimal,
    pub valid_from: Option<NaiveDateTime>,
    pub valid_until: Option<NaiveDateTime>,
    pub usage_limit: Option<u32>,
}

async fn create_promo(
    scope: Scope,
    State(state): State<AppState>,
    Json(req): Json<PromoReq>,
) -> AppResult<impl IntoResponse> {
    let code = normalize(&req.code);
    if code.is_empty() || code.len() > 40 {
        return Err(AppError::BadRequest("kode promo wajib diisi (maks 40 karakter)".into()));
    }
    match req.discount_type.as_str() {
        "percent" if req.discount_value > dec!(0) && req.discount_value <= dec!(100) => {}
        "fixed" if req.discount_value > dec!(0) => {}
        _ => return Err(AppError::BadRequest("tipe atau nilai diskon tidak valid".into())),
    }
    if req.discount_value.fract() != Decimal::ZERO && req.discount_type == "fixed" {
        return Err(AppError::BadRequest("diskon nominal harus bilangan bulat rupiah".into()));
    }
    let done = sqlx::query(
        "INSERT INTO promo_codes (store_id, code, discount_type, discount_value, min_subtotal, valid_from, valid_until, usage_limit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(scope.create_store_id())
    .bind(&code)
    .bind(&req.discount_type)
    .bind(req.discount_value)
    .bind(req.min_subtotal)
    .bind(req.valid_from)
    .bind(req.valid_until)
    .bind(req.usage_limit)
    .execute(&state.pool)
    .await
    .map_err(|e| match &e {
        sqlx::Error::Database(db) if db.is_unique_violation() => {
            AppError::BadRequest("kode promo sudah dipakai di toko ini".into())
        }
        _ => e.into(),
    })?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({ "id": done.last_insert_id(), "code": code }))))
}
