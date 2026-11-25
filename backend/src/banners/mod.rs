//! Banner promo: publik membaca banner aktif, admin mengelola semuanya.

use axum::{
    extract::{DefaultBodyLimit, Multipart, Path, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySqlPool};

use crate::{
    auth::AdminUser,
    catalog::{detect_image_ext, random_hex, MAX_IMAGE_BYTES},
    error::{AppError, AppResult},
    state::AppState,
};

pub fn public_router() -> Router<AppState> {
    Router::new().route("/banners", get(list_active))
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/banners", get(list_all).post(create))
        .route("/banners/{id}", put(update).delete(remove))
        .route("/banners/{id}/image", post(upload_image).layer(DefaultBodyLimit::max(3 * 1024 * 1024)))
}

#[derive(Debug, Serialize, FromRow)]
pub struct Banner {
    pub id: u64,
    pub title: String,
    pub subtitle: Option<String>,
    pub cta_label: Option<String>,
    pub cta_url: Option<String>,
    pub image_url: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
}

#[derive(Debug, Deserialize)]
pub struct BannerReq {
    pub title: String,
    pub subtitle: Option<String>,
    pub cta_label: Option<String>,
    pub cta_url: Option<String>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

const SELECT: &str = "SELECT id, title, subtitle, cta_label, cta_url, image_url, is_active, sort_order FROM banners";

fn clean(value: Option<String>) -> Option<String> {
    value.map(|v| v.trim().to_string()).filter(|v| !v.is_empty())
}

fn validate(req: &BannerReq) -> AppResult<(String, Option<String>, Option<String>, Option<String>)> {
    let title = req.title.trim().to_string();
    if title.is_empty() || title.chars().count() > 120 {
        return Err(AppError::BadRequest("judul banner wajib diisi (maks 120 karakter)".into()));
    }
    let subtitle = clean(req.subtitle.clone());
    if subtitle.as_deref().is_some_and(|s| s.chars().count() > 255) {
        return Err(AppError::BadRequest("subjudul maksimal 255 karakter".into()));
    }
    let cta_label = clean(req.cta_label.clone());
    if cta_label.as_deref().is_some_and(|s| s.chars().count() > 60) {
        return Err(AppError::BadRequest("teks tombol maksimal 60 karakter".into()));
    }
    // Hanya tautan internal (/...) atau https. Mencegah javascript: dan skema berbahaya lain.
    let cta_url = clean(req.cta_url.clone());
    if let Some(url) = &cta_url {
        let ok = (url.starts_with('/') && !url.starts_with("//")) || url.starts_with("https://");
        if !ok || url.len() > 255 {
            return Err(AppError::BadRequest("tautan harus diawali / (halaman toko) atau https://".into()));
        }
    }
    Ok((title, subtitle, cta_label, cta_url))
}

async fn fetch(pool: &MySqlPool, id: u64) -> AppResult<Banner> {
    sqlx::query_as::<_, Banner>(sqlx::AssertSqlSafe(format!("{SELECT} WHERE id = ?")))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("banner {id}")))
}

async fn list_active(State(state): State<AppState>) -> AppResult<Json<Vec<Banner>>> {
    let rows = sqlx::query_as::<_, Banner>(sqlx::AssertSqlSafe(format!("{SELECT} WHERE is_active = TRUE ORDER BY sort_order, id")))
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(rows))
}

async fn list_all(_admin: AdminUser, State(state): State<AppState>) -> AppResult<Json<Vec<Banner>>> {
    let rows = sqlx::query_as::<_, Banner>(sqlx::AssertSqlSafe(format!("{SELECT} ORDER BY sort_order, id")))
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(rows))
}

async fn create(
    _admin: AdminUser,
    State(state): State<AppState>,
    Json(req): Json<BannerReq>,
) -> AppResult<(StatusCode, Json<Banner>)> {
    let (title, subtitle, cta_label, cta_url) = validate(&req)?;
    let done = sqlx::query(
        "INSERT INTO banners (title, subtitle, cta_label, cta_url, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(title)
    .bind(subtitle)
    .bind(cta_label)
    .bind(cta_url)
    .bind(req.is_active.unwrap_or(true))
    .bind(req.sort_order.unwrap_or(0))
    .execute(&state.pool)
    .await?;
    Ok((StatusCode::CREATED, Json(fetch(&state.pool, done.last_insert_id()).await?)))
}

async fn update(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<BannerReq>,
) -> AppResult<Json<Banner>> {
    fetch(&state.pool, id).await?;
    let (title, subtitle, cta_label, cta_url) = validate(&req)?;
    sqlx::query(
        "UPDATE banners SET title = ?, subtitle = ?, cta_label = ?, cta_url = ?, is_active = ?, sort_order = ? WHERE id = ?",
    )
    .bind(title)
    .bind(subtitle)
    .bind(cta_label)
    .bind(cta_url)
    .bind(req.is_active.unwrap_or(true))
    .bind(req.sort_order.unwrap_or(0))
    .bind(id)
    .execute(&state.pool)
    .await?;
    Ok(Json(fetch(&state.pool, id).await?))
}

async fn remove(_admin: AdminUser, State(state): State<AppState>, Path(id): Path<u64>) -> AppResult<StatusCode> {
    let done = sqlx::query("DELETE FROM banners WHERE id = ?").bind(id).execute(&state.pool).await?;
    if done.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("banner {id}")));
    }
    Ok(StatusCode::NO_CONTENT)
}

/// Unggah gambar banner (JPEG/PNG/WebP, maks 2 MB), format dicek dari isi file.
async fn upload_image(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    mut multipart: Multipart,
) -> AppResult<Json<Banner>> {
    fetch(&state.pool, id).await?;
    let field = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
        .ok_or_else(|| AppError::BadRequest("file wajib dikirim".into()))?;
    let data = field.bytes().await.map_err(|e| AppError::BadRequest(e.to_string()))?;
    if data.len() > MAX_IMAGE_BYTES {
        return Err(AppError::BadRequest("ukuran gambar maksimal 2 MB".into()));
    }
    let ext = detect_image_ext(&data)
        .ok_or_else(|| AppError::BadRequest("format gambar harus JPEG, PNG, atau WebP".into()))?;

    let file_name = format!("banner-{}.{ext}", random_hex(16));
    tokio::fs::create_dir_all(&state.cfg.upload_dir)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    tokio::fs::write(std::path::Path::new(&state.cfg.upload_dir).join(&file_name), &data)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    sqlx::query("UPDATE banners SET image_url = ? WHERE id = ?")
        .bind(format!("/uploads/{file_name}"))
        .bind(id)
        .execute(&state.pool)
        .await?;
    Ok(Json(fetch(&state.pool, id).await?))
}
