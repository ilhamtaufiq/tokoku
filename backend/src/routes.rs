use axum::{extract::State, http::StatusCode, routing::get, Json, Router};
use serde_json::{json, Value};

use crate::{auth, cart, catalog, orders, payments, pricing, promo, state::AppState};

pub fn router(state: AppState) -> Router {
    let api = Router::new()
        .nest("/auth", auth::router())
        .merge(catalog::public_router())
        .nest("/cart", cart::router())
        .nest("/orders", orders::customer_router())
        .nest("/pricing", pricing::handler::router())
        .nest("/webhooks", payments::router())
        .nest(
            "/admin",
            catalog::admin_router()
                .merge(promo::admin_router())
                .merge(orders::admin_router()),
        );

    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
        .nest("/api", api)
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
