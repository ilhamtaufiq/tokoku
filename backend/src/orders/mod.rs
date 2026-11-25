use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, patch, post},
    Json, Router,
};
use chrono::{DateTime, FixedOffset, Utc};
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::{AssertSqlSafe, FromRow, MySql, MySqlPool, QueryBuilder, Transaction};

use crate::{
    auth::{AdminUser, AuthUser},
    error::{AppError, AppResult},
    pricing::{calculate, PricingLine},
    promo, settings,
    state::AppState,
    midtrans::{self, SnapItem, SnapRequest},
};

pub fn customer_router() -> Router<AppState> {
    Router::new()
        .route("/", post(checkout).get(list_orders))
        .route("/{id}", get(get_order))
        .route("/{id}/pay", post(pay_order))
}

pub fn admin_router() -> Router<AppState> {
    Router::new()
        .route("/orders", get(admin_list_orders))
        .route("/orders/{id}/status", patch(admin_update_status))
        .route("/orders/{id}/refund-cancel", post(admin_refund_cancel))
        .route("/dashboard", get(admin_dashboard))
}

const ORDER_COLS: &str = "id, user_id, invoice_no, CAST(status AS CHAR) AS status,
    CAST(payment_status AS CHAR) AS payment_status, subtotal, discount_total, dpp, ppn_rate,
    ppn_total, shipping_fee, grand_total, shipping_address, buyer_npwp, promo_code,
    payment_url, created_at, tracking_number, refund_note,
    (SELECT name FROM users WHERE users.id = orders.user_id) AS buyer_name,
    TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), expires_at) AS seconds_left";

#[derive(Debug, FromRow)]
pub struct OrderRow {
    pub id: u64,
    pub user_id: u64,
    pub invoice_no: String,
    pub status: String,
    pub payment_status: String,
    pub subtotal: Decimal,
    pub discount_total: Decimal,
    pub dpp: Decimal,
    pub ppn_rate: Decimal,
    pub ppn_total: Decimal,
    pub shipping_fee: Decimal,
    pub grand_total: Decimal,
    pub shipping_address: String,
    pub buyer_npwp: Option<String>,
    pub promo_code: Option<String>,
    pub payment_url: Option<String>,
    pub created_at: DateTime<Utc>,
    pub tracking_number: Option<String>,
    pub refund_note: Option<String>,
    pub buyer_name: Option<String>,
    pub seconds_left: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct OrderItemView {
    pub product_id: u64,
    pub product_name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub unit_price: Decimal,
    pub qty: u32,
    pub is_taxable: bool,
    #[serde(with = "rust_decimal::serde::str")]
    pub line_subtotal: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub line_discount: Decimal,
}

#[derive(Debug, Serialize)]
pub struct OrderView {
    pub id: u64,
    pub invoice_no: String,
    pub status: String,
    pub payment_status: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub subtotal: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub discount_total: Decimal,
    pub promo_code: Option<String>,
    #[serde(with = "rust_decimal::serde::str")]
    pub dpp: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub ppn_rate: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub ppn_total: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub shipping_fee: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub grand_total: Decimal,
    pub shipping_address: String,
    pub buyer_npwp: Option<String>,
    pub payment_url: Option<String>,
    pub expires_in_seconds: i64,
    pub created_at: DateTime<Utc>,
    pub tracking_number: Option<String>,
    pub refund_note: Option<String>,
    pub buyer_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OrderDetail {
    #[serde(flatten)]
    pub order: OrderView,
    pub items: Vec<OrderItemView>,
}

#[derive(Debug, Serialize)]
pub struct CheckoutResponse {
    pub order: OrderDetail,
    /// Null jika pembuatan transaksi pembayaran gagal; klien bisa mencoba lagi lewat POST /orders/{id}/pay.
    pub payment_url: Option<String>,
}

fn to_view(o: OrderRow) -> OrderView {
    OrderView {
        id: o.id,
        invoice_no: o.invoice_no,
        status: o.status,
        payment_status: o.payment_status,
        subtotal: o.subtotal,
        discount_total: o.discount_total,
        promo_code: o.promo_code,
        dpp: o.dpp,
        ppn_rate: o.ppn_rate,
        ppn_total: o.ppn_total,
        shipping_fee: o.shipping_fee,
        grand_total: o.grand_total,
        shipping_address: o.shipping_address,
        buyer_npwp: o.buyer_npwp,
        payment_url: o.payment_url,
        expires_in_seconds: o.seconds_left.max(0),
        created_at: o.created_at,
        tracking_number: o.tracking_number,
        refund_note: o.refund_note,
        buyer_name: o.buyer_name,
    }
}

async fn fetch_order(pool: &MySqlPool, id: u64) -> AppResult<OrderRow> {
    sqlx::query_as::<_, OrderRow>(AssertSqlSafe(format!("SELECT {ORDER_COLS} FROM orders WHERE id = ?")))
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("pesanan {id}")))
}

async fn fetch_owned_order(pool: &MySqlPool, id: u64, user: &AuthUser) -> AppResult<OrderRow> {
    let order = fetch_order(pool, id).await?;
    if order.user_id != user.id && user.role != "admin" {
        // 404 agar keberadaan pesanan orang lain tidak bocor
        return Err(AppError::NotFound(format!("pesanan {id}")));
    }
    Ok(order)
}

async fn fetch_items(pool: &MySqlPool, order_id: u64) -> AppResult<Vec<OrderItemView>> {
    let items = sqlx::query_as::<_, OrderItemView>(
        "SELECT product_id, product_name, unit_price, qty, is_taxable, line_subtotal, line_discount
         FROM order_items WHERE order_id = ? ORDER BY id",
    )
    .bind(order_id)
    .fetch_all(pool)
    .await?;
    Ok(items)
}

async fn detail(pool: &MySqlPool, order: OrderRow) -> AppResult<OrderDetail> {
    let id = order.id;
    let items = fetch_items(pool, id).await?;
    Ok(OrderDetail { order: to_view(order), items })
}

/// Nomor invoice berurutan per bulan (zona WIB), dikunci dalam transaksi.
pub async fn next_invoice_no(tx: &mut Transaction<'_, MySql>, prefix: &str) -> AppResult<String> {
    let wib = FixedOffset::east_opt(7 * 3600).expect("offset valid");
    let period = Utc::now().with_timezone(&wib).format("%Y%m").to_string();

    sqlx::query("INSERT INTO invoice_counters (period, last_seq) VALUES (?, 0) ON DUPLICATE KEY UPDATE period = period")
        .bind(&period)
        .execute(&mut **tx)
        .await?;
    let (seq,): (u32,) = sqlx::query_as("SELECT last_seq FROM invoice_counters WHERE period = ? FOR UPDATE")
        .bind(&period)
        .fetch_one(&mut **tx)
        .await?;
    let next = seq + 1;
    sqlx::query("UPDATE invoice_counters SET last_seq = ? WHERE period = ?")
        .bind(next)
        .bind(&period)
        .execute(&mut **tx)
        .await?;
    Ok(format!("{prefix}/{period}/{next:06}"))
}

#[derive(Debug, FromRow)]
struct CartLine {
    product_id: u64,
    variant_id: u64,
    name: String,
    price: Decimal,
    is_taxable: bool,
    product_active: bool,
    variant_active: Option<bool>,
    stock: u32,
    qty: u32,
}

#[derive(Debug, Deserialize)]
pub struct CheckoutReq {
    pub shipping_address: String,
    pub promo_code: Option<String>,
    pub buyer_npwp: Option<String>,
    /// all | bank_transfer | qris | ewallet
    pub payment_method: Option<String>,
}

fn sanitize_npwp(raw: &str) -> AppResult<Option<String>> {
    let cleaned: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    if cleaned.is_empty() {
        return Ok(None);
    }
    if cleaned.len() != 15 && cleaned.len() != 16 {
        return Err(AppError::BadRequest("NPWP harus 15 atau 16 digit".into()));
    }
    Ok(Some(cleaned))
}

async fn checkout(
    user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<CheckoutReq>,
) -> AppResult<(StatusCode, Json<CheckoutResponse>)> {
    let method = PaymentMethod::parse(req.payment_method.as_deref())?;
    let address = req.shipping_address.trim().to_string();
    if address.len() < 10 || address.len() > 1000 {
        return Err(AppError::BadRequest("alamat pengiriman wajib diisi (10–1000 karakter)".into()));
    }
    let npwp = match req.buyer_npwp.as_deref() {
        Some(raw) => sanitize_npwp(raw)?,
        None => None,
    };

    // Pengaturan dibaca sebelum transaksi agar kunci baris tidak ditahan lebih lama dari perlu
    let ppn = settings::ppn_percent(&state.pool).await?;
    let shipping = settings::shipping_flat_fee(&state.pool).await?;
    let prefix = settings::invoice_prefix(&state.pool).await?;

    let mut tx = state.pool.begin().await?;

    let cart: Vec<CartLine> = sqlx::query_as(
        "SELECT c.product_id, c.variant_id,
            CONCAT(p.name, IF(c.variant_id > 0, CONCAT(' · ', v.name), '')) AS name,
            COALESCE(v.price, p.price) AS price,
            p.is_taxable,
            p.is_active AS product_active,
            v.is_active AS variant_active,
            COALESCE(v.stock, p.stock) AS stock,
            c.qty
         FROM cart_items c
         JOIN products p ON p.id = c.product_id
         LEFT JOIN product_variants v ON v.id = c.variant_id AND c.variant_id > 0
         WHERE c.user_id = ? AND c.selected = TRUE FOR UPDATE",
    )
    .bind(user.id)
    .fetch_all(&mut *tx)
    .await?;

    if cart.is_empty() {
        return Err(AppError::BadRequest("pilih minimal satu barang di keranjang".into()));
    }
    for line in &cart {
        if !line.product_active || !line.variant_active.unwrap_or(true) {
            return Err(AppError::BadRequest(format!("produk '{}' sudah tidak tersedia", line.name)));
        }
        if line.stock < line.qty {
            return Err(AppError::Conflict(format!(
                "stok '{}' tersisa {}, sementara jumlah di keranjang {}",
                line.name, line.stock, line.qty
            )));
        }
    }

    let lines: Vec<PricingLine> = cart
        .iter()
        .map(|c| PricingLine {
            product_id: c.product_id,
            name: c.name.clone(),
            unit_price: c.price,
            qty: c.qty,
            is_taxable: c.is_taxable,
        })
        .collect();

    // Diskon promo (dihitung dari subtotal sebelum diskon)
    let discount = match req.promo_code.as_deref().map(str::trim).filter(|c| !c.is_empty()) {
        Some(code) => {
            let base = calculate(&lines, Decimal::ZERO, Decimal::ZERO, ppn)
                .map_err(|e| AppError::BadRequest(e.to_string()))?;
            let promo_row = promo::lock(&mut tx, code).await?;
            let amount = promo::discount_amount(&promo_row, base.subtotal)?;
            let used = sqlx::query(
                "UPDATE promo_codes SET used_count = used_count + 1
                 WHERE id = ? AND (usage_limit IS NULL OR used_count < usage_limit)",
            )
            .bind(promo_row.id)
            .execute(&mut *tx)
            .await?;
            if used.rows_affected() == 0 {
                return Err(AppError::Conflict("kuota promo baru saja habis".into()));
            }
            Some((promo_row.code, amount))
        }
        None => None,
    };
    let (promo_code, discount_amt) = match discount {
        Some((c, a)) => (Some(c), a),
        None => (None, Decimal::ZERO),
    };

    let breakdown = calculate(&lines, discount_amt, shipping, ppn)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;

    let invoice_no = next_invoice_no(&mut tx, &prefix).await?;

    let done = sqlx::query(
        "INSERT INTO orders (user_id, invoice_no, status, payment_status, subtotal, discount_total, dpp,
            ppn_rate, ppn_total, shipping_fee, grand_total, shipping_address, buyer_npwp, promo_code, expires_at)
         VALUES (?, ?, 'pending_payment', 'unpaid', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP() + INTERVAL 24 HOUR)",
    )
    .bind(user.id)
    .bind(&invoice_no)
    .bind(breakdown.subtotal)
    .bind(breakdown.discount_total)
    .bind(breakdown.dpp)
    .bind(breakdown.ppn_rate)
    .bind(breakdown.ppn)
    .bind(breakdown.shipping_fee)
    .bind(breakdown.grand_total)
    .bind(&address)
    .bind(npwp.as_deref())
    .bind(promo_code.as_deref())
    .execute(&mut *tx)
    .await?;
    let order_id = done.last_insert_id();

    // Urutan baris breakdown sama dengan urutan keranjang, sehingga variant_id bisa dipasangkan
    for (line, cart_line) in breakdown.lines.iter().zip(cart.iter()) {
        let variant_id = cart_line.variant_id;
        sqlx::query(
            "INSERT INTO order_items (order_id, product_id, variant_id, product_name, unit_price, is_taxable, qty, line_subtotal, line_discount)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(order_id)
        .bind(line.product_id)
        .bind(variant_id)
        .bind(&line.name)
        .bind(line.unit_price)
        .bind(line.is_taxable)
        .bind(line.qty)
        .bind(line.line_subtotal)
        .bind(line.line_discount)
        .execute(&mut *tx)
        .await?;

        if !adjust_stock_tx(&mut tx, line.product_id, variant_id, line.qty, Adjust::Reserve).await? {
            return Err(AppError::Conflict(format!("stok '{}' baru saja habis", line.name)));
        }
        sqlx::query(
            "INSERT INTO stock_movements (product_id, variant_id, order_id, change_qty, reason) VALUES (?, ?, ?, ?, 'checkout')",
        )
        .bind(line.product_id)
        .bind(variant_id)
        .bind(order_id)
        .bind(-(line.qty as i64))
        .execute(&mut *tx)
        .await?;
    }

    sqlx::query("DELETE FROM cart_items WHERE user_id = ? AND selected = TRUE")
        .bind(user.id)
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    let order = fetch_order(&state.pool, order_id).await?;
    let email = user_email(&state.pool, user.id).await?;
    let payment_url = match create_invoice_for_order(&state, &order, &email, method).await {
        Ok(url) => Some(url),
        Err(e) => {
            tracing::error!(order_id, error = %e, "gagal membuat transaksi Midtrans; klien dapat mencoba lagi");
            None
        }
    };
    let order = fetch_order(&state.pool, order_id).await?;
    let detail = detail(&state.pool, order).await?;
    Ok((StatusCode::CREATED, Json(CheckoutResponse { order: detail, payment_url })))
}

async fn user_email(pool: &MySqlPool, user_id: u64) -> AppResult<String> {
    let (email,): (String,) = sqlx::query_as("SELECT email FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_one(pool)
        .await?;
    Ok(email)
}

/// Membuat transaksi Midtrans Snap untuk pesanan yang belum punya URL pembayaran.
/// order_id Midtrans = nomor invoice dengan '/' diganti '-' (Midtrans tidak menerima '/').
pub async fn create_invoice_for_order(
    state: &AppState,
    order: &OrderRow,
    email: &str,
    method: PaymentMethod,
) -> AppResult<String> {
    if let Some(url) = &order.payment_url {
        return Ok(url.clone());
    }
    if order.seconds_left <= 0 {
        return Err(AppError::BadRequest("pesanan sudah kedaluwarsa".into()));
    }

    let rows = sqlx::query_as::<_, (String, Decimal, u32)>(
        "SELECT product_name, line_subtotal - line_discount, qty FROM order_items WHERE order_id = ? ORDER BY id",
    )
    .bind(order.id)
    .fetch_all(&state.pool)
    .await?;

    // Harga item harus bilangan bulat dan jumlahnya sama dengan gross_amount.
    let mut items: Vec<SnapItem> = rows
        .into_iter()
        .enumerate()
        .map(|(i, (name, net, qty))| SnapItem {
            id: format!("ITEM-{}", i + 1),
            name: truncate(&format!("{name} x{qty}"), 50),
            price: net.trunc().to_i64().unwrap_or(0),
            qty: 1,
        })
        .collect();
    if order.shipping_fee > Decimal::ZERO {
        items.push(SnapItem {
            id: "SHIPPING".into(),
            name: "Ongkos kirim".into(),
            price: order.shipping_fee.trunc().to_i64().unwrap_or(0),
            qty: 1,
        });
    }

    let order_id = order.invoice_no.replace('/', "-");
    let req = SnapRequest {
        order_id: order_id.clone(),
        gross_amount: order.grand_total.trunc().to_i64().unwrap_or(0),
        items,
        customer_name: truncate(&order.buyer_name.clone().unwrap_or_else(|| "Pelanggan".into()), 50),
        customer_email: if crate::auth::is_valid_email(email) { Some(email.trim().to_string()) } else { None },
        finish_url: format!("{}/orders/{}", state.cfg.frontend_url, order.id),
        expiry_minutes: (order.seconds_left + 59) / 60,
        enabled_payments: method.enabled_payments(),
    };

    let snap = midtrans::create_snap(&state.http, &state.cfg, &req).await?;

    // Hanya simpan jika belum ada (pencegahan race dua permintaan bersamaan)
    let saved = sqlx::query(
        "UPDATE orders SET payment_ref = ?, payment_url = ? WHERE id = ? AND payment_ref IS NULL",
    )
    .bind(&order_id)
    .bind(&snap.redirect_url)
    .bind(order.id)
    .execute(&state.pool)
    .await?;
    if saved.rows_affected() == 0 {
        let current = fetch_order(&state.pool, order.id).await?;
        return current
            .payment_url
            .ok_or_else(|| AppError::Internal("URL pembayaran tidak tersimpan".into()));
    }
    Ok(snap.redirect_url)
}

fn truncate(text: &str, max: usize) -> String {
    text.chars().take(max).collect()
}

async fn list_orders(user: AuthUser, State(state): State<AppState>) -> AppResult<Json<Vec<OrderView>>> {
    let rows = sqlx::query_as::<_, OrderRow>(AssertSqlSafe(format!(
        "SELECT {ORDER_COLS} FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 100"
    )))
    .bind(user.id)
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(rows.into_iter().map(to_view).collect()))
}

async fn get_order(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> AppResult<Json<OrderDetail>> {
    let order = fetch_owned_order(&state.pool, id, &user).await?;
    Ok(Json(detail(&state.pool, order).await?))
}

#[derive(Debug, Serialize)]
pub struct PayResponse {
    pub payment_url: String,
}

async fn pay_order(
    user: AuthUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> AppResult<Json<PayResponse>> {
    let order = fetch_owned_order(&state.pool, id, &user).await?;
    if order.status != "pending_payment" || order.payment_status != "unpaid" {
        return Err(AppError::BadRequest("pesanan tidak menunggu pembayaran".into()));
    }
    let email = user_email(&state.pool, order.user_id).await?;
    let url = create_invoice_for_order(&state, &order, &email, PaymentMethod::All).await?;
    Ok(Json(PayResponse { payment_url: url }))
}

/// Membatalkan pesanan yang belum dibayar dan mengembalikan stok. Idempotent: mengembalikan false
/// jika pesanan sudah tidak lagi berstatus belum dibayar.
pub async fn cancel_unpaid_tx(tx: &mut Transaction<'_, MySql>, order_id: u64, reason: &str) -> AppResult<bool> {
    let done = sqlx::query(
        "UPDATE orders SET payment_status = 'expired', status = 'cancelled'
         WHERE id = ? AND payment_status = 'unpaid' AND status = 'pending_payment'",
    )
    .bind(order_id)
    .execute(&mut **tx)
    .await?;
    if done.rows_affected() == 0 {
        return Ok(false);
    }

    let items: Vec<(u64, u64, u32)> = sqlx::query_as("SELECT product_id, variant_id, qty FROM order_items WHERE order_id = ?")
        .bind(order_id)
        .fetch_all(&mut **tx)
        .await?;
    for (product_id, variant_id, qty) in items {
        adjust_stock_tx(tx, product_id, variant_id, qty, Adjust::Restore).await?;
        sqlx::query("INSERT INTO stock_movements (product_id, variant_id, order_id, change_qty, reason) VALUES (?, ?, ?, ?, ?)")
            .bind(product_id)
            .bind(variant_id)
            .bind(order_id)
            .bind(qty as i64)
            .bind(reason)
            .execute(&mut **tx)
            .await?;
    }
    Ok(true)
}

// ---------- Admin ----------

#[derive(Debug, Deserialize)]
pub struct AdminListQuery {
    pub status: Option<String>,
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

async fn admin_list_orders(
    _admin: AdminUser,
    State(state): State<AppState>,
    Query(q): Query<AdminListQuery>,
) -> AppResult<Json<Vec<OrderView>>> {
    let per_page = q.per_page.unwrap_or(50).clamp(1, 200) as i64;
    let page = q.page.unwrap_or(1).max(1) as i64;
    let mut builder = QueryBuilder::<MySql>::new(format!("SELECT {ORDER_COLS} FROM orders WHERE 1=1"));
    if let Some(status) = q.status.as_deref().filter(|s| !s.is_empty()) {
        builder.push(" AND status = ").push_bind(status.to_string());
    }
    builder
        .push(" ORDER BY id DESC LIMIT ")
        .push_bind(per_page)
        .push(" OFFSET ")
        .push_bind((page - 1) * per_page);
    let rows: Vec<OrderRow> = builder.build_query_as().fetch_all(&state.pool).await?;
    Ok(Json(rows.into_iter().map(to_view).collect()))
}

#[derive(Debug, Deserialize)]
pub struct StatusReq {
    pub status: String,
    pub tracking_number: Option<String>,
}

/// Alur fulfillment setelah pembayaran: paid → processing → shipped → completed.
fn allowed_transition(from: &str, to: &str) -> bool {
    matches!((from, to), ("paid", "processing") | ("processing", "shipped") | ("shipped", "completed"))
}

async fn admin_update_status(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<StatusReq>,
) -> AppResult<Json<OrderView>> {
    let order = fetch_order(&state.pool, id).await?;
    if !allowed_transition(&order.status, &req.status) {
        return Err(AppError::BadRequest(format!(
            "transisi status tidak diizinkan: {} → {}",
            order.status, req.status
        )));
    }
    if req.status == "shipped" {
        let resi = req.tracking_number.as_deref().map(str::trim).unwrap_or("");
        if resi.is_empty() || resi.len() > 64 {
            return Err(AppError::BadRequest("nomor resi wajib diisi (maks 64 karakter)".into()));
        }
        sqlx::query("UPDATE orders SET status = 'shipped', tracking_number = ?, shipped_at = UTC_TIMESTAMP() WHERE id = ? AND status = ?")
            .bind(resi)
            .bind(id)
            .bind(&order.status)
            .execute(&state.pool)
            .await?;
    } else {
        sqlx::query("UPDATE orders SET status = ? WHERE id = ? AND status = ?")
            .bind(&req.status)
            .bind(id)
            .bind(&order.status)
            .execute(&state.pool)
            .await?;
    }
    Ok(Json(to_view(fetch_order(&state.pool, id).await?)))
}

/// Dipakai oleh webhook & rekonsiliasi: tandai pesanan lunas.
/// `order_ref` = payment_ref (order_id Midtrans), `transaction_id` = id transaksi Midtrans.
pub async fn mark_paid_tx(
    tx: &mut Transaction<'_, MySql>,
    order_ref: &str,
    transaction_id: &str,
    paid_amount: Decimal,
    channel: Option<&str>,
    raw: &serde_json::Value,
) -> AppResult<&'static str> {
    let order: Option<(u64, String, String, Decimal, Option<String>)> = sqlx::query_as(
        "SELECT id, CAST(status AS CHAR), CAST(payment_status AS CHAR), grand_total, payment_ref
         FROM orders WHERE payment_ref = ? FOR UPDATE",
    )
    .bind(order_ref)
    .fetch_optional(&mut **tx)
    .await?;
    let Some((order_id, status, payment_status, grand_total, stored_ref)) = order else {
        return Err(AppError::NotFound(format!("pesanan {order_ref}")));
    };
    if stored_ref.as_deref() != Some(order_ref) {
        tracing::error!(order_ref, "referensi pembayaran tidak cocok dengan pesanan");
        return Ok("mismatch");
    }
    if payment_status == "paid" {
        return Ok("already_paid");
    }

    let already_recorded: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM payments WHERE external_ref = ?")
        .bind(transaction_id)
        .fetch_one(&mut **tx)
        .await?;
    if already_recorded.0 > 0 {
        return Ok("already_recorded");
    }

    if paid_amount != grand_total {
        tracing::error!(order_ref, %paid_amount, %grand_total, "nominal pembayaran tidak sama dengan total pesanan");
        return Ok("amount_mismatch");
    }

    if payment_status != "unpaid" || status != "pending_payment" {
        tracing::error!(order_ref, "pembayaran diterima untuk pesanan yang sudah dibatalkan; perlu refund manual");
        insert_payment(tx, order_id, transaction_id, paid_amount, channel, raw).await?;
        return Ok("paid_after_cancel");
    }

    sqlx::query(
        "UPDATE orders SET payment_status = 'paid', status = 'paid', paid_at = UTC_TIMESTAMP() WHERE id = ?",
    )
    .bind(order_id)
    .execute(&mut **tx)
    .await?;
    insert_payment(tx, order_id, transaction_id, paid_amount, channel, raw).await?;
    Ok("paid")
}

async fn insert_payment(
    tx: &mut Transaction<'_, MySql>,
    order_id: u64,
    transaction_id: &str,
    amount: Decimal,
    channel: Option<&str>,
    raw: &serde_json::Value,
) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO payments (order_id, provider, external_ref, payment_channel, amount, status, raw_payload)
         VALUES (?, 'midtrans', ?, ?, ?, 'settled', ?)",
    )
    .bind(order_id)
    .bind(transaction_id)
    .bind(channel)
    .bind(amount)
    .bind(raw.to_string())
    .execute(&mut **tx)
    .await?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct RefundReq {
    pub note: String,
}

/// Pembatalan pesanan yang sudah lunas tetapi belum dikirim. Uang dikembalikan MANUAL lewat dashboard
/// Midtrans; admin mencatat catatan refund di sini. Stok dikembalikan.
async fn admin_refund_cancel(
    _admin: AdminUser,
    State(state): State<AppState>,
    Path(id): Path<u64>,
    Json(req): Json<RefundReq>,
) -> AppResult<Json<OrderView>> {
    let note = req.note.trim().to_string();
    if note.len() < 5 || note.len() > 500 {
        return Err(AppError::BadRequest("catatan refund wajib diisi (5–500 karakter), misalnya nomor transfer".into()));
    }
    let mut tx = state.pool.begin().await?;
    let order: Option<(u64, String, String)> = sqlx::query_as(
        "SELECT id, CAST(status AS CHAR), CAST(payment_status AS CHAR) FROM orders WHERE id = ? FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?;
    let Some((order_id, status, payment_status)) = order else {
        return Err(AppError::NotFound(format!("pesanan {id}")));
    };
    if payment_status != "paid" || !matches!(status.as_str(), "paid" | "processing") {
        return Err(AppError::BadRequest(
            "hanya pesanan lunas yang belum dikirim yang bisa dibatalkan dengan refund".into(),
        ));
    }

    sqlx::query(
        "UPDATE orders SET status = 'cancelled', payment_status = 'refunded', cancelled_at = UTC_TIMESTAMP(), refund_note = ?
         WHERE id = ?",
    )
    .bind(&note)
    .bind(order_id)
    .execute(&mut *tx)
    .await?;

    let items: Vec<(u64, u64, u32)> = sqlx::query_as("SELECT product_id, variant_id, qty FROM order_items WHERE order_id = ?")
        .bind(order_id)
        .fetch_all(&mut *tx)
        .await?;
    for (product_id, variant_id, qty) in items {
        adjust_stock_tx(&mut tx, product_id, variant_id, qty, Adjust::Restore).await?;
        sqlx::query("INSERT INTO stock_movements (product_id, variant_id, order_id, change_qty, reason) VALUES (?, ?, ?, ?, 'refund_cancel')")
            .bind(product_id)
            .bind(variant_id)
            .bind(order_id)
            .bind(qty as i64)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    tracing::info!(order_id, "pesanan dibatalkan dengan refund manual");
    Ok(Json(to_view(fetch_order(&state.pool, order_id).await?)))
}

#[derive(Debug, Serialize, FromRow)]
pub struct RecentOrder {
    pub id: u64,
    pub invoice_no: String,
    pub buyer_name: Option<String>,
    pub status: String,
    pub payment_status: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub grand_total: Decimal,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct LowStock {
    pub id: u64,
    pub sku: String,
    pub name: String,
    pub stock: u32,
}

#[derive(Debug, Serialize)]
pub struct DayTotal {
    pub day: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub total: Decimal,
}

#[derive(Debug, Serialize)]
pub struct Dashboard {
    #[serde(with = "rust_decimal::serde::str")]
    pub revenue_total: Decimal,
    pub orders_to_ship: i64,
    pub orders_total: i64,
    pub active_products: i64,
    pub low_stock_count: i64,
    pub low_stock: Vec<LowStock>,
    pub sales_7d: Vec<DayTotal>,
    pub recent_orders: Vec<RecentOrder>,
}

/// Ringkasan untuk dashboard admin. Pendapatan hanya dari pesanan yang sudah dibayar (tidak termasuk refund).
async fn admin_dashboard(_admin: AdminUser, State(state): State<AppState>) -> AppResult<Json<Dashboard>> {
    let pool = &state.pool;
    let (revenue_total,): (Decimal,) = sqlx::query_as(
        "SELECT CAST(COALESCE(SUM(grand_total), 0) AS DECIMAL(15,2)) FROM orders WHERE payment_status = 'paid'",
    )
    .fetch_one(pool)
    .await?;
    let (orders_to_ship,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM orders WHERE status = 'paid'")
        .fetch_one(pool)
        .await?;
    let (orders_total,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM orders WHERE payment_status = 'paid'")
        .fetch_one(pool)
        .await?;
    let (active_products,): (i64,) = sqlx::query_as("SELECT COUNT(*) FROM products WHERE is_active = TRUE")
        .fetch_one(pool)
        .await?;
    let (low_stock_count,): (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM products WHERE is_active = TRUE AND stock <= 5",
    )
    .fetch_one(pool)
    .await?;
    let low_stock: Vec<LowStock> = sqlx::query_as(
        "SELECT id, sku, name, stock FROM products WHERE is_active = TRUE AND stock <= 5 ORDER BY stock ASC, id DESC LIMIT 5",
    )
    .fetch_all(pool)
    .await?;

    let daily: Vec<(String, Decimal)> = sqlx::query_as(
        "SELECT DATE_FORMAT(paid_at, '%Y-%m-%d'), CAST(SUM(grand_total) AS DECIMAL(15,2))
         FROM orders WHERE payment_status = 'paid' AND paid_at >= UTC_DATE() - INTERVAL 6 DAY
         GROUP BY DATE_FORMAT(paid_at, '%Y-%m-%d')",
    )
    .fetch_all(pool)
    .await?;
    // Isi hari tanpa penjualan dengan 0, urut dari 6 hari lalu sampai hari ini (UTC)
    let today = Utc::now().date_naive();
    let sales_7d = (0..7)
        .rev()
        .map(|back| {
            let day = (today - chrono::Duration::days(back)).format("%Y-%m-%d").to_string();
            let total = daily.iter().find(|(d, _)| *d == day).map(|(_, t)| *t).unwrap_or(Decimal::ZERO);
            DayTotal { day, total }
        })
        .collect();

    let recent_orders: Vec<RecentOrder> = sqlx::query_as(
        "SELECT id, invoice_no,
            (SELECT name FROM users WHERE users.id = orders.user_id) AS buyer_name,
            CAST(status AS CHAR) AS status, CAST(payment_status AS CHAR) AS payment_status,
            grand_total, created_at
         FROM orders ORDER BY id DESC LIMIT 6",
    )
    .fetch_all(pool)
    .await?;

    Ok(Json(Dashboard {
        revenue_total,
        orders_to_ship,
        orders_total,
        active_products,
        low_stock_count,
        low_stock,
        sales_7d,
        recent_orders,
    }))
}

/// Metode pembayaran yang dipilih pembeli di checkout. Dikirim ke Midtrans sebagai enabled_payments.
#[derive(Debug, Clone, Copy)]
pub enum PaymentMethod {
    All,
    BankTransfer,
    Qris,
    Ewallet,
}

impl PaymentMethod {
    pub fn parse(value: Option<&str>) -> AppResult<Self> {
        match value.unwrap_or("all") {
            "all" => Ok(Self::All),
            "bank_transfer" => Ok(Self::BankTransfer),
            "qris" => Ok(Self::Qris),
            "ewallet" => Ok(Self::Ewallet),
            _ => Err(AppError::BadRequest("metode pembayaran tidak dikenal".into())),
        }
    }

    pub fn enabled_payments(self) -> Option<Vec<String>> {
        match self {
            Self::All => None,
            Self::BankTransfer => Some(vec!["bank_transfer".into()]),
            Self::Qris => Some(vec!["qris".into()]),
            Self::Ewallet => Some(vec!["gopay".into(), "shopeepay".into()]),
        }
    }
}

/// Arah perubahan stok: Reserve = kurangi jika cukup (checkout), Restore = kembalikan.
#[derive(Debug, Clone, Copy)]
pub enum Adjust {
    Reserve,
    Restore,
}

/// Mengubah stok baris yang tepat: varian bila variant_id > 0, selain itu produk.
/// Mengembalikan false jika Reserve gagal karena stok tidak cukup.
pub async fn adjust_stock_tx(
    tx: &mut Transaction<'_, MySql>,
    product_id: u64,
    variant_id: u64,
    qty: u32,
    mode: Adjust,
) -> AppResult<bool> {
    let done = match (variant_id > 0, mode) {
        (true, Adjust::Reserve) => sqlx::query("UPDATE product_variants SET stock = stock - ? WHERE id = ? AND product_id = ? AND stock >= ?")
            .bind(qty)
            .bind(variant_id)
            .bind(product_id)
            .bind(qty)
            .execute(&mut **tx)
            .await?,
        (true, Adjust::Restore) => sqlx::query("UPDATE product_variants SET stock = stock + ? WHERE id = ?")
            .bind(qty)
            .bind(variant_id)
            .execute(&mut **tx)
            .await?,
        (false, Adjust::Reserve) => sqlx::query("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
            .bind(qty)
            .bind(product_id)
            .bind(qty)
            .execute(&mut **tx)
            .await?,
        (false, Adjust::Restore) => sqlx::query("UPDATE products SET stock = stock + ? WHERE id = ?")
            .bind(qty)
            .bind(product_id)
            .execute(&mut **tx)
            .await?,
    };
    Ok(done.rows_affected() > 0)
}
