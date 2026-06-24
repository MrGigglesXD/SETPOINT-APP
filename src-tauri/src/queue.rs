use chrono::{Duration, Utc};
use serde::Serialize;
use tauri::State;

use crate::engines::QueueManager;
use crate::error::AppResult;
use crate::models::{now_iso, Player};
use crate::players::DbState;

#[derive(Debug, Clone, Serialize)]
pub struct QueuePlayer {
    pub position: i64,
    pub id: String,
    pub name: String,
    pub level: i64,
    pub arrival_time: String,
    pub waiting_since: String,
    pub wait_minutes: i64,
    pub matches_played: i64,
    pub status: String,
    pub next_in: bool,
}

#[tauri::command]
pub async fn get_queue(db: State<'_, DbState>) -> AppResult<Vec<QueuePlayer>> {
    let players = QueueManager::new(&db.0).waiting_players().await?;

    let now = Utc::now();
    let queue = players
        .into_iter()
        .enumerate()
        .map(|(i, p)| {
            let base_time = if !p.waiting_since.is_empty() {
                &p.waiting_since
            } else {
                &p.arrival_time
            };
            let wait_minutes = if base_time.is_empty() {
                0
            } else {
                chrono::DateTime::parse_from_rfc3339(base_time)
                    .ok()
                    .map(|t| (now - t.with_timezone(&Utc)).num_minutes().max(0))
                    .unwrap_or(0)
            };
            QueuePlayer {
                position: i as i64 + 1,
                id: p.id,
                name: p.name,
                level: p.level,
                arrival_time: p.arrival_time,
                waiting_since: p.waiting_since,
                wait_minutes,
                matches_played: p.matches_played,
                status: p.status,
                next_in: i == 0,
            }
        })
        .collect();

    Ok(queue)
}

#[tauri::command]
pub async fn reset_arrival_order(db: State<'_, DbState>) -> AppResult<i64> {
    let players: Vec<Player> = sqlx::query_as(
        "SELECT * FROM players WHERE status IN ('waiting', 'available') ORDER BY queue_position ASC, waiting_since ASC, arrival_time ASC",
    )
    .fetch_all(&db.0)
    .await?;

    let base = Utc::now();
    let mut count = 0i64;
    let mut queue_position = 1i64;

    for (i, p) in players.iter().enumerate() {
        let ts = (base + Duration::seconds(i as i64)).to_rfc3339();
        sqlx::query(
            "UPDATE players SET arrival_time = ?, waiting_since = ?, queue_position = ?, status = 'waiting', updated_at = ? WHERE id = ?",
        )
        .bind(&ts)
        .bind(&ts)
        .bind(queue_position)
        .bind(now_iso())
        .bind(&p.id)
        .execute(&db.0)
        .await?;
        queue_position += 1;
        count += 1;
    }

    Ok(count)
}
