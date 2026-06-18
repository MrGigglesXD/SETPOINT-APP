//! Stable orchestration boundaries for queue, balancing, and rotation.

use sqlx::SqlitePool;

use crate::error::AppResult;
use crate::models::Player;

pub struct QueueManager<'a> {
    pool: &'a SqlitePool,
}

impl<'a> QueueManager<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn waiting_players(&self) -> AppResult<Vec<Player>> {
        Ok(sqlx::query_as(
            "SELECT * FROM players WHERE status = 'waiting' AND arrival_time != '' ORDER BY arrival_time ASC",
        )
        .fetch_all(self.pool)
        .await?)
    }
}

pub struct RotationEngine<'a> {
    pool: &'a SqlitePool,
}

impl<'a> RotationEngine<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self { pool }
    }

    pub fn pool(&self) -> &'a SqlitePool {
        self.pool
    }
}

pub struct NextMatchGenerator<'a> {
    queue: QueueManager<'a>,
}

impl<'a> NextMatchGenerator<'a> {
    pub fn new(pool: &'a SqlitePool) -> Self {
        Self {
            queue: QueueManager::new(pool),
        }
    }

    pub async fn candidates(&self) -> AppResult<Vec<Player>> {
        self.queue.waiting_players().await
    }

    pub async fn next_players(&self, count: usize) -> AppResult<Vec<Player>> {
        Ok(self.candidates().await?.into_iter().take(count).collect())
    }
}
