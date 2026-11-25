//! Audit log: mencatat siapa mengubah apa. Pencatatan best-effort: kegagalan
//! menulis log tidak membatalkan aksi utama, tetapi tetap masuk log server.

use axum::{
    extract::{Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;

use crate::{auth::AdminUser, error::AppResult, state::AppState};

pub async fn record(
    pool: &MySqlPool,
    actor_id: Option<u64>,
    action: &str,
    entity: &str,
    entity_id: Option<u64>,
    detail: &str,
) {
    let detail: String = detail.chars().take(500).collect();
    let res = sqlx::query(
        "INSERT INTO audit_logs (actor_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(actor_id)
    .bind(action)
    .bind(entity)
    .bind(entity_id)
    .bind(detail)
    .execute(pool)
    .await;
    if let Err(e) = res {
        tracing::error!(error = %e, action, "gagal mencatat audit log");
    }
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/audit", get(list_audit))
        .route("/orders/{id}/activity", get(order_activity))
}

#[derive(Debug, Deserialize)]
pub struct AuditQuery {
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct AuditEntry {
    pub id: u64,
    pub actor_name: Option<String>,
    pub action: String,
    pub entity: String,
    pub entity_id: Option<u64>,
    pub detail: String,
    pub created_at: DateTime<Utc>,
}

async fn list_audit(
    _admin: AdminUser,
    State(state): State<AppState>,
    Query(q): Query<AuditQuery>,
) -> AppResult<Json<Vec<AuditEntry>>> {
    let limit = q.limit.unwrap_or(100).clamp(1, 300) as i64;
    let rows = sqlx::query_as::<_, AuditEntry>(
        "SELECT a.id, u.name AS actor_name, a.action, a.entity, a.entity_id, a.detail, a.created_at
         FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.id DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}

/// Riwayat aktivitas satu pesanan (urut dari yang terbaru).
async fn order_activity(
    _admin: AdminUser,
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<u64>,
) -> AppResult<Json<Vec<AuditEntry>>> {
    let rows = sqlx::query_as::<_, AuditEntry>(
        "SELECT a.id, u.name AS actor_name, a.action, a.entity, a.entity_id, a.detail, a.created_at
         FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
         WHERE a.entity = 'order' AND a.entity_id = ?
         ORDER BY a.id DESC LIMIT 200",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}
