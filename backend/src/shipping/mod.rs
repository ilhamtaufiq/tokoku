//! Cek ongkir lewat RajaOngkir (Komerce, API v2).
//!
//! Aktif hanya jika RAJAONGKIR_API_KEY diset. Tanpa kunci, toko memakai ongkir flat (stores.shipping_flat_fee).
//! Ongkir selalu dihitung ulang di server saat preview dan checkout; nilai dari klien tidak dipercaya.

use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    state::AppState,
};

const UPSTREAM_DOWN: &str = "layanan ongkir sedang tidak tersedia. Coba lagi sebentar.";
const QUOTA_FULL: &str = "layanan ongkir sedang penuh. Coba lagi besok atau pilih ongkir lain.";

/// Kurir yang ditanyakan saat menampilkan pilihan ongkir.
pub const COURIERS: &[&str] = &["jne", "jnt", "sicepat", "pos", "tiki"];

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/destinations", get(search_destinations))
        .route("/options", post(options))
        .route("/status", get(status))
}

#[derive(Debug, Serialize)]
pub struct Status {
    pub enabled: bool,
}

/// Apakah cek ongkir aktif (kunci API terpasang). Dipakai frontend untuk menampilkan pilihan kurir.
async fn status(State(state): State<AppState>) -> Json<Status> {
    Json(Status { enabled: state.cfg.rajaongkir_api_key.is_some() })
}

fn api_key(state: &AppState) -> AppResult<&str> {
    state
        .cfg
        .rajaongkir_api_key
        .as_deref()
        .ok_or_else(|| AppError::BadRequest("cek ongkir belum diaktifkan".into()))
}

/// Pencarian kota/kecamatan tujuan atau asal. Hasil berisi `id` yang dipakai untuk hitung ongkir.
#[derive(Debug, Serialize)]
pub struct Destination {
    pub id: u64,
    pub label: String,
}

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

async fn search_destinations(
    State(state): State<AppState>,
    Query(q): Query<SearchQuery>,
) -> AppResult<Json<Vec<Destination>>> {
    let term = q.q.trim();
    if term.chars().count() < 3 {
        return Ok(Json(Vec::new()));
    }
    Ok(Json(search(&state, term).await?))
}

/// Cari lokasi berdasarkan kata kunci (kota, kecamatan, kelurahan, atau kode pos).
pub async fn search(state: &AppState, term: &str) -> AppResult<Vec<Destination>> {
    let key = api_key(state)?;
    let url = format!("{}/destination/domestic-destination", state.cfg.rajaongkir_base);
    let resp = state
        .http
        .get(url)
        .query(&[("search", term), ("limit", "10"), ("offset", "0")])
        .header("key", key)
        .send()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "rajaongkir: tidak terhubung");
            AppError::BadRequest(UPSTREAM_DOWN.into())
        })?;
    let status = resp.status();
    let body: Value = resp.json().await.map_err(|_| AppError::BadRequest(UPSTREAM_DOWN.into()))?;
    if status == reqwest::StatusCode::NOT_FOUND {
        // 404 berarti tidak ada hasil, bukan gangguan layanan
        return Ok(Vec::new());
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        tracing::error!("rajaongkir: kuota harian habis");
        return Err(AppError::BadRequest(QUOTA_FULL.into()));
    }
    if !status.is_success() {
        tracing::error!(%status, message = %message_of(&body), "rajaongkir: pencarian gagal");
        return Err(AppError::BadRequest(UPSTREAM_DOWN.into()));
    }
    let items = body.get("data").and_then(Value::as_array).cloned().unwrap_or_default();
    Ok(items
        .iter()
        .filter_map(|item| {
            Some(Destination {
                id: as_u64(item.get("id")?)?,
                label: item.get("label")?.as_str()?.to_string(),
            })
        })
        .collect())
}

/// Satu pilihan layanan kurir untuk satu rute.
#[derive(Debug, Clone, Serialize)]
pub struct ShippingOption {
    pub code: String,
    pub name: String,
    pub service: String,
    pub description: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub cost: Decimal,
    pub etd: String,
}

/// Cache hasil hitung ongkir (15 menit). Mengurangi pemanggilan API dan kuota harian.
type CostCache = std::sync::Mutex<std::collections::HashMap<String, (std::time::Instant, Vec<ShippingOption>)>>;
static COST_CACHE: std::sync::OnceLock<CostCache> = std::sync::OnceLock::new();
const CACHE_TTL: std::time::Duration = std::time::Duration::from_secs(15 * 60);
const CACHE_MAX_ENTRIES: usize = 2000;

fn cache() -> &'static CostCache {
    COST_CACHE.get_or_init(|| std::sync::Mutex::new(std::collections::HashMap::new()))
}

/// Hitung ongkir semua layanan dari satu kurir untuk rute dan berat tertentu.
/// Rute tanpa layanan (400 "not found") menghasilkan daftar kosong, bukan error.
pub async fn calculate(
    state: &AppState,
    origin: u64,
    destination: u64,
    weight_grams: u32,
    courier: &str,
) -> AppResult<Vec<ShippingOption>> {
    let key = api_key(state)?;
    let cache_key = format!("{origin}:{destination}:{}:{courier}", weight_grams.max(1));
    if let Ok(map) = cache().lock() {
        if let Some((at, options)) = map.get(&cache_key) {
            if at.elapsed() < CACHE_TTL {
                return Ok(options.clone());
            }
        }
    }
    // Body x-www-form-urlencoded dibentuk lewat Url karena fitur form reqwest tidak aktif
    let mut form = reqwest::Url::parse("http://form.invalid/").expect("url valid");
    form.query_pairs_mut()
        .append_pair("origin", &origin.to_string())
        .append_pair("destination", &destination.to_string())
        .append_pair("weight", &weight_grams.max(1).to_string())
        .append_pair("courier", courier)
        .append_pair("price", "lowest");
    let body = form.query().unwrap_or_default().to_string();

    let url = format!("{}/calculate/domestic-cost", state.cfg.rajaongkir_base);
    let resp = state
        .http
        .post(url)
        .header("key", key)
        .header("content-type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "rajaongkir: tidak terhubung");
            AppError::BadRequest(UPSTREAM_DOWN.into())
        })?;
    let status = resp.status();
    let json: Value = resp.json().await.map_err(|e| AppError::Gateway(format!("rajaongkir: {e}")))?;
    if status == reqwest::StatusCode::BAD_REQUEST || status == reqwest::StatusCode::NOT_FOUND {
        // Kurir tidak melayani rute ini
        return Ok(Vec::new());
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        tracing::error!("rajaongkir: kuota harian habis");
        return Err(AppError::BadRequest(QUOTA_FULL.into()));
    }
    if !status.is_success() {
        tracing::error!(%status, message = %message_of(&json), "rajaongkir: permintaan gagal");
        return Err(AppError::BadRequest(UPSTREAM_DOWN.into()));
    }
    let items = json.get("data").and_then(Value::as_array).cloned().unwrap_or_default();
    let options: Vec<ShippingOption> = items.iter().filter_map(parse_option).collect();
    if let Ok(mut map) = cache().lock() {
        if map.len() >= CACHE_MAX_ENTRIES {
            map.clear();
        }
        map.insert(cache_key, (std::time::Instant::now(), options.clone()));
    }
    Ok(options)
}

fn parse_option(item: &Value) -> Option<ShippingOption> {
    let cost = match item.get("cost")? {
        Value::Number(n) => Decimal::from_str_exact(&n.to_string()).ok()?,
        Value::String(s) => s.parse::<Decimal>().ok()?,
        _ => return None,
    };
    Some(ShippingOption {
        code: item.get("code")?.as_str()?.to_string(),
        name: item.get("name").and_then(Value::as_str).unwrap_or_default().to_string(),
        service: item.get("service")?.as_str()?.to_string(),
        description: item.get("description").and_then(Value::as_str).unwrap_or_default().to_string(),
        cost,
        etd: item.get("etd").and_then(Value::as_str).unwrap_or_default().to_string(),
    })
}

fn as_u64(v: &Value) -> Option<u64> {
    match v {
        Value::Number(n) => n.as_u64(),
        Value::String(s) => s.parse().ok(),
        _ => None,
    }
}

fn message_of(body: &Value) -> String {
    body.get("meta")
        .and_then(|m| m.get("message"))
        .and_then(Value::as_str)
        .unwrap_or("permintaan gagal")
        .to_string()
}

/// Pilihan kurir yang dikirim pembeli untuk satu toko.
#[derive(Debug, Clone, Deserialize)]
pub struct Choice {
    pub store_id: u64,
    pub code: String,
    pub service: String,
}

/// Hasil ongkir terpilih untuk satu toko.
#[derive(Debug, Clone)]
pub struct Quote {
    pub option: ShippingOption,
}

/// Ongkir satu toko untuk tujuan dan pilihan kurir. `None` jika cek ongkir tidak aktif (pakai ongkir flat).
pub async fn quote_for_store(
    state: &AppState,
    store_name: &str,
    origin: Option<u64>,
    destination: Option<u64>,
    weight_grams: u32,
    choice: Option<&Choice>,
) -> AppResult<Option<Quote>> {
    if state.cfg.rajaongkir_api_key.is_none() {
        return Ok(None);
    }
    let destination = destination
        .ok_or_else(|| AppError::BadRequest("pilih alamat tujuan pengiriman dulu".into()))?;
    let origin = origin.ok_or_else(|| {
        AppError::BadRequest(format!("toko {store_name} belum mengatur lokasi asal pengiriman"))
    })?;
    let choice = choice.ok_or_else(|| AppError::BadRequest(format!("pilih kurir untuk toko {store_name}")))?;

    let options = calculate(state, origin, destination, weight_grams, &choice.code).await?;
    let option = options
        .into_iter()
        .find(|o| o.service.eq_ignore_ascii_case(&choice.service))
        .ok_or_else(|| {
            AppError::BadRequest(format!("layanan {} {} tidak tersedia untuk toko {store_name}", choice.code, choice.service))
        })?;
    Ok(Some(Quote { option }))
}

#[derive(Debug, Deserialize)]
pub struct OptionsReq {
    pub destination_id: u64,
}

#[derive(Debug, Serialize)]
pub struct StoreOptions {
    pub store_id: u64,
    pub store_name: String,
    pub weight_grams: u32,
    pub options: Vec<ShippingOption>,
}

/// Pilihan kurir untuk setiap toko di keranjang pembeli (barang yang dipilih).
async fn options(
    user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<OptionsReq>,
) -> AppResult<Json<Vec<StoreOptions>>> {
    api_key(&state)?;
    let rows: Vec<(u64, String, Option<u64>, Decimal)> = sqlx::query_as(
        "SELECT p.store_id, st.name, st.origin_location_id,
                CAST(SUM(c.qty * p.weight_grams) AS DECIMAL(15,0))
         FROM cart_items c
         JOIN products p ON p.id = c.product_id
         JOIN stores st ON st.id = p.store_id
         WHERE c.user_id = ? AND c.selected = TRUE
         GROUP BY p.store_id, st.name, st.origin_location_id
         ORDER BY MIN(c.updated_at)",
    )
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for (store_id, store_name, origin, weight) in rows {
        let weight_grams = weight.to_string().parse::<u32>().unwrap_or(1).max(1);
        let mut options = Vec::new();
        if let Some(origin) = origin {
            // Semua kurir diminta paralel agar pilihan muncul dalam waktu satu panggilan
            let mut set = tokio::task::JoinSet::new();
            for courier in COURIERS {
                let st = state.clone();
                let destination = req.destination_id;
                set.spawn(async move { calculate(&st, origin, destination, weight_grams, courier).await });
            }
            while let Some(joined) = set.join_next().await {
                let result = joined.map_err(|e| AppError::Internal(format!("hitung ongkir: {e}")))?;
                options.extend(result?);
            }
        }
        out.push(StoreOptions { store_id, store_name, weight_grams, options });
    }
    Ok(Json(out))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parses_cost_as_number_and_string() {
        let number = json!({"name":"JNE","code":"jne","service":"REG","description":"Reguler","cost":12000,"etd":"2-3"});
        let text = json!({"name":"JNE","code":"jne","service":"YES","description":"","cost":"18500","etd":""});
        let opt = parse_option(&number).expect("parse number");
        assert_eq!(opt.cost, Decimal::from(12000));
        assert_eq!(opt.service, "REG");
        assert_eq!(parse_option(&text).expect("parse string").cost, Decimal::from(18500));
    }

    #[test]
    fn rejects_option_without_cost() {
        let bad = json!({"code":"jne","service":"REG"});
        assert!(parse_option(&bad).is_none());
    }

    #[test]
    fn reads_numeric_and_string_ids() {
        assert_eq!(as_u64(&json!(42)), Some(42));
        assert_eq!(as_u64(&json!("42")), Some(42));
        assert_eq!(as_u64(&json!(null)), None);
    }

    #[test]
    fn message_falls_back_when_missing() {
        assert_eq!(message_of(&json!({"meta":{"message":"Missing Params"}})), "Missing Params");
        assert_eq!(message_of(&json!({})), "permintaan gagal");
    }
}
