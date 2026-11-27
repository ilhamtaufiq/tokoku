//! Toko (tenant): pendaftaran penjual, persetujuan admin platform, dan daftar toko publik.

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, patch, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySqlPool};

use crate::{
    audit,
    auth::{AdminUser, AuthUser},
    error::{AppError, AppResult},
    state::AppState,
};

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/stores", get(list_active))
        .route("/stores/{slug}", get(get_active))
}

pub fn seller_router() -> Router<AppState> {
    Router::new()
        .route("/apply", post(apply))
        .route("/store", get(my_store))
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/stores", get(admin_list))
        .route("/stores/{id}", patch(admin_set_status))
}

#[derive(Debug, Serialize, FromRow)]
pub struct PublicStore {
    pub slug: String,
    pub name: String,
}

async fn list_active(State(state): State<AppState>) -> AppResult<Json<Vec<PublicStore>>> {
    let rows = sqlx::query_as::<_, PublicStore>(
        "SELECT slug, name FROM stores WHERE status = 'active' ORDER BY name",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}

async fn get_active(State(state): State<AppState>, Path(slug): Path<String>) -> AppResult<Json<PublicStore>> {
    let row = sqlx::query_as::<_, PublicStore>(
        "SELECT slug, name FROM stores WHERE slug = ? AND status = 'active'",
    )
    .bind(slug)
    .fetch_optional(&state.pool)
    .await?;
    row.map(Json).ok_or_else(|| AppError::NotFound("toko".into()))
}

#[derive(Debug, Deserialize)]
pub struct ApplyReq {
    pub store_name: String,
    #[serde(default)]
    pub npwp: String,
    #[serde(default)]
    pub address: String,
    #[serde(default)]
    pub phone: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct StoreView {
    pub id: u64,
    pub slug: String,
    pub name: String,
    pub npwp: String,
    pub address: Option<String>,
    pub phone: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

/// Pengajuan toko baru. Toko berstatus pending sampai disetujui admin platform.
async fn apply(
    user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<ApplyReq>,
) -> AppResult<impl IntoResponse> {
    let name = req.store_name.trim().to_string();
    if name.chars().count() < 3 || name.chars().count() > 120 {
        return Err(AppError::BadRequest("nama toko wajib diisi (3–120 karakter)".into()));
    }
    let npwp: String = req.npwp.chars().filter(|c| c.is_ascii_digit()).collect();
    if !npwp.is_empty() && npwp.len() != 15 && npwp.len() != 16 {
        return Err(AppError::BadRequest("NPWP toko harus 15 atau 16 digit".into()));
    }
    let existing: Option<(u64,)> = sqlx::query_as("SELECT id FROM stores WHERE owner_user_id = ?")
        .bind(user.id)
        .fetch_optional(&state.pool)
        .await?;
    if existing.is_some() {
        return Err(AppError::Conflict("akunmu sudah punya toko".into()));
    }

    let slug = format!("{}-{}", slugify(&name), random_suffix());
    let prefix = format!("T{}", random_hex(8).to_uppercase());
    let done = sqlx::query(
        "INSERT INTO stores (owner_user_id, slug, name, npwp, address, phone, invoice_prefix, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')",
    )
    .bind(user.id)
    .bind(&slug)
    .bind(&name)
    .bind(&npwp)
    .bind(req.address.trim())
    .bind(req.phone.trim())
    .bind(&prefix)
    .execute(&state.pool)
    .await?;
    let view = fetch_store(&state.pool, done.last_insert_id()).await?;
    Ok((StatusCode::CREATED, Json(view)))
}

/// Status toko milik penjual/pengaju.
async fn my_store(user: AuthUser, State(state): State<AppState>) -> AppResult<Json<StoreView>> {
    let row = sqlx::query_as::<_, StoreView>(
        "SELECT id, slug, name, npwp, address, phone, CAST(status AS CHAR) AS status, created_at
         FROM stores WHERE owner_user_id = ? ORDER BY id LIMIT 1",
    )
    .bind(user.id)
    .fetch_optional(&state.pool)
    .await?;
    row.map(Json).ok_or_else(|| AppError::NotFound("kamu belum punya toko".into()))
}

async fn fetch_store(pool: &MySqlPool, id: u64) -> AppResult<StoreView> {
    sqlx::query_as::<_, StoreView>(
        "SELECT id, slug, name, npwp, address, phone, CAST(status AS CHAR) AS status, created_at
         FROM stores WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("toko {id}")))
}

#[derive(Debug, Deserialize)]
pub struct AdminStoreQuery {
    pub status: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct AdminStoreView {
    pub id: u64,
    pub slug: String,
    pub name: String,
    pub npwp: String,
    pub phone: String,
    pub status: String,
    pub owner_email: Option<String>,
    pub created_at: DateTime<Utc>,
}

async fn admin_list(
    _admin: AdminUser,
    State(state): State<AppState>,
    Query(q): Query<AdminStoreQuery>,
) -> AppResult<Json<Vec<AdminStoreView>>> {
    let status = q.status.unwrap_or_default();
    let rows = sqlx::query_as::<_, AdminStoreView>(
        "SELECT s.id, s.slug, s.name, s.npwp, s.phone, CAST(s.status AS CHAR) AS status,
                u.email AS owner_email, s.created_at
         FROM stores s LEFT JOIN users u ON u.id = s.owner_user_id
         WHERE (? = '' OR CAST(s.status AS CHAR) = ?)
         ORDER BY s.id DESC LIMIT 200",
    )
    .bind(&status)
    .bind(&status)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize)]
pub struct StatusReq {
    /// active | suspended
    pub status: String,
}

/// Admin platform menyetujui atau menangguhkan toko. Persetujuan menjadikan pemilik penjual.
async fn admin_set_status(
    admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<StatusReq>,
) -> AppResult<Json<StoreView>> {
    if req.status != "active" && req.status != "suspended" {
        return Err(AppError::BadRequest("status harus 'active' atau 'suspended'".into()));
    }
    fetch_store(&state.pool, id).await?;
    let owner: (Option<u64>,) = sqlx::query_as("SELECT owner_user_id FROM stores WHERE id = ?")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    let mut tx = state.pool.begin().await?;
    sqlx::query("UPDATE stores SET status = ? WHERE id = ?")
        .bind(&req.status)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    if req.status == "active" {
        if let Some(owner_id) = owner.0 {
            sqlx::query("UPDATE users SET role = 'seller' WHERE id = ? AND role = 'customer'")
                .bind(owner_id)
                .execute(&mut *tx)
                .await?;
        }
    }
    tx.commit().await?;
    audit::record(&state.pool, Some(admin.id), "store.status", "store", Some(id), &req.status).await;
    Ok(Json(fetch_store(&state.pool, id).await?))
}

fn slugify(name: &str) -> String {
    let mut out = String::new();
    for c in name.to_lowercase().chars() {
        if c.is_ascii_alphanumeric() {
            out.push(c);
        } else if !out.ends_with('-') && !out.is_empty() {
            out.push('-');
        }
    }
    let trimmed = out.trim_matches('-');
    let base: String = trimmed.chars().take(60).collect();
    if base.is_empty() { "toko".into() } else { base }
}

fn random_hex(len: usize) -> String {
    use rand_core::{OsRng, RngCore};
    let mut bytes = vec![0u8; len];
    OsRng.fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:x}", b % 16)).collect()
}

fn random_suffix() -> String {
    random_hex(4)
}
