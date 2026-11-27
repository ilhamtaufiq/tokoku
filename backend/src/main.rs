mod audit;
mod auth;
mod banners;
mod cart;
mod catalog;
mod config;
mod db;
mod error;
mod orders;
mod payments;
mod pricing;
mod reviews;
mod promo;
mod routes;
mod settings;
mod stores;
mod tenant;
mod state;
mod users;
mod variants;
mod midtrans;

use std::sync::Arc;

use anyhow::{bail, Result};
use axum::http::{header, HeaderValue, Method};
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use state::AppState;

#[tokio::main]
async fn main() -> Result<()> {
    let _ = dotenvy::dotenv();
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = config::Config::from_env()?;
    let pool = db::connect(&cfg.database_url).await?;
    db::migrate(&pool).await?;
    tracing::info!("migrasi database selesai");

    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.first().map(String::as_str) == Some("create-admin") {
        // Usage: toko_backend create-admin <email> <nama> <password>
        if args.len() != 4 {
            bail!("usage: create-admin <email> <nama> <password>");
        }
        return auth::create_admin(&pool, &args[1], &args[2], &args[3]).await;
    }

    let cors = CorsLayer::new()
        .allow_origin(cfg.cors_origin.parse::<HeaderValue>()?)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::PATCH, Method::DELETE])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(true);

    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;
    let state = AppState { pool, cfg: Arc::new(cfg.clone()), http };
    payments::spawn_jobs(state.clone());
    let app = routes::router(state).layer(cors).layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(&cfg.bind_addr).await?;
    tracing::info!("server berjalan di http://{}", cfg.bind_addr);
    axum::serve(listener, app).await?;
    Ok(())
}
