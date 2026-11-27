use rust_decimal::Decimal;
use sqlx::MySqlPool;

use crate::{
    error::{AppError, AppResult},
    tenant::{Scope, DEFAULT_STORE_ID},
};

pub async fn get(pool: &MySqlPool, key: &str) -> AppResult<Option<String>> {
    let row: Option<(String,)> = sqlx::query_as("SELECT setting_value FROM app_settings WHERE setting_key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    Ok(row.map(|r| r.0))
}

/// Tarif PPN yang berlaku saat ini (persen). 0 jika toko tidak PKP.
pub async fn ppn_percent(pool: &MySqlPool) -> AppResult<Decimal> {
    let pkp = get(pool, "pkp_enabled").await?.map(|v| v == "true").unwrap_or(false);
    if !pkp {
        return Ok(Decimal::ZERO);
    }
    Ok(get(pool, "ppn_rate")
        .await?
        .and_then(|v| v.parse::<Decimal>().ok())
        .unwrap_or_else(|| Decimal::from(11)))
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Default)]
pub struct StoreInfo {
    pub name: String,
    pub npwp: String,
    pub address: String,
    pub phone: String,
}

/// Data toko default (dipakai sebagai cadangan bila toko tidak ditemukan).
pub async fn read_store(pool: &MySqlPool, store_id: u64) -> AppResult<StoreInfo> {
    let row: Option<(String, String, Option<String>, String)> =
        sqlx::query_as("SELECT name, npwp, address, phone FROM stores WHERE id = ?")
            .bind(store_id)
            .fetch_optional(pool)
            .await?;
    let (name, npwp, address, phone) = row.ok_or_else(|| AppError::NotFound(format!("toko {store_id}")))?;
    Ok(StoreInfo { name, npwp, address: address.unwrap_or_default(), phone })
}

/// Data toko untuk admin/penjual: toko sesuai lingkup (admin platform: toko default).
pub async fn admin_store(
    scope: Scope,
    axum::extract::State(state): axum::extract::State<crate::state::AppState>,
) -> AppResult<axum::Json<StoreInfo>> {
    let store = scope.store_id.unwrap_or(DEFAULT_STORE_ID);
    Ok(axum::Json(read_store(&state.pool, store).await?))
}

/// Penjual mengubah data tokonya sendiri (nama, NPWP, alamat, telepon) yang tampil di invoice.
pub async fn admin_update_store(
    scope: Scope,
    axum::extract::State(state): axum::extract::State<crate::state::AppState>,
    axum::Json(req): axum::Json<StoreInfo>,
) -> AppResult<axum::Json<StoreInfo>> {
    let npwp: String = req.npwp.chars().filter(|c| c.is_ascii_digit()).collect();
    if !npwp.is_empty() && npwp.len() != 15 && npwp.len() != 16 {
        return Err(AppError::BadRequest("NPWP toko harus 15 atau 16 digit".into()));
    }
    let name = req.name.trim();
    if name.is_empty() || name.chars().count() > 120 {
        return Err(AppError::BadRequest("nama toko wajib diisi (maks 120 karakter)".into()));
    }
    let store = scope.store_id.unwrap_or(DEFAULT_STORE_ID);
    sqlx::query("UPDATE stores SET name = ?, npwp = ?, address = ?, phone = ? WHERE id = ?")
        .bind(name)
        .bind(npwp)
        .bind(req.address.trim())
        .bind(req.phone.trim())
        .bind(store)
        .execute(&state.pool)
        .await?;
    Ok(axum::Json(read_store(&state.pool, store).await?))
}

/// Data toko default untuk halaman publik (cadangan).
pub async fn store_info(
    axum::extract::State(state): axum::extract::State<crate::state::AppState>,
) -> AppResult<axum::Json<StoreInfo>> {
    Ok(axum::Json(read_store(&state.pool, DEFAULT_STORE_ID).await?))
}
