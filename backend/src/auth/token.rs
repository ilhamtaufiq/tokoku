use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

pub const ACCESS_TTL_MINUTES: i64 = 15;
pub const REFRESH_TTL_DAYS: i64 = 7;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  // user id
    pub role: String, // customer | admin
    pub typ: String, // access | refresh
    pub exp: i64,
}

pub fn issue(secret: &str, user_id: u64, role: &str, typ: &str) -> AppResult<String> {
    let ttl = if typ == "access" {
        Duration::minutes(ACCESS_TTL_MINUTES)
    } else {
        Duration::days(REFRESH_TTL_DAYS)
    };
    let claims = Claims {
        sub: user_id.to_string(),
        role: role.to_string(),
        typ: typ.to_string(),
        exp: (Utc::now() + ttl).timestamp(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))
        .map_err(|e| AppError::Internal(e.to_string()))
}

pub fn verify(secret: &str, token: &str, expected_typ: &str) -> AppResult<Claims> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| AppError::Unauthorized)?;
    if data.claims.typ != expected_typ {
        return Err(AppError::Unauthorized);
    }
    Ok(data.claims)
}
