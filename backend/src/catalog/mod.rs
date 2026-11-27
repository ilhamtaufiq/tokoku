use axum::{
    extract::{DefaultBodyLimit, Multipart, Path, Query, State},
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
    tenant::Scope,
    error::{AppError, AppResult},
    pricing::ppn_included_in_price,
    settings,
    state::AppState,
};

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/categories", get(list_categories))
        .route("/products", get(list_products))
        .route("/products/suggest", get(suggest))
        .route("/products/{id}", get(get_product))
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/categories", post(create_category))
        .route("/products", axum::routing::get(admin_list_products).post(create_product))
        .route("/products/{id}", axum::routing::put(update_product).delete(deactivate_product))
        .route("/products/{id}/image", post(upload_image).layer(DefaultBodyLimit::max(3 * 1024 * 1024)))
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
    image_url: Option<String>,
    variant_count: i64,
    min_variant_price: Option<Decimal>,
    variant_stock: Option<Decimal>,
    weight_grams: u32,
    store_id: u64,
    store_name: Option<String>,
    store_slug: Option<String>,
    store_status: Option<String>,
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
    pub image_url: Option<String>,
    /// Produk dengan varian: harga = harga varian termurah, stok = total stok varian aktif.
    pub has_variants: bool,
    /// Daftar varian aktif (hanya diisi di halaman detail).
    pub variants: Vec<crate::variants::VariantView>,
    pub store_id: u64,
    pub store_name: Option<String>,
    pub store_slug: Option<String>,
    pub weight_grams: u32,
}

fn to_view(row: ProductRow, ppn_percent: Decimal) -> ProductView {
    let has_variants = row.variant_count > 0;
    let price = if has_variants { row.min_variant_price.unwrap_or(row.price) } else { row.price };
    let stock = if has_variants { crate::variants::total_stock(row.variant_stock) } else { row.stock };
    // Tampilan PPN memakai harga yang benar-benar ditampilkan
    let ppn_included = ppn_included_in_price(price, ppn_percent, row.is_taxable);
    ProductView {
        id: row.id,
        category_id: row.category_id,
        sku: row.sku,
        name: row.name,
        description: row.description,
        price,
        ppn_included,
        tax_rate: ppn_percent,
        is_taxable: row.is_taxable,
        stock,
        is_active: row.is_active,
        image_url: row.image_url,
        has_variants,
        variants: Vec::new(),
        store_id: row.store_id,
        store_name: row.store_name,
        store_slug: row.store_slug,
        weight_grams: row.weight_grams,
    }
}

const PRODUCT_COLUMNS: &str = "id, category_id, sku, name, description, price, is_taxable, stock, is_active, image_url,
    (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = products.id AND v.is_active = TRUE) AS variant_count,
    (SELECT MIN(v.price) FROM product_variants v WHERE v.product_id = products.id AND v.is_active = TRUE) AS min_variant_price,
    (SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = products.id AND v.is_active = TRUE) AS variant_stock,
    weight_grams,
    store_id,
    (SELECT name FROM stores WHERE stores.id = products.store_id) AS store_name,
    (SELECT slug FROM stores WHERE stores.id = products.store_id) AS store_slug,
    (SELECT status FROM stores WHERE stores.id = products.store_id) AS store_status";

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub q: Option<String>,
    /// newest (default) | price_asc | price_desc | name
    pub sort: Option<String>,
    pub category_id: Option<u64>,
    /// Slug toko (opsional): hanya produk dari toko ini.
    pub store: Option<String>,
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
        "SELECT {PRODUCT_COLUMNS} FROM products WHERE is_active = TRUE AND store_id IN (SELECT id FROM stores WHERE status = 'active')"
    ));
    let mut count = QueryBuilder::<MySql>::new("SELECT COUNT(*) FROM products WHERE is_active = TRUE AND store_id IN (SELECT id FROM stores WHERE status = 'active')");

    for builder in [&mut data, &mut count] {
        if let Some(search) = q.q.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            builder.push(" AND (name LIKE ").push_bind(format!("%{search}%"))
                .push(" OR sku LIKE ").push_bind(format!("%{search}%")).push(")");
        }
        if let Some(cat) = q.category_id {
            builder.push(" AND category_id = ").push_bind(cat);
        }
        if let Some(slug) = q.store.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            builder.push(" AND store_id = (SELECT id FROM stores WHERE slug = ").push_bind(slug.to_string()).push(")");
        }
    }

    let total: i64 = count.build_query_scalar().fetch_one(&state.pool).await?;
    let order = match q.sort.as_deref() {
        Some("price_asc") => " ORDER BY price ASC, id DESC",
        Some("price_desc") => " ORDER BY price DESC, id DESC",
        Some("name") => " ORDER BY name ASC, id DESC",
        _ => " ORDER BY id DESC",
    };
    data.push(order).push(" LIMIT ").push_bind(per_page as i64)
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
    if !row.is_active || row.store_status.as_deref() != Some("active") {
        return Err(AppError::NotFound(format!("produk {id}")));
    }
    let ppn = settings::ppn_percent(&state.pool).await?;
    let variants = crate::variants::active_for_product(&state.pool, id).await?;
    let mut view = to_view(row, ppn);
    view.variants = variants;
    Ok(Json(view))
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
    /// Berat untuk cek ongkir, dalam gram (1–100000). Default 1000.
    pub weight_grams: Option<u32>,
}

/// Berat produk dalam gram. Default 1000 gram bila tidak diisi.
fn weight_of(req: &ProductReq) -> u32 {
    req.weight_grams.unwrap_or(1000)
}

fn validate_product(req: &ProductReq) -> AppResult<()> {
    if req.sku.trim().is_empty() || req.name.trim().is_empty() {
        return Err(AppError::BadRequest("sku dan name wajib diisi".into()));
    }
    if let Some(w) = req.weight_grams {
        if !(1..=100_000).contains(&w) {
            return Err(AppError::BadRequest("berat produk harus 1–100000 gram".into()));
        }
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

/// Pastikan produk ada dan milik toko yang boleh diakses (admin platform: semua toko).
async fn ensure_scope(pool: &MySqlPool, id: u64, scope: Scope) -> AppResult<ProductRow> {
    let row = fetch_product(pool, id).await?;
    if let Some(store) = scope.store_id {
        if row.store_id != store {
            return Err(AppError::NotFound(format!("produk {id}")));
        }
    }
    Ok(row)
}

#[derive(Debug, Deserialize)]
pub struct AdminProductQuery {
    pub q: Option<String>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

/// Daftar produk untuk admin/penjual: termasuk produk nonaktif, dibatasi ke toko sesuai lingkup.
async fn admin_list_products(
    scope: Scope,
    State(state): State<AppState>,
    Query(q): Query<AdminProductQuery>,
) -> AppResult<Json<Page<ProductView>>> {
    let page = q.page.unwrap_or(1).max(1);
    let per_page = q.per_page.unwrap_or(100).clamp(1, 200);
    let offset = (page - 1) as i64 * per_page as i64;
    let ppn = settings::ppn_percent(&state.pool).await?;

    let mut data = QueryBuilder::<MySql>::new(format!("SELECT {PRODUCT_COLUMNS} FROM products WHERE 1=1"));
    let mut count = QueryBuilder::<MySql>::new("SELECT COUNT(*) FROM products WHERE 1=1");
    for builder in [&mut data, &mut count] {
        if let Some(store) = scope.store_id {
            builder.push(" AND store_id = ").push_bind(store);
        }
        if let Some(search) = q.q.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
            builder.push(" AND (name LIKE ").push_bind(format!("%{search}%"))
                .push(" OR sku LIKE ").push_bind(format!("%{search}%")).push(")");
        }
    }
    let total: i64 = count.build_query_scalar().fetch_one(&state.pool).await?;
    data.push(" ORDER BY id DESC LIMIT ").push_bind(per_page as i64).push(" OFFSET ").push_bind(offset);
    let rows: Vec<ProductRow> = data.build_query_as().fetch_all(&state.pool).await?;
    Ok(Json(Page {
        items: rows.into_iter().map(|r| to_view(r, ppn)).collect(),
        page,
        per_page,
        total,
    }))
}

async fn create_product(
    scope: Scope,
    State(state): State<AppState>,
    Json(req): Json<ProductReq>,
) -> AppResult<impl IntoResponse> {
    validate_product(&req)?;
    let ppn = settings::ppn_percent(&state.pool).await?;
    let done = sqlx::query(
        "INSERT INTO products (store_id, category_id, sku, name, description, price, tax_rate, is_taxable, stock, weight_grams)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(scope.create_store_id())
    .bind(req.category_id)
    .bind(req.sku.trim())
    .bind(req.name.trim())
    .bind(req.description.as_deref())
    .bind(req.price)
    .bind(ppn)
    .bind(req.is_taxable.unwrap_or(true))
    .bind(req.stock.unwrap_or(0))
    .bind(weight_of(&req))
    .execute(&state.pool)
    .await
    .map_err(map_unique("SKU sudah dipakai"))?;

    let row = fetch_product(&state.pool, done.last_insert_id()).await?;
    Ok((StatusCode::CREATED, Json(to_view(row, ppn))))
}

async fn update_product(
    scope: Scope,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<ProductReq>,
) -> AppResult<Json<ProductView>> {
    validate_product(&req)?;
    ensure_scope(&state.pool, id, scope).await?;
    let ppn = settings::ppn_percent(&state.pool).await?;
    sqlx::query(
        "UPDATE products SET category_id = ?, sku = ?, name = ?, description = ?, price = ?,
                             is_taxable = ?, stock = ?, weight_grams = ?
         WHERE id = ?",
    )
    .bind(req.category_id)
    .bind(req.sku.trim())
    .bind(req.name.trim())
    .bind(req.description.as_deref())
    .bind(req.price)
    .bind(req.is_taxable.unwrap_or(true))
    .bind(req.stock.unwrap_or(0))
    .bind(weight_of(&req))
    .bind(id)
    .execute(&state.pool)
    .await
    .map_err(map_unique("SKU sudah dipakai"))?;

    let row = fetch_product(&state.pool, id).await?;
    Ok(Json(to_view(row, ppn)))
}

/// Hapus produk = nonaktifkan (riwayat pesanan tetap aman).
async fn deactivate_product(
    scope: Scope,
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> AppResult<StatusCode> {
    ensure_scope(&state.pool, id, scope).await?;
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

pub(crate) const MAX_IMAGE_BYTES: usize = 2 * 1024 * 1024;

pub(crate) fn detect_image_ext(data: &[u8]) -> Option<&'static str> {
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some("jpg")
    } else if data.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some("png")
    } else if data.len() >= 12 && &data[0..4] == b"RIFF" && &data[8..12] == b"WEBP" {
        Some("webp")
    } else {
        None
    }
}

pub(crate) fn random_hex(bytes: usize) -> String {
    use rand_core::{OsRng, RngCore};
    let mut buf = vec![0u8; bytes];
    OsRng.fill_bytes(&mut buf);
    buf.iter().map(|b| format!("{b:02x}")).collect()
}

/// Unggah gambar produk (JPEG/PNG/WebP, maks 2 MB). Format dicek dari isi file, bukan dari nama.
async fn upload_image(
    scope: Scope,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    mut multipart: Multipart,
) -> AppResult<Json<ProductView>> {
    ensure_scope(&state.pool, id, scope).await?;
    let field = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
        .ok_or_else(|| AppError::BadRequest("file wajib dikirim".into()))?;
    let data = field
        .bytes()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    if data.len() > MAX_IMAGE_BYTES {
        return Err(AppError::BadRequest("ukuran gambar maksimal 2 MB".into()));
    }
    let ext = detect_image_ext(&data)
        .ok_or_else(|| AppError::BadRequest("format gambar harus JPEG, PNG, atau WebP".into()))?;

    let file_name = format!("{}.{ext}", random_hex(16));
    tokio::fs::create_dir_all(&state.cfg.upload_dir)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;
    tokio::fs::write(std::path::Path::new(&state.cfg.upload_dir).join(&file_name), &data)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?;

    let url = format!("/uploads/{file_name}");
    sqlx::query("UPDATE products SET image_url = ? WHERE id = ?")
        .bind(&url)
        .bind(id)
        .execute(&state.pool)
        .await?;

    let ppn = settings::ppn_percent(&state.pool).await?;
    let row = fetch_product(&state.pool, id).await?;
    Ok(Json(to_view(row, ppn)))
}

#[derive(Debug, Serialize, FromRow)]
pub struct Suggestion {
    pub id: u64,
    pub name: String,
    pub sku: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub price: Decimal,
    pub image_url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SuggestQuery {
    pub q: String,
}

/// Saran cepat untuk kotak pencarian: maksimal 6 produk aktif yang namanya atau SKU-nya cocok.
async fn suggest(State(state): State<AppState>, Query(params): Query<SuggestQuery>) -> AppResult<Json<Vec<Suggestion>>> {
    let term = params.q.trim();
    if term.chars().count() < 2 {
        return Ok(Json(Vec::new()));
    }
    // Escape wildcard LIKE agar input pengguna diperlakukan sebagai teks biasa
    let escaped = term.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_");
    let pattern = format!("%{escaped}%");
    let rows = sqlx::query_as::<_, Suggestion>(
        "SELECT id, name, sku, price, image_url FROM products
         WHERE is_active = TRUE AND store_id IN (SELECT id FROM stores WHERE status = 'active') AND (name LIKE ? OR sku LIKE ?)
         ORDER BY name LIMIT 6",
    )
    .bind(&pattern)
    .bind(&pattern)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows))
}
