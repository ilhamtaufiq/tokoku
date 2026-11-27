//! Multi-toko: lingkup data per toko.
//!
//! - Admin platform (`role = admin`): melihat semua toko (`store_id = None`).
//! - Penjual (`role = seller`): hanya toko miliknya yang sudah aktif.
//!
//! Data baru dibuat di toko default (id 1) jika dibuat oleh admin platform
//! tanpa toko tertentu.

use axum::extract::FromRequestParts;
use axum::http::request::Parts;
use sqlx::MySqlPool;

use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    state::AppState,
};

pub const DEFAULT_STORE_ID: u64 = 1;

#[derive(Debug, Clone, Copy)]
pub struct Scope {
    /// None = semua toko (admin platform).
    pub store_id: Option<u64>,
    pub user_id: u64,
}

impl Scope {
    /// Toko tempat data baru dibuat.
    pub fn create_store_id(&self) -> u64 {
        self.store_id.unwrap_or(DEFAULT_STORE_ID)
    }
}

impl FromRequestParts<AppState> for Scope {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        match user.role.as_str() {
            "admin" => Ok(Scope { store_id: None, user_id: user.id }),
            "seller" => {
                let store = active_store_of(&state.pool, user.id)
                    .await?
                    .ok_or_else(|| AppError::BadRequest("toko kamu belum disetujui admin".into()))?;
                Ok(Scope { store_id: Some(store), user_id: user.id })
            }
            _ => Err(AppError::Forbidden),
        }
    }
}

/// Toko aktif milik pengguna (penjual).
pub async fn active_store_of(pool: &MySqlPool, user_id: u64) -> AppResult<Option<u64>> {
    let row: Option<(u64,)> = sqlx::query_as(
        "SELECT id FROM stores WHERE owner_user_id = ? AND status = 'active' ORDER BY id LIMIT 1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.0))
}


/// Pastikan produk ada dan berada di lingkup yang boleh diakses. Mengembalikan toko produk.
pub async fn ensure_product_in_scope(pool: &MySqlPool, product_id: u64, scope: Scope) -> AppResult<u64> {
    let row: Option<(u64,)> = sqlx::query_as("SELECT store_id FROM products WHERE id = ?")
        .bind(product_id)
        .fetch_optional(pool)
        .await?;
    let (store,) = row.ok_or_else(|| AppError::NotFound(format!("produk {product_id}")))?;
    match scope.store_id {
        Some(allowed) if allowed != store => Err(AppError::NotFound(format!("produk {product_id}"))),
        _ => Ok(store),
    }
}

/// Pastikan varian ada dan produk induknya berada di lingkup yang boleh diakses.
pub async fn ensure_variant_in_scope(pool: &MySqlPool, variant_id: u64, scope: Scope) -> AppResult<u64> {
    let row: Option<(u64,)> = sqlx::query_as("SELECT product_id FROM product_variants WHERE id = ?")
        .bind(variant_id)
        .fetch_optional(pool)
        .await?;
    let (product_id,) = row.ok_or_else(|| AppError::NotFound(format!("varian {variant_id}")))?;
    ensure_product_in_scope(pool, product_id, scope).await?;
    Ok(product_id)
}
