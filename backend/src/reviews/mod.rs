//! Ulasan produk. Hanya pembeli yang pesanannya sudah dikirim atau selesai yang
//! bisa memberi ulasan, dan hanya satu ulasan per pembeli per produk.

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, patch},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, MySqlPool};

use crate::{
    audit,
    auth::AuthUser,
    tenant::{ensure_product_in_scope, Scope},
    error::{AppError, AppResult},
    state::AppState,
};

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/products/{id}/reviews", get(list_reviews).post(create_review))
        .route("/products/{id}/reviews/me", get(my_review))
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/reviews", get(admin_list_reviews))
        .route("/reviews/{id}", patch(admin_set_visible))
}

#[derive(Debug, FromRow)]
struct ReviewRow {
    id: u64,
    rating: u8,
    comment: String,
    buyer_name: String,
    created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ReviewView {
    pub id: u64,
    pub rating: u8,
    pub comment: String,
    /// Nama disamarkan: nama depan + inisial nama belakang.
    pub buyer_name: String,
    pub created_at: DateTime<Utc>,
}

impl From<ReviewRow> for ReviewView {
    fn from(r: ReviewRow) -> Self {
        ReviewView {
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            buyer_name: mask_name(&r.buyer_name),
            created_at: r.created_at,
        }
    }
}

fn mask_name(name: &str) -> String {
    let mut parts = name.split_whitespace();
    let first = parts.next().unwrap_or("Pembeli");
    match parts.last().and_then(|last| last.chars().next()) {
        Some(initial) => format!("{first} {}.", initial.to_uppercase()),
        None => first.to_string(),
    }
}

#[derive(Debug, Serialize)]
pub struct ReviewSummary {
    /// Rata-rata satu desimal; null jika belum ada ulasan.
    pub average: Option<f64>,
    pub count: i64,
    pub items: Vec<ReviewView>,
}

async fn list_reviews(
    State(state): State<AppState>,
    Path(product_id): Path<u64>,
) -> AppResult<Json<ReviewSummary>> {
    let (avg, count): (Option<f64>, i64) = sqlx::query_as(
        "SELECT CAST(AVG(rating) AS DOUBLE), COUNT(*) FROM product_reviews WHERE product_id = ? AND is_visible = TRUE",
    )
    .bind(product_id)
    .fetch_one(&state.pool)
    .await?;

    let rows = sqlx::query_as::<_, ReviewRow>(
        "SELECT r.id, r.rating, r.comment, u.name AS buyer_name, r.created_at
         FROM product_reviews r JOIN users u ON u.id = r.user_id
         WHERE r.product_id = ? AND r.is_visible = TRUE
         ORDER BY r.created_at DESC, r.id DESC LIMIT 50",
    )
    .bind(product_id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(ReviewSummary {
        average: avg.map(|a| (a * 10.0).round() / 10.0),
        count,
        items: rows.into_iter().map(ReviewView::from).collect(),
    }))
}

#[derive(Debug, Serialize)]
pub struct MyReview {
    pub can_review: bool,
    pub review: Option<ReviewView>,
}

async fn my_review(
    user: AuthUser,
    State(state): State<AppState>,
    Path(product_id): Path<u64>,
) -> AppResult<Json<MyReview>> {
    let review = fetch_own(&state.pool, user.id, product_id).await?;
    let eligible = eligible_order(&state.pool, user.id, product_id).await?.is_some();
    Ok(Json(MyReview {
        can_review: eligible && review.is_none(),
        review,
    }))
}

#[derive(Debug, Deserialize)]
pub struct ReviewReq {
    pub rating: u8,
    #[serde(default)]
    pub comment: String,
}

async fn create_review(
    user: AuthUser,
    State(state): State<AppState>,
    Path(product_id): Path<u64>,
    Json(req): Json<ReviewReq>,
) -> AppResult<impl IntoResponse> {
    if !(1..=5).contains(&req.rating) {
        return Err(AppError::BadRequest("rating harus 1 sampai 5".into()));
    }
    let comment = req.comment.trim().to_string();
    if comment.chars().count() > 1000 {
        return Err(AppError::BadRequest("ulasan maksimal 1000 karakter".into()));
    }
    if fetch_own(&state.pool, user.id, product_id).await?.is_some() {
        return Err(AppError::Conflict("kamu sudah memberi ulasan untuk produk ini".into()));
    }
    let order_id = eligible_order(&state.pool, user.id, product_id)
        .await?
        .ok_or_else(|| AppError::BadRequest("ulasan hanya bisa diberikan setelah pesanan produk ini dikirim".into()))?;

    sqlx::query(
        "INSERT INTO product_reviews (product_id, user_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(product_id)
    .bind(user.id)
    .bind(order_id)
    .bind(req.rating)
    .bind(comment)
    .execute(&state.pool)
    .await?;

    let view = fetch_own(&state.pool, user.id, product_id)
        .await?
        .ok_or_else(|| AppError::Internal("ulasan tidak ditemukan setelah disimpan".into()))?;
    Ok((StatusCode::CREATED, Json(view)))
}

/// Pesanan terbaru milik pembeli yang berisi produk ini dan sudah dikirim atau selesai.
async fn eligible_order(pool: &MySqlPool, user_id: u64, product_id: u64) -> AppResult<Option<u64>> {
    let row: Option<(u64,)> = sqlx::query_as(
        "SELECT o.id FROM orders o JOIN order_items oi ON oi.order_id = o.id
         WHERE o.user_id = ? AND oi.product_id = ? AND o.status IN ('shipped', 'completed')
         ORDER BY o.id DESC LIMIT 1",
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(|r| r.0))
}

async fn fetch_own(pool: &MySqlPool, user_id: u64, product_id: u64) -> AppResult<Option<ReviewView>> {
    let row = sqlx::query_as::<_, ReviewRow>(
        "SELECT r.id, r.rating, r.comment, u.name AS buyer_name, r.created_at
         FROM product_reviews r JOIN users u ON u.id = r.user_id
         WHERE r.user_id = ? AND r.product_id = ?",
    )
    .bind(user_id)
    .bind(product_id)
    .fetch_optional(pool)
    .await?;
    Ok(row.map(ReviewView::from))
}

#[derive(Debug, Serialize, FromRow)]
pub struct AdminReview {
    pub id: u64,
    pub product_id: u64,
    pub product_name: String,
    pub buyer_name: String,
    pub rating: u8,
    pub comment: String,
    pub is_visible: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AdminReviewQuery {
    pub hidden: Option<bool>,
}

async fn admin_list_reviews(
    scope: Scope,
    State(state): State<AppState>,
    axum::extract::Query(q): axum::extract::Query<AdminReviewQuery>,
) -> AppResult<Json<Vec<AdminReview>>> {
    // hidden=true: hanya yang disembunyikan; tanpa parameter: semua
    let only_hidden = q.hidden.unwrap_or(false);
    let rows = sqlx::query_as::<_, AdminReview>(
        "SELECT r.id, r.product_id, p.name AS product_name, u.name AS buyer_name,
                r.rating, r.comment, r.is_visible, r.created_at
         FROM product_reviews r
         JOIN products p ON p.id = r.product_id
         JOIN users u ON u.id = r.user_id
         WHERE (? = FALSE OR r.is_visible = FALSE) AND (? = TRUE OR p.store_id = ?)
         ORDER BY r.id DESC LIMIT 200",
    )
    .bind(only_hidden)
    .bind(scope.store_id.is_none())
    .bind(scope.store_id.unwrap_or(0))
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}

#[derive(Debug, Deserialize)]
pub struct VisibilityReq {
    pub is_visible: bool,
}

async fn admin_set_visible(
    scope: Scope,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<VisibilityReq>,
) -> AppResult<StatusCode> {
    let product: Option<(u64,)> = sqlx::query_as("SELECT product_id FROM product_reviews WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?;
    let (product_id,) = product.ok_or_else(|| AppError::NotFound("ulasan".into()))?;
    ensure_product_in_scope(&state.pool, product_id, scope).await?;
    let res = sqlx::query("UPDATE product_reviews SET is_visible = ? WHERE id = ?")
        .bind(req.is_visible)
        .bind(id)
        .execute(&state.pool)
        .await?;
    if res.rows_affected() == 0 {
        return Err(AppError::NotFound("ulasan".into()));
    }
    let detail = if req.is_visible { "ditampilkan" } else { "disembunyikan" };
    audit::record(&state.pool, Some(scope.user_id), "review.visibility", "review", Some(id), detail).await;
    Ok(StatusCode::NO_CONTENT)
}
