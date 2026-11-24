use rust_decimal::Decimal;
use sqlx::MySqlPool;

use crate::error::{AppError, AppResult};

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

/// Ongkir flat (tidak kena PPN). Dihitung server, tidak dipercaya dari client.
pub async fn shipping_flat_fee(pool: &MySqlPool) -> AppResult<Decimal> {
    Ok(get(pool, "shipping_flat_fee")
        .await?
        .and_then(|v| v.parse::<Decimal>().ok())
        .unwrap_or(Decimal::ZERO))
}

pub async fn invoice_prefix(pool: &MySqlPool) -> AppResult<String> {
    Ok(get(pool, "invoice_prefix").await?.unwrap_or_else(|| "INV".into()))
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Default)]
pub struct StoreInfo {
    pub name: String,
    pub npwp: String,
    pub address: String,
    pub phone: String,
}

/// Data toko untuk invoice. Publik karena dipakai di halaman invoice pembeli.
pub async fn store_info(
    axum::extract::State(state): axum::extract::State<crate::state::AppState>,
) -> AppResult<axum::Json<StoreInfo>> {
    Ok(axum::Json(read_store(&state.pool).await?))
}

pub async fn read_store(pool: &MySqlPool) -> AppResult<StoreInfo> {
    Ok(StoreInfo {
        name: get(pool, "store_name").await?.unwrap_or_default(),
        npwp: get(pool, "store_npwp").await?.unwrap_or_default(),
        address: get(pool, "store_address").await?.unwrap_or_default(),
        phone: get(pool, "store_phone").await?.unwrap_or_default(),
    })
}

/// Admin: ubah data toko (nama, NPWP, alamat, telepon) yang tampil di invoice.
pub async fn admin_update_store(
    _admin: crate::auth::AdminUser,
    axum::extract::State(state): axum::extract::State<crate::state::AppState>,
    axum::Json(req): axum::Json<StoreInfo>,
) -> AppResult<axum::Json<StoreInfo>> {
    let npwp: String = req.npwp.chars().filter(|c| c.is_ascii_digit()).collect();
    if !npwp.is_empty() && npwp.len() != 15 && npwp.len() != 16 {
        return Err(AppError::BadRequest("NPWP toko harus 15 atau 16 digit".into()));
    }
    let pairs = [
        ("store_name", req.name.trim().to_string()),
        ("store_npwp", npwp),
        ("store_address", req.address.trim().to_string()),
        ("store_phone", req.phone.trim().to_string()),
    ];
    for (key, value) in pairs {
        sqlx::query(
            "INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
        )
        .bind(key)
        .bind(value)
        .execute(&state.pool)
        .await?;
    }
    Ok(axum::Json(read_store(&state.pool).await?))
}
