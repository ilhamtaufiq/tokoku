use axum::{
    extract::State,
    http::{header, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde_json::{json, Value};

use tower_http::services::ServeDir;

use crate::{auth, cart, catalog, orders, payments, pricing, promo, settings, state::AppState};

pub fn router(state: AppState) -> Router {
    let api = Router::new()
        .nest("/auth", auth::router())
        .merge(catalog::public_router())
        .route("/store", get(settings::store_info))
        .nest("/cart", cart::router())
        .nest("/orders", orders::customer_router())
        .nest("/pricing", pricing::handler::router())
        .nest("/webhooks", payments::router())
        .nest(
            "/admin",
            catalog::admin_router()
                .merge(promo::admin_router())
                .merge(orders::admin_router())
                .route("/store", axum::routing::put(settings::admin_update_store)),
        );

    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .route("/sitemap.xml", get(sitemap))
        .nest("/api", api)
        .nest_service("/uploads", ServeDir::new(state.cfg.upload_dir.clone()))
        .with_state(state)
}

async fn healthz() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

async fn readyz(State(state): State<AppState>) -> (StatusCode, Json<Value>) {
    match sqlx::query("SELECT 1").execute(&state.pool).await {
        Ok(_) => (StatusCode::OK, Json(json!({ "status": "ready", "database": "ok" }))),
        Err(e) => {
            tracing::error!(error = %e, "readiness check gagal");
            (
                StatusCode::SERVICE_UNAVAILABLE,
                Json(json!({ "status": "not_ready", "database": "error" })),
            )
        }
    }
}

/// Sitemap untuk mesin pencari: halaman statis dan semua produk aktif.
/// Basis URL diambil dari FRONTEND_URL agar sesuai domain produksi.
async fn sitemap(State(state): State<AppState>) -> crate::error::AppResult<impl IntoResponse> {
    let base = state.cfg.frontend_url.trim_end_matches('/').to_string();
    let products: Vec<(u64, DateTime<Utc>)> = sqlx::query_as(
        "SELECT id, created_at FROM products WHERE is_active = TRUE ORDER BY id",
    )
    .fetch_all(&state.pool)
    .await?;

    let mut xml = String::from(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n",
    );
    for path in ["/", "/syarat", "/privasi", "/pengembalian"] {
        xml.push_str(&format!("  <url><loc>{base}{path}</loc></url>\n"));
    }
    for (id, created) in products {
        xml.push_str(&format!(
            "  <url><loc>{base}/products/{id}</loc><lastmod>{}</lastmod></url>\n",
            created.format("%Y-%m-%d")
        ));
    }
    xml.push_str("</urlset>\n");
    Ok(([(header::CONTENT_TYPE, "application/xml; charset=utf-8")], xml))
}
