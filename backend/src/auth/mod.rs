pub mod extract;
pub mod password;
pub mod token;

use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::{
    error::{AppError, AppResult},
    state::AppState,
};
pub use extract::{AdminUser, AuthUser};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/me", get(me).put(update_profile))
        .route("/password", put(change_password))
}

#[derive(Debug, Deserialize)]
pub struct ProfileReq {
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct PasswordReq {
    pub current_password: String,
    pub new_password: String,
}

/// Ubah nama tampilan pengguna yang sedang login.
async fn update_profile(
    user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<ProfileReq>,
) -> AppResult<Json<UserView>> {
    let name = req.name.trim();
    if name.is_empty() || name.chars().count() > 120 {
        return Err(AppError::BadRequest("nama wajib diisi (maks 120 karakter)".into()));
    }
    sqlx::query("UPDATE users SET name = ? WHERE id = ?")
        .bind(name)
        .bind(user.id)
        .execute(&state.pool)
        .await?;
    me(State(state), user).await
}

/// Ganti password: wajib memasukkan password saat ini. Semua sesi lain tetap berlaku sampai kedaluwarsa.
async fn change_password(
    user: AuthUser,
    State(state): State<AppState>,
    Json(req): Json<PasswordReq>,
) -> AppResult<StatusCode> {
    if req.new_password.len() < 8 {
        return Err(AppError::BadRequest("password baru minimal 8 karakter".into()));
    }
    let (hash,): (String,) = sqlx::query_as("SELECT password_hash FROM users WHERE id = ?")
        .bind(user.id)
        .fetch_one(&state.pool)
        .await?;
    if !password::verify(&req.current_password, &hash) {
        return Err(AppError::BadRequest("password saat ini salah".into()));
    }
    let new_hash = password::hash(&req.new_password)?;
    sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
        .bind(new_hash)
        .bind(user.id)
        .execute(&state.pool)
        .await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct RegisterReq {
    pub email: String,
    pub password: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginReq {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, FromRow)]
pub struct UserView {
    pub id: u64,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[derive(Debug, FromRow)]
struct UserRow {
    id: u64,
    email: String,
    name: String,
    role: String,
    password_hash: String,
    is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: &'static str,
    pub expires_in: i64,
    pub user: UserView,
}

fn refresh_cookie(value: &str, secure: bool, max_age: i64) -> String {
    format!(
        "refresh_token={value}; HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age={max_age}{}",
        if secure { "; Secure" } else { "" }
    )
}

fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

/// Pemeriksaan format email sederhana: satu '@', bagian lokal dan domain terisi, domain punya titik.
pub fn is_valid_email(email: &str) -> bool {
    let email = email.trim();
    if email.len() > 190 || email.contains(char::is_whitespace) {
        return false;
    }
    let Some((local, domain)) = email.split_once('@') else { return false };
    !local.is_empty()
        && !domain.contains('@')
        && domain.contains('.')
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && !domain.contains("..")
        && domain.split('.').all(|label| !label.is_empty())
}

fn validate_register(req: &RegisterReq) -> AppResult<()> {
    if !is_valid_email(&req.email) {
        return Err(AppError::BadRequest("format email tidak valid".into()));
    }
    if req.password.len() < 8 {
        return Err(AppError::BadRequest("password minimal 8 karakter".into()));
    }
    if req.name.trim().is_empty() || req.name.len() > 120 {
        return Err(AppError::BadRequest("nama wajib diisi (maks 120 karakter)".into()));
    }
    Ok(())
}

/// Membuat response login: access token di body, refresh token di cookie HttpOnly.
fn session_response(state: &AppState, user: &UserRow, status: StatusCode) -> AppResult<Response> {
    let access = token::issue(&state.cfg.jwt_secret, user.id, &user.role, "access")?;
    let refresh = token::issue(&state.cfg.jwt_secret, user.id, &user.role, "refresh")?;
    let max_age = token::REFRESH_TTL_DAYS * 24 * 3600;
    let body = TokenResponse {
        access_token: access,
        token_type: "Bearer",
        expires_in: token::ACCESS_TTL_MINUTES * 60,
        user: UserView {
            id: user.id,
            email: user.email.clone(),
            name: user.name.clone(),
            role: user.role.clone(),
        },
    };
    let cookie = refresh_cookie(&refresh, state.cfg.cookie_secure, max_age);
    Ok((status, [(header::SET_COOKIE, cookie)], Json(body)).into_response())
}

async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterReq>,
) -> AppResult<Response> {
    validate_register(&req)?;
    let email = normalize_email(&req.email);
    let hash = password::hash(&req.password)?;

    let result = sqlx::query("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
        .bind(&email)
        .bind(&hash)
        .bind(req.name.trim())
        .execute(&state.pool)
        .await;

    match result {
        Ok(done) => {
            let row = UserRow {
                id: done.last_insert_id(),
                email,
                name: req.name.trim().to_string(),
                role: "customer".into(),
                password_hash: hash,
                is_active: true,
            };
            session_response(&state, &row, StatusCode::CREATED)
        }
        Err(sqlx::Error::Database(e)) if e.is_unique_violation() => {
            Err(AppError::BadRequest("email sudah terdaftar".into()))
        }
        Err(e) => Err(e.into()),
    }
}

async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginReq>,
) -> AppResult<Response> {
    let email = normalize_email(&req.email);
    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, name, CAST(role AS CHAR) AS role, password_hash, is_active FROM users WHERE email = ?",
    )
    .bind(&email)
    .fetch_optional(&state.pool)
    .await?
    // pesan sama untuk email salah dan password salah (tidak membocorkan keberadaan akun)
    .ok_or(AppError::Unauthorized)?;

    if !password::verify(&req.password, &user.password_hash) {
        return Err(AppError::Unauthorized);
    }
    if !user.is_active {
        return Err(AppError::BadRequest("akun ini dinonaktifkan. Hubungi admin.".into()));
    }
    session_response(&state, &user, StatusCode::OK)
}

async fn refresh(State(state): State<AppState>, headers: HeaderMap) -> AppResult<Response> {
    let cookie = headers
        .get(header::COOKIE)
        .and_then(|v| v.to_str().ok())
        .and_then(|c| {
            c.split(';')
                .map(str::trim)
                .find_map(|kv| kv.strip_prefix("refresh_token="))
        })
        .ok_or(AppError::Unauthorized)?;

    let claims = token::verify(&state.cfg.jwt_secret, cookie, "refresh")?;
    let id: u64 = claims.sub.parse().map_err(|_| AppError::Unauthorized)?;

    // Ambil ulang dari DB: user yang sudah dihapus tidak bisa refresh lagi
    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, email, name, CAST(role AS CHAR) AS role, password_hash, is_active FROM users WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;
    if !user.is_active {
        return Err(AppError::Unauthorized);
    }

    session_response(&state, &user, StatusCode::OK)
}

async fn logout(State(state): State<AppState>) -> impl IntoResponse {
    let cookie = refresh_cookie("", state.cfg.cookie_secure, 0);
    (StatusCode::NO_CONTENT, [(header::SET_COOKIE, cookie)])
}

async fn me(State(state): State<AppState>, user: AuthUser) -> AppResult<Json<UserView>> {
    let view = sqlx::query_as::<_, UserView>(
        "SELECT id, email, name, CAST(role AS CHAR) AS role FROM users WHERE id = ?",
    )
    .bind(user.id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or(AppError::Unauthorized)?;
    Ok(Json(view))
}

/// Dipanggil dari CLI: `toko_backend create-admin <email> <nama> <password>`
pub async fn create_admin(pool: &sqlx::MySqlPool, email: &str, name: &str, password: &str) -> anyhow::Result<()> {
    if password.len() < 8 {
        anyhow::bail!("password minimal 8 karakter");
    }
    let hash = password::hash(password).map_err(|e| anyhow::anyhow!("{e}"))?;
    sqlx::query("INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, 'admin')")
        .bind(normalize_email(email))
        .bind(hash)
        .bind(name.trim())
        .execute(pool)
        .await?;
    println!("admin dibuat: {}", normalize_email(email));
    Ok(())
}

#[cfg(test)]
mod email_tests {
    use super::is_valid_email;

    #[test]
    fn email_valid_dan_tidak_valid() {
        assert!(is_valid_email("budi@example.com"));
        assert!(is_valid_email("nadia.k@toko.co.id"));
        assert!(!is_valid_email("budi"));
        assert!(!is_valid_email("budi@"));
        assert!(!is_valid_email("@example.com"));
        assert!(!is_valid_email("budi@example"));
        assert!(!is_valid_email("budi@.com"));
        assert!(!is_valid_email("budi@example..com"));
        assert!(!is_valid_email("bu di@example.com"));
        assert!(!is_valid_email("a@b@c.com"));
    }
}
