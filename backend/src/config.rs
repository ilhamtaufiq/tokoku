use anyhow::{bail, Context, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub bind_addr: String,
    pub cors_origin: String,
    pub frontend_url: String,
    pub jwt_secret: String,
    pub cookie_secure: bool,
    pub xendit_secret_key: String,
    pub xendit_callback_token: String,
    pub xendit_base_url: String,
    pub upload_dir: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        let jwt_secret = std::env::var("JWT_SECRET").context("JWT_SECRET belum diset")?;
        if jwt_secret.len() < 32 {
            bail!("JWT_SECRET minimal 32 karakter");
        }
        let cors_origin = std::env::var("CORS_ORIGIN").unwrap_or_else(|_| "http://localhost:5173".into());
        Ok(Self {
            database_url: std::env::var("DATABASE_URL").context("DATABASE_URL belum diset")?,
            bind_addr: std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
            frontend_url: std::env::var("FRONTEND_URL").unwrap_or_else(|_| cors_origin.clone()),
            cors_origin,
            jwt_secret,
            cookie_secure: std::env::var("COOKIE_SECURE").map(|v| v == "true").unwrap_or(false),
            xendit_secret_key: std::env::var("XENDIT_SECRET_KEY").unwrap_or_default(),
            xendit_callback_token: std::env::var("XENDIT_CALLBACK_TOKEN").unwrap_or_default(),
            xendit_base_url: std::env::var("XENDIT_BASE_URL")
                .unwrap_or_else(|_| "https://api.xendit.co".into()),
            upload_dir: std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "uploads".into()),
        })
    }
}
