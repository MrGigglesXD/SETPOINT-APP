use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use crate::error::{AppError, AppResult};

/// Resolve the path to the SQLite database file inside the app's
/// platform-appropriate data directory, creating the directory if needed.
pub fn resolve_db_path(app_data_dir: &Path) -> AppResult<PathBuf> {
    if !app_data_dir.exists() {
        std::fs::create_dir_all(app_data_dir)?;
    }
    Ok(app_data_dir.join("setpoint.db"))
}

/// Create the SQLite pool and run all pending migrations.
pub async fn init_pool(db_path: &Path) -> AppResult<SqlitePool> {
    let conn_str = format!("sqlite://{}", db_path.to_string_lossy());

    let options = SqliteConnectOptions::from_str(&conn_str)
        .map_err(AppError::Database)?
        .create_if_missing(true)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await
        .map_err(AppError::Database)?;

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .map_err(|e| AppError::Database(sqlx::Error::Migrate(Box::new(e))))?;

    Ok(pool)
}
