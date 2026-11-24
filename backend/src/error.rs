#![allow(dead_code)] // sebagian varian dipakai mulai Fase 2
use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("tidak ditemukan: {0}")]
    NotFound(String),
    #[error("permintaan tidak valid: {0}")]
    BadRequest(String),
    #[error("tidak terautentikasi")]
    Unauthorized,
    #[error("tidak punya akses")]
    Forbidden,
    #[error("database error")]
    Database(#[from] sqlx::Error),
    #[error("konflik: {0}")]
    Conflict(String),
    #[error("gagal menghubungi layanan pembayaran: {0}")]
    Gateway(String),
    #[error("internal error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::Database(e) => {
                tracing::error!(error = %e, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, "terjadi kesalahan server".into())
            }
            AppError::Conflict(_) => (StatusCode::CONFLICT, self.to_string()),
            AppError::Gateway(e) => {
                tracing::error!(error = %e, "gateway error");
                (StatusCode::BAD_GATEWAY, "layanan pembayaran sedang bermasalah".into())
            }
            AppError::Internal(e) => {
                tracing::error!(error = %e, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, "terjadi kesalahan server".into())
            }
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

pub type AppResult<T> = Result<T, AppError>;
