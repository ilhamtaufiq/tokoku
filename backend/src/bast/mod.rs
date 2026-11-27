//! Berita acara serah terima (BAST): pembeli mencatat jumlah barang yang diterima baik dan rusak.

use axum::{extract::{Path, State}, http::StatusCode, response::IntoResponse, Json};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    orders::fetch_owned_order,
    state::AppState,
};

#[derive(Debug, Serialize)]
pub struct BastItemView {
    pub order_item_id: u64,
    pub product_name: String,
    pub qty: u32,
    pub qty_good: u32,
    pub qty_damaged: u32,
}

#[derive(Debug, Serialize)]
pub struct BastView {
    pub id: u64,
    pub order_id: u64,
    pub received_by: String,
    pub note: String,
    pub created_at: DateTime<Utc>,
    pub items: Vec<BastItemView>,
}

#[derive(Debug, FromRow)]
struct BastRow {
    id: u64,
    order_id: u64,
    received_by: String,
    note: String,
    created_at: DateTime<Utc>,
}

async fn load(pool: &sqlx::MySqlPool, order_id: u64) -> AppResult<Option<BastView>> {
    let row: Option<BastRow> = sqlx::query_as(
        "SELECT id, order_id, received_by, note, created_at FROM order_bast WHERE order_id = ?",
    )
    .bind(order_id)
    .fetch_optional(pool)
    .await?;
    let Some(row) = row else { return Ok(None) };
    let items: Vec<BastItemView> = sqlx::query_as::<_, (u64, String, u32, u32, u32)>(
        "SELECT oi.id, oi.product_name, oi.qty, bi.qty_good, bi.qty_damaged
         FROM order_bast_items bi
         JOIN order_items oi ON oi.id = bi.order_item_id
         WHERE bi.bast_id = ? ORDER BY oi.id",
    )
    .bind(row.id)
    .fetch_all(pool)
    .await?
    .into_iter()
    .map(|(order_item_id, product_name, qty, qty_good, qty_damaged)| BastItemView {
        order_item_id,
        product_name,
        qty,
        qty_good,
        qty_damaged,
    })
    .collect();
    Ok(Some(BastView {
        id: row.id,
        order_id: row.order_id,
        received_by: row.received_by,
        note: row.note,
        created_at: row.created_at,
        items,
    }))
}

/// BAST pesanan (null jika belum dibuat). Dapat dibaca pembeli, dan admin.
pub async fn get_bast(user: AuthUser, State(state): State<AppState>, Path(id): Path<u64>) -> AppResult<Json<Option<BastView>>> {
    fetch_owned_order(&state.pool, id, &user).await?;
    Ok(Json(load(&state.pool, id).await?))
}

#[derive(Debug, Deserialize)]
pub struct BastItemReq {
    pub order_item_id: u64,
    pub qty_good: u32,
    pub qty_damaged: u32,
}

#[derive(Debug, Deserialize)]
pub struct BastReq {
    pub received_by: String,
    #[serde(default)]
    pub note: String,
    pub items: Vec<BastItemReq>,
}

/// Pembeli membuat BAST setelah pesanan dikirim. Jumlah baik + rusak harus sama dengan jumlah pesanan.
pub async fn create_bast(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<BastReq>,
) -> AppResult<impl IntoResponse> {
    let order = fetch_owned_order(&state.pool, id, &user).await?;
    if order.user_id != user.id {
        return Err(AppError::Forbidden);
    }
    if !matches!(order.status.as_str(), "shipped" | "completed") {
        return Err(AppError::BadRequest("BAST hanya bisa dibuat setelah pesanan dikirim".into()));
    }
    let received_by = req.received_by.trim().to_string();
    if received_by.chars().count() < 3 || received_by.chars().count() > 120 {
        return Err(AppError::BadRequest("nama penerima wajib diisi (3–120 karakter)".into()));
    }
    let note = req.note.trim().to_string();
    if note.chars().count() > 500 {
        return Err(AppError::BadRequest("catatan maksimal 500 karakter".into()));
    }
    if load(&state.pool, id).await?.is_some() {
        return Err(AppError::Conflict("BAST pesanan ini sudah dibuat".into()));
    }

    // Setiap baris pesanan harus dilaporkan tepat sekali dan jumlahnya cocok
    let lines: Vec<(u64, u32)> = sqlx::query_as("SELECT id, qty FROM order_items WHERE order_id = ?")
        .bind(id)
        .fetch_all(&state.pool)
        .await?;
    if req.items.len() != lines.len() {
        return Err(AppError::BadRequest("isi jumlah diterima untuk setiap barang".into()));
    }
    for (line_id, qty) in &lines {
        let reported = req.items.iter().find(|i| i.order_item_id == *line_id).ok_or_else(|| {
            AppError::BadRequest("ada barang yang belum dilaporkan".into())
        })?;
        if reported.qty_good + reported.qty_damaged != *qty {
            return Err(AppError::BadRequest(format!(
                "jumlah baik + rusak harus {qty} untuk setiap barang"
            )));
        }
    }

    let mut tx = state.pool.begin().await?;
    let done = sqlx::query("INSERT INTO order_bast (order_id, received_by, note) VALUES (?, ?, ?)")
        .bind(id)
        .bind(&received_by)
        .bind(&note)
        .execute(&mut *tx)
        .await?;
    let bast_id = done.last_insert_id();
    for item in &req.items {
        sqlx::query("INSERT INTO order_bast_items (bast_id, order_item_id, qty_good, qty_damaged) VALUES (?, ?, ?, ?)")
            .bind(bast_id)
            .bind(item.order_item_id)
            .bind(item.qty_good)
            .bind(item.qty_damaged)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(load(&state.pool, id).await?)))
}
