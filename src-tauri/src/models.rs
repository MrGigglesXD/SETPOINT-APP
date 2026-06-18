use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Player {
    pub id: String,
    pub name: String,
    pub level: i64,
    pub elo: i64,
    /// stored as RFC3339 string in SQLite, exposed as ISO string to frontend
    pub arrival_time: String,
    pub matches_played: i64,
    pub wins: i64,
    pub losses: i64,
    pub status: String,
    pub court_since: String,
    pub last_match_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewPlayer {
    pub name: String,
    pub level: i64,
    /// if true, arrival_time is set to now; otherwise null/available
    pub mark_arrived: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePlayer {
    pub id: String,
    pub name: String,
    pub level: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportPlayerRow {
    pub name: String,
    pub level: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DuplicatePlayerPayload {
    pub id: String,
}

/// Returns current UTC time as RFC3339 string, used for arrival_time / timestamps.
pub fn now_iso() -> String {
    Utc::now().to_rfc3339()
}

#[allow(dead_code)]
pub fn parse_iso(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|d| d.with_timezone(&Utc))
}
