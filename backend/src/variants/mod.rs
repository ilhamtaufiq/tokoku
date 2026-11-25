//! Varian produk (ukuran, kapasitas, warna, dll.) dengan harga dan stok sendiri.
//! Admin mengelola varian; katalog dan keranjang membacanya.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, put},
    Json, Router,
};
use rust_decimal::{prelude::ToPrimitive, Decimal};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySqlPool};

use crate::{
    auth::AdminUser,
    error::{AppError, AppResult},
    state::AppState,
};

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/products/{id}/variants", get(list_for_product).post(create))
        .route("/variants/{id}", put(update).delete(deactivate))
}

#[derive(Debug, Serialize, FromRow)]
pub struct VariantRow {
    pub id: u64,
    pub product_id: u64,
    pub name: String,
    pub sku: String,
    pub price: Decimal,
    pub stock: u32,
    pub is_active: bool,
    pub sort_order: i32,
}

#[derive(Debug, Serialize)]
pub struct VariantView {
    pub id: u64,
    pub product_id: u64,
    pub name: String,
    pub sku: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    pub stock: u32,
    pub is_active: bool,
    pub sort_order: i32,
}

impl From<VariantRow> for VariantView {
    fn from(r: VariantRow) -> Self {
        Self {
            id: r.id,
            product_id: r.product_id,
            name: r.name,
            sku: r.sku,
            price: r.price,
            stock: r.stock,
            is_active: r.is_active,
            sort_order: r.sort_order,
        }
    }
}

const COLS: &str = "id, product_id, name, sku, price, stock, is_active, sort_order";

/// Varian aktif sebuah produk, diurutkan sesuai sort_order.
pub async fn active_for_product(pool: &MySqlPool, product_id: u64) -> AppResult<Vec<VariantView>> {
    let rows = sqlx::query_as::<_, VariantRow>(sqlx::AssertSqlSafe(format!(
        "SELECT {COLS} FROM product_variants WHERE product_id = ? AND is_active = TRUE ORDER BY sort_order, id"
    )))
    .bind(product_id)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(VariantView::from).collect())
}

#[derive(Debug, Deserialize)]
pub struct VariantReq {
    pub name: String,
    pub sku: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    pub stock: Option<u32>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

fn validate(req: &VariantReq) -> AppResult<()> {
    if req.name.trim().is_empty() || req.name.chars().count() > 120 {
        return Err(AppError::BadRequest("nama varian wajib diisi (maks 120 karakter)".into()));
    }
    if req.sku.trim().is_empty() || req.sku.len() > 64 {
        return Err(AppError::BadRequest("SKU varian wajib diisi (maks 64 karakter)".into()));
    }
    if req.price <= Decimal::ZERO || req.price.fract() != Decimal::ZERO {
        return Err(AppError::BadRequest("harga varian harus bilangan bulat rupiah dan lebih dari 0".into()));
    }
    Ok(())
}

async fn fetch(pool: &MySqlPool, id: u64) -> AppResult<VariantView> {
    sqlx::query_as::<_, VariantRow>(sqlx::AssertSqlSafe(format!("SELECT {COLS} FROM product_variants WHERE id = ?")))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .map(VariantView::from)
        .ok_or_else(|| AppError::NotFound(format!("varian {id}")))
}

async fn list_for_product(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> AppResult<Json<Vec<VariantView>>> {
    let rows = sqlx::query_as::<_, VariantRow>(sqlx::AssertSqlSafe(format!(
        "SELECT {COLS} FROM product_variants WHERE product_id = ? ORDER BY sort_order, id"
    )))
    .bind(id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows.into_iter().map(VariantView::from).collect()))
}

fn map_unique(e: sqlx::Error) -> AppError {
    match &e {
        sqlx::Error::Database(db) if db.is_unique_violation() => AppError::BadRequest("SKU varian sudah dipakai".into()),
        _ => AppError::from(e),
    }
}

async fn create(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(product_id): Path<u64>,
    Json(req): Json<VariantReq>,
) -> AppResult<(StatusCode, Json<VariantView>)> {
    validate(&req)?;
    let exists: Option<(u64,)> = sqlx::query_as("SELECT id FROM products WHERE id = ?")
        .bind(product_id)
        .fetch_optional(&state.pool)
        .await?;
    if exists.is_none() {
        return Err(AppError::NotFound(format!("produk {product_id}")));
    }
    let done = sqlx::query(
        "INSERT INTO product_variants (product_id, name, sku, price, stock, is_active, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(product_id)
    .bind(req.name.trim())
    .bind(req.sku.trim())
    .bind(req.price)
    .bind(req.stock.unwrap_or(0))
    .bind(req.is_active.unwrap_or(true))
    .bind(req.sort_order.unwrap_or(0))
    .execute(&state.pool)
    .await
    .map_err(map_unique)?;
    Ok((StatusCode::CREATED, Json(fetch(&state.pool, done.last_insert_id()).await?)))
}

async fn update(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<VariantReq>,
) -> AppResult<Json<VariantView>> {
    fetch(&state.pool, id).await?;
    validate(&req)?;
    sqlx::query(
        "UPDATE product_variants SET name = ?, sku = ?, price = ?, stock = ?, is_active = ?, sort_order = ? WHERE id = ?",
    )
    .bind(req.name.trim())
    .bind(req.sku.trim())
    .bind(req.price)
    .bind(req.stock.unwrap_or(0))
    .bind(req.is_active.unwrap_or(true))
    .bind(req.sort_order.unwrap_or(0))
    .bind(id)
    .execute(&state.pool)
    .await
    .map_err(map_unique)?;
    Ok(Json(fetch(&state.pool, id).await?))
}

/// Hapus varian = nonaktifkan (varian bisa sudah ada di keranjang atau riwayat pesanan).
async fn deactivate(_admin: AdminUser, State(state): State<AppState>, Path(id): Path<u64>) -> AppResult<StatusCode> {
    let done = sqlx::query("UPDATE product_variants SET is_active = FALSE WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await?;
    if done.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("varian {id}")));
    }
    Ok(StatusCode::NO_CONTENT)
}

/// Stok total varian aktif (dipakai sebagai stok produk bila produk punya varian).
pub fn total_stock(stock: Option<Decimal>) -> u32 {
    stock.and_then(|d| d.to_u32()).unwrap_or(0)
}
