use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::{AssertSqlSafe, FromRow, MySql, MySqlPool, QueryBuilder};

use crate::{
    auth::AdminUser,
    error::{AppError, AppResult},
    pricing::ppn_included_in_price,
    settings,
    state::AppState,
};

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/categories", get(list_categories))
        .route("/products", get(list_products))
        .route("/products/{id}", get(get_product))
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/categories", post(create_category))
        .route("/products", post(create_product))
        .route("/products/{id}", axum::routing::put(update_product).delete(deactivate_product))
}

// ---------- Kategori ----------

#[derive(Debug, Serialize, FromRow)]
pub struct Category {
    pub id: u64,
    pub name: String,
    pub slug: String,
}

#[derive(Debug, Deserialize)]
pub struct CategoryReq {
    pub name: String,
    pub slug: String,
}

async fn list_categories(State(state): State<AppState>) -> AppResult<Json<Vec<Category>>> {
    let rows = sqlx::query_as::<_, Category>("SELECT id, name, slug FROM categories ORDER BY name")
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(rows))
}

async fn create_category(
    _admin: AdminUser,
    State(state): State<AppState>,
    Json(req): Json<CategoryReq>,
) -> AppResult<impl IntoResponse> {
    if req.name.trim().is_empty() || req.slug.trim().is_empty() {
        return Err(AppError::BadRequest("name dan slug wajib diisi".into()));
    }
    let done = sqlx::query("INSERT INTO categories (name, slug) VALUES (?, ?)")
        .bind(req.name.trim())
        .bind(req.slug.trim().to_lowercase())
        .execute(&state.pool)
        .await
        .map_err(map_unique("slug kategori sudah dipakai"))?;
    Ok((StatusCode::CREATED, Json(Category {
        id: done.last_insert_id(),
        name: req.name.trim().to_string(),
        slug: req.slug.trim().to_lowercase(),
    })))
}

// ---------- Produk ----------

#[derive(Debug, FromRow)]
struct ProductRow {
    id: u64,
    category_id: u64,
    sku: String,
    name: String,
    description: Option<String>,
    price: Decimal,
    is_taxable: bool,
    stock: u32,
    is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct ProductView {
    pub id: u64,
    pub category_id: u64,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    /// Harga jual, sudah termasuk PPN.
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    /// Bagian PPN yang sudah termasuk dalam harga (untuk ditampilkan).
    #[serde(with = "rust_decimal::serde::str")]
    pub ppn_included: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub tax_rate: Decimal,
    pub is_taxable: bool,
    pub stock: u32,
    pub is_active: bool,
}

fn to_view(row: ProductRow, ppn_percent: Decimal) -> ProductView {
    // Tarif yang dipakai untuk tampilan: tarif global saat ini (bukan snapshot produk).
    let ppn_included = ppn_included_in_price(row.price, ppn_percent, row.is_taxable);
    ProductView {
        id: row.id,
        category_id: row.category_id,
        sku: row.sku,
        name: row.name,
        description: row.description,
        price: row.price,
        ppn_included,
        tax_rate: ppn_percent,
        is_taxable: row.is_taxable,
        stock: row.stock,
        is_active: row.is_active,
    }
}

const PRODUCT_COLUMNS: &str =
    "id, category_id, sku, name, description, price, is_taxable, stock, is_active";

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub q: Option<String>,
    pub category_id: Option<u64>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct Page<T> {
    pub items: Vec<T>,
    pub page: u32,
    pub per_page: u32,
    pub total: i64,
}

async fn list_products(
    State(state): State<AppState>,
    Query(q): Query<ListQuery>,
) -> AppResult<Json<Page<ProductView>>> {
    let page = q.page.unwrap_or(1).max(1);
    let per_page = q.per_page.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) as i64 * per_page as i64;
    let ppn = settings::ppn_percent(&state.pool).await?;

    let mut data = QueryBuilder::<MySql>::new(format!(
        "SELECT {PRODUCT_COLUMNS} FROM products WHERE is_active = TRUE"
    ));
    let mut count = QueryBuilder::<MySql>::new("SELECT COUNT(*) FROM products WHERE is_active = TRUE");

    for builder in [&mut data, &mut count] {
        if let Some(search) = q.q.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            builder.push(" AND (name LIKE ").push_bind(format!("%{search}%"))
                .push(" OR sku LIKE ").push_bind(format!("%{search}%")).push(")");
        }
        if let Some(cat) = q.category_id {
            builder.push(" AND category_id = ").push_bind(cat);
        }
    }

    let total: i64 = count.build_query_scalar().fetch_one(&state.pool).await?;
    data.push(" ORDER BY id DESC LIMIT ").push_bind(per_page as i64)
        .push(" OFFSET ").push_bind(offset);
    let rows: Vec<ProductRow> = data.build_query_as().fetch_all(&state.pool).await?;

    Ok(Json(Page {
        items: rows.into_iter().map(|r| to_view(r, ppn)).collect(),
        page,
        per_page,
        total,
    }))
}

async fn fetch_product(pool: &MySqlPool, id: u64) -> AppResult<ProductRow> {
    sqlx::query_as::<_, ProductRow>(AssertSqlSafe(format!("SELECT {PRODUCT_COLUMNS} FROM products WHERE id = ?")))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("produk {id}")))
}

async fn get_product(State(state): State<AppState>, Path(id): Path<u64>) -> AppResult<Json<ProductView>> {
    let row = fetch_product(&state.pool, id).await?;
    if !row.is_active {
        return Err(AppError::NotFound(format!("produk {id}")));
    }
    let ppn = settings::ppn_percent(&state.pool).await?;
    Ok(Json(to_view(row, ppn)))
}

#[derive(Debug, Deserialize)]
pub struct ProductReq {
    pub category_id: u64,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    pub is_taxable: Option<bool>,
    pub stock: Option<u32>,
}

fn validate_product(req: &ProductReq) -> AppResult<()> {
    if req.sku.trim().is_empty() || req.name.trim().is_empty() {
        return Err(AppError::BadRequest("sku dan name wajib diisi".into()));
    }
    if req.price <= Decimal::ZERO {
        return Err(AppError::BadRequest("harga harus lebih dari 0".into()));
    }
    // Rupiah tidak memakai desimal
    if req.price.fract() != Decimal::ZERO {
        return Err(AppError::BadRequest("harga harus bilangan bulat rupiah".into()));
    }
    Ok(())
}

async fn create_product(
    _admin: AdminUser,
    State(state): State<AppState>,
    Json(req): Json<ProductReq>,
) -> AppResult<impl IntoResponse> {
    validate_product(&req)?;
    let ppn = settings::ppn_percent(&state.pool).await?;
    let done = sqlx::query(
        "INSERT INTO products (category_id, sku, name, description, price, tax_rate, is_taxable, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(req.category_id)
    .bind(req.sku.trim())
    .bind(req.name.trim())
    .bind(req.description.as_deref())
    .bind(req.price)
    .bind(ppn)
    .bind(req.is_taxable.unwrap_or(true))
    .bind(req.stock.unwrap_or(0))
    .execute(&state.pool)
    .await
    .map_err(map_unique("SKU sudah dipakai"))?;

    let row = fetch_product(&state.pool, done.last_insert_id()).await?;
    Ok((StatusCode::CREATED, Json(to_view(row, ppn))))
}

async fn update_product(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<ProductReq>,
) -> AppResult<Json<ProductView>> {
    validate_product(&req)?;
    fetch_product(&state.pool, id).await?;
    let ppn = settings::ppn_percent(&state.pool).await?;
    sqlx::query(
        "UPDATE products SET category_id = ?, sku = ?, name = ?, description = ?, price = ?,
                             is_taxable = ?, stock = ?
         WHERE id = ?",
    )
    .bind(req.category_id)
    .bind(req.sku.trim())
    .bind(req.name.trim())
    .bind(req.description.as_deref())
    .bind(req.price)
    .bind(req.is_taxable.unwrap_or(true))
    .bind(req.stock.unwrap_or(0))
    .bind(id)
    .execute(&state.pool)
    .await
    .map_err(map_unique("SKU sudah dipakai"))?;

    let row = fetch_product(&state.pool, id).await?;
    Ok(Json(to_view(row, ppn)))
}

/// Hapus produk = nonaktifkan (riwayat pesanan tetap aman).
async fn deactivate_product(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> AppResult<StatusCode> {
    let done = sqlx::query("UPDATE products SET is_active = FALSE WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await?;
    if done.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("produk {id}")));
    }
    Ok(StatusCode::NO_CONTENT)
}

fn map_unique(message: &'static str) -> impl Fn(sqlx::Error) -> AppError {
    move |e| match &e {
        sqlx::Error::Database(db) if db.is_unique_violation() => AppError::BadRequest(message.into()),
        _ => AppError::from(e),
    }
}
