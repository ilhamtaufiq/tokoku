use anyhow::Result;
use sqlx::{mysql::MySqlPoolOptions, MySqlPool};

pub async fn connect(database_url: &str) -> Result<MySqlPool> {
    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;
    Ok(pool)
}

pub async fn migrate(pool: &MySqlPool) -> Result<()> {
    sqlx::migrate!("./migrations").run(pool).await?;
    Ok(())
}
