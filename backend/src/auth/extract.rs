use axum::{extract::FromRequestParts, http::request::Parts};

use super::token;
use crate::{error::AppError, state::AppState};

/// User yang sudah login (access token valid di header Authorization).
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: u64,
    pub role: String,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or(AppError::Unauthorized)?;
        let raw = header.strip_prefix("Bearer ").ok_or(AppError::Unauthorized)?;
        let claims = token::verify(&state.cfg.jwt_secret, raw, "access")?;
        let id = claims.sub.parse::<u64>().map_err(|_| AppError::Unauthorized)?;
        Ok(AuthUser { id, role: claims.role })
    }
}

/// Sama seperti AuthUser, tapi wajib role admin.
#[derive(Debug, Clone)]
pub struct AdminUser;

impl FromRequestParts<AppState> for AdminUser {
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, Self::Rejection> {
        let user = AuthUser::from_request_parts(parts, state).await?;
        if user.role != "admin" {
            return Err(AppError::Forbidden);
        }
        Ok(AdminUser)
    }
}
