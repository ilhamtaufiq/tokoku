use rust_decimal::Decimal;
use sqlx::MySqlPool;

use crate::error::AppResult;

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
