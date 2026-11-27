use anyhow::{bail, Context, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_addr: String,
    pub cors_origin: String,
    pub frontend_url: String,
    pub jwt_secret: String,
    pub cookie_secure: bool,
    pub midtrans_server_key: String,
    pub midtrans_snap_base: String,
    pub midtrans_api_base: String,
    pub upload_dir: String,
    /// Kunci API RajaOngkir. Kosong = ongkir flat per toko (tanpa cek ongkir).
    pub rajaongkir_api_key: Option<String>,
    pub rajaongkir_base: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let jwt_secret = std::env::var("JWT_SECRET").context("JWT_SECRET belum diset")?;
        if jwt_secret.len() < 32 {
            bail!("JWT_SECRET minimal 32 karakter");
        }
        let midtrans_env = std::env::var("MIDTRANS_ENV").unwrap_or_else(|_| "sandbox".into());
        let cors_origin = std::env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".into());
        Ok(Self {
            database_url: std::env::var("DATABASE_URL").context("DATABASE_URL belum diset")?,
            rajaongkir_api_key: std::env::var("RAJAONGKIR_API_KEY").ok().filter(|k| !k.trim().is_empty()),
            rajaongkir_base: std::env::var("RAJAONGKIR_BASE").unwrap_or_else(|_| "https://rajaongkir.komerce.id/api/v1".into()),
            bind_addr: std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
            frontend_url: std::env::var("FRONTEND_URL").unwrap_or_else(|_| cors_origin.clone()),
            cors_origin,
            jwt_secret,
            cookie_secure: std::env::var("COOKIE_SECURE").map(|v| v == "true").unwrap_or(false),
            midtrans_server_key: std::env::var("MIDTRANS_SERVER_KEY").unwrap_or_default(),
            midtrans_snap_base: std::env::var("MIDTRANS_SNAP_BASE").unwrap_or_else(|_| {
                if midtrans_env == "production" { "https://app.midtrans.com".into() } else { "https://app.sandbox.midtrans.com".into() }
            }),
            midtrans_api_base: std::env::var("MIDTRANS_API_BASE").unwrap_or_else(|_| {
                if midtrans_env == "production" { "https://api.midtrans.com".into() } else { "https://api.sandbox.midtrans.com".into() }
            }),
            upload_dir: std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".into()),
        })
    }
}
