use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get, put},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_cart).delete(clear_cart))
        .route("/items", put(upsert_item))
        .route("/items/{product_id}/{variant_id}", delete(remove_item))
        .route("/items/{product_id}/{variant_id}/select", put(set_selected))
        .route("/select-all", put(set_all_selected))
}

/// Nama tampilan, harga, dan stok diambil dari varian bila ada (variant_id > 0), selain itu dari produk.
const CART_SELECT: &str = "SELECT c.product_id, c.variant_id,
    CONCAT(p.name, IF(c.variant_id > 0, CONCAT(' · ', v.name), '')) AS name,
    COALESCE(v.price, p.price) AS price,
    p.is_taxable,
    p.is_active AS product_active,
    v.is_active AS variant_active,
    COALESCE(v.stock, p.stock) AS stock,
    p.image_url,
    c.selected,
    c.qty,
    p.store_id,
    st.name AS store_name,
    st.slug AS store_slug
    FROM cart_items c
    JOIN products p ON p.id = c.product_id
    JOIN stores st ON st.id = p.store_id
    LEFT JOIN product_variants v ON v.id = c.variant_id AND c.variant_id > 0";

#[derive(Debug, Serialize, FromRow)]
pub struct CartItemRow {
    pub product_id: u64,
    pub variant_id: u64,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    pub is_taxable: bool,
    pub product_active: bool,
    pub variant_active: Option<bool>,
    pub stock: u32,
    pub image_url: Option<String>,
    pub selected: bool,
    pub qty: u32,
    pub store_id: u64,
    pub store_name: String,
    pub store_slug: String,
}

#[derive(Debug, Serialize)]
pub struct CartItemView {
    pub product_id: u64,
    pub variant_id: u64,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    pub is_taxable: bool,
    pub is_active: bool,
    pub stock: u32,
    pub qty: u32,
    pub image_url: Option<String>,
    pub selected: bool,
    pub store_id: u64,
    pub store_name: String,
    pub store_slug: String,
}

impl From<CartItemRow> for CartItemView {
    fn from(r: CartItemRow) -> Self {
        Self {
            product_id: r.product_id,
            variant_id: r.variant_id,
            name: r.name,
            price: r.price,
            is_taxable: r.is_taxable,
            is_active: r.product_active && r.variant_active.unwrap_or(true),
            stock: r.stock,
            qty: r.qty,
            image_url: r.image_url,
            selected: r.selected,
            store_id: r.store_id,
            store_name: r.store_name,
            store_slug: r.store_slug,
        }
    }
}

async fn get_cart(user: AuthUser, State(state): State<AppState>) -> AppResult<Json<Vec<CartItemView>>> {
    let rows = sqlx::query_as::<_, CartItemRow>(sqlx::AssertSqlSafe(format!(
        "{CART_SELECT} WHERE c.user_id = ? ORDER BY c.updated_at"
    )))
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows.into_iter().map(CartItemView::from).collect()))
}

#[derive(Debug, Deserialize)]
pub struct UpsertReq {
    pub product_id: u64,
    /// 0 atau tidak diisi = produk tanpa varian
    #[serde(default)]
    pub variant_id: u64,
    /// qty 0 = hapus dari keranjang
    pub qty: u32,
}

pub const MAX_QTY_PER_ITEM: u32 = 99;

async fn upsert_item(user: AuthUser, State(state): State<AppState>, Json(req): Json<UpsertReq>) -> AppResult<StatusCode> {
    if req.qty > MAX_QTY_PER_ITEM {
        return Err(AppError::BadRequest(format!("qty maksimal {MAX_QTY_PER_ITEM} per produk")));
    }
    if req.qty == 0 {
        return delete_line(&state, user.id, req.product_id, req.variant_id).await;
    }

    let product: Option<(bool, i64)> = sqlx::query_as("SELECT is_active, (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = products.id AND v.is_active = TRUE) FROM products WHERE id = ?")
        .bind(req.product_id)
        .fetch_optional(&state.pool)
        .await?;
    let Some((product_active, variant_count)) = product else {
        return Err(AppError::NotFound(format!("produk {}", req.product_id)));
    };
    if !product_active {
        return Err(AppError::BadRequest("produk tidak tersedia".into()));
    }

    if req.variant_id == 0 {
        if variant_count > 0 {
            return Err(AppError::BadRequest("pilih varian produk terlebih dahulu".into()));
        }
    } else {
        let variant: Option<(u64, bool)> =
            sqlx::query_as("SELECT product_id, is_active FROM product_variants WHERE id = ?")
                .bind(req.variant_id)
                .fetch_optional(&state.pool)
                .await?;
        match variant {
            Some((pid, true)) if pid == req.product_id => {}
            Some((pid, _)) if pid == req.product_id => {
                return Err(AppError::BadRequest("varian ini tidak tersedia".into()));
            }
            _ => return Err(AppError::BadRequest("varian tidak sesuai dengan produk".into())),
        }
    }

    sqlx::query(
        "INSERT INTO cart_items (user_id, product_id, variant_id, qty) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE qty = VALUES(qty)",
    )
    .bind(user.id)
    .bind(req.product_id)
    .bind(req.variant_id)
    .bind(req.qty)
    .execute(&state.pool)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn remove_item(
    user: AuthUser,
    State(state): State<AppState>,
    Path((product_id, variant_id)): Path<(u64, u64)>,
) -> AppResult<StatusCode> {
    delete_line(&state, user.id, product_id, variant_id).await
}

async fn delete_line(state: &AppState, user_id: u64, product_id: u64, variant_id: u64) -> AppResult<StatusCode> {
    sqlx::query("DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?")
        .bind(user_id)
        .bind(product_id)
        .bind(variant_id)
        .execute(&state.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn clear_cart(user: AuthUser, State(state): State<AppState>) -> AppResult<StatusCode> {
    sqlx::query("DELETE FROM cart_items WHERE user_id = ?")
        .bind(user.id)
        .execute(&state.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct SelectReq {
    pub selected: bool,
}

async fn set_selected(
    user: AuthUser,
    State(state): State<AppState>,
    Path((product_id, variant_id)): Path<(u64, u64)>,
    Json(req): Json<SelectReq>,
) -> AppResult<StatusCode> {
    sqlx::query("UPDATE cart_items SET selected = ? WHERE user_id = ? AND product_id = ? AND variant_id = ?")
        .bind(req.selected)
        .bind(user.id)
        .bind(product_id)
        .bind(variant_id)
        .execute(&state.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn set_all_selected(user: AuthUser, State(state): State<AppState>, Json(req): Json<SelectReq>) -> AppResult<StatusCode> {
    sqlx::query("UPDATE cart_items SET selected = ? WHERE user_id = ?")
        .bind(req.selected)
        .bind(user.id)
        .execute(&state.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}
