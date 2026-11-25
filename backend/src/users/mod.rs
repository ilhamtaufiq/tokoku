//! Manajemen pengguna oleh admin: daftar, ubah role, dan aktif/nonaktif.

use axum::{
    extract::{Path, Query, State},
    routing::{get, patch},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySql, QueryBuilder};

use crate::{
    auth::{AdminUser, AuthUser},
    error::{AppError, AppResult},
    state::AppState,
};

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users))
        .route("/users/{id}", patch(update_user))
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserAdminView {
    pub id: u64,
    pub email: String,
    pub name: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub q: Option<String>,
    pub role: Option<String>,
    pub status: Option<String>,
}

const USER_COLS: &str = "id, email, name, CAST(role AS CHAR) AS role, is_active, created_at";

async fn list_users(_admin: AdminUser, State(state): State<AppState>, Query(q): Query<ListQuery>) -> AppResult<Json<Vec<UserAdminView>>> {
    let mut builder = QueryBuilder::<MySql>::new(format!("SELECT {USER_COLS} FROM users WHERE 1=1"));
    if let Some(term) = q.q.as_deref().map(str::trim).filter(|t| !t.is_empty()) {
        let pattern = format!("%{}%", term.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_"));
        builder.push(" AND (email LIKE ").push_bind(pattern.clone()).push(" OR name LIKE ").push_bind(pattern).push(")");
    }
    match q.role.as_deref() {
        Some("admin") => { builder.push(" AND role = 'admin'"); }
        Some("customer") => { builder.push(" AND role = 'customer'"); }
        _ => {}
    }
    match q.status.as_deref() {
        Some("active") => { builder.push(" AND is_active = TRUE"); }
        Some("inactive") => { builder.push(" AND is_active = FALSE"); }
        _ => {}
    }
    builder.push(" ORDER BY created_at DESC, id DESC LIMIT 500");
    let rows: Vec<UserAdminView> = builder.build_query_as().fetch_all(&state.pool).await?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserReq {
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

async fn update_user(
    me: AuthUser,
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<UpdateUserReq>,
) -> AppResult<Json<UserAdminView>> {
    let target = sqlx::query_as::<_, UserAdminView>(sqlx::AssertSqlSafe(format!("SELECT {USER_COLS} FROM users WHERE id = ?")))
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("pengguna {id}")))?;

    let new_role = match req.role.as_deref() {
        None => target.role.clone(),
        Some(r @ ("admin" | "customer")) => r.to_string(),
        Some(_) => return Err(AppError::BadRequest("role harus admin atau customer".into())),
    };
    let new_active = req.is_active.unwrap_or(target.is_active);

    // Admin tidak boleh menurunkan atau menonaktifkan akunnya sendiri
    if id == me.id && (new_role != "admin" || !new_active) {
        return Err(AppError::BadRequest("tidak bisa menurunkan role atau menonaktifkan akun sendiri".into()));
    }

    // Harus selalu ada minimal satu admin aktif
    let losing_admin = target.role == "admin" && target.is_active && (new_role != "admin" || !new_active);
    if losing_admin {
        let (others,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = TRUE AND id <> ?")
            .bind(id)
            .fetch_one(&state.pool)
            .await?;
        if others == 0 {
            return Err(AppError::BadRequest("harus tersisa minimal satu admin aktif".into()));
        }
    }

    sqlx::query("UPDATE users SET role = ?, is_active = ? WHERE id = ?")
        .bind(&new_role)
        .bind(new_active)
        .bind(id)
        .execute(&state.pool)
        .await?;

    let updated = sqlx::query_as::<_, UserAdminView>(sqlx::AssertSqlSafe(format!("SELECT {USER_COLS} FROM users WHERE id = ?")))
        .bind(id)
        .fetch_one(&state.pool)
        .await?;
    tracing::info!(user_id = id, role = %updated.role, active = updated.is_active, by = me.id, "pengguna diperbarui admin");
    Ok(Json(updated))
}
