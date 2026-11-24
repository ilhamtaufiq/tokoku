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
        .route("/items/{product_id}", delete(remove_item))
}

#[derive(Debug, Serialize, FromRow)]
pub struct CartItemView {
    pub product_id: u64,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    pub is_taxable: bool,
    pub is_active: bool,
    pub stock: u32,
    pub qty: u32,
}

async fn get_cart(user: AuthUser, State(state): State<AppState>) -> AppResult<Json<Vec<CartItemView>>> {
    let items = sqlx::query_as::<_, CartItemView>(
        "SELECT c.product_id, p.name, p.price, p.is_taxable, p.is_active, p.stock, c.qty
         FROM cart_items c JOIN products p ON p.id = c.product_id
         WHERE c.user_id = ? ORDER BY c.updated_at",
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(items))
}

#[derive(Debug, Deserialize)]
pub struct UpsertReq {
    pub product_id: u64,
    /// qty 0 = hapus dari keranjang
    pub qty: u32,
}

pub const MAX_QTY_PER_ITEM: u32 = 99;

async fn upsert_item(
    user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<UpsertReq>,
) -> AppResult<StatusCode> {
    if req.qty > MAX_QTY_PER_ITEM {
        return Err(AppError::BadRequest(format!("qty maksimal {MAX_QTY_PER_ITEM} per produk")));
    }
    if req.qty == 0 {
        return remove_item_inner(&state, user.id, req.product_id).await;
    }

    let active: Option<(bool,)> = sqlx::query_as("SELECT is_active FROM products WHERE id = ?")
        .bind(req.product_id)
        .fetch_optional(&state.pool)
        .await?;
    match active {
        None => return Err(AppError::NotFound(format!("produk {}", req.product_id))),
        Some((false,)) => return Err(AppError::BadRequest("produk tidak tersedia".into())),
        Some(_) => {}
    }

    sqlx::query(
        "INSERT INTO cart_items (user_id, product_id, qty) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE qty = VALUES(qty)",
    )
    .bind(user.id)
    .bind(req.product_id)
    .bind(req.qty)
    .execute(&state.pool)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn remove_item(
    user: AuthUser,
    State(state): State<AppState>,
    Path(product_id): Path<u64>,
) -> AppResult<StatusCode> {
    remove_item_inner(&state, user.id, product_id).await
}

async fn remove_item_inner(state: &AppState, user_id: u64, product_id: u64) -> AppResult<StatusCode> {
    sqlx::query("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?")
        .bind(user_id)
        .bind(product_id)
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
