use chrono::{Duration, Utc};
use sqlx::SqlitePool;

use crate::engines::{NextMatchGenerator, RotationEngine};
use crate::error::AppResult;
use crate::models::{now_iso, Player};
use crate::teams::{set_team_assignments, BalancedTeamsResult};

pub async fn apply_post_match_rotation(
    pool: &SqlitePool,
    winner: &str,
    blue_ids: &[String],
    red_ids: &[String],
    team_size: i64,
) -> AppResult<BalancedTeamsResult> {
    let engine = RotationEngine::new(pool);
    let pool = engine.pool();
    let (winner_ids, loser_ids, winner_side) = if winner == "blue" {
        (blue_ids.to_vec(), red_ids.to_vec(), "blue")
    } else {
        (red_ids.to_vec(), blue_ids.to_vec(), "red")
    };

    let loser_players = fetch_ids(pool, &loser_ids).await?;

    let max_position = sqlx::query_scalar::<_, Option<i64>>("
        SELECT MAX(queue_position) FROM players WHERE status = 'waiting'
    ")
    .fetch_one(pool)
    .await?;
    let mut queue_position = max_position.unwrap_or(0) + 1;

    let now = Utc::now();
    let base = now;

    for (i, lp) in loser_players.iter().enumerate() {
        let ts = (base + Duration::seconds(i as i64 + 1)).to_rfc3339();
        sqlx::query(
            "UPDATE players SET status = 'waiting', arrival_time = ?, waiting_since = ?, queue_position = ?, court_since = '', updated_at = ? WHERE id = ?",
        )
        .bind(&ts)
        .bind(&ts)
        .bind(queue_position)
        .bind(now_iso())
        .bind(&lp.id)
        .execute(pool)
        .await?;
        queue_position += 1;
    }

    let fresh_queue = NextMatchGenerator::new(pool).candidates().await?;
    let staying = winner_ids;
    let new_opponent: Vec<String> = fresh_queue
        .iter()
        .filter(|p| !staying.contains(&p.id))
        .take(team_size as usize)
        .map(|p| p.id.clone())
        .collect();

    let (new_blue, new_red) = if winner_side == "blue" {
        (staying.clone(), new_opponent.clone())
    } else {
        (new_opponent.clone(), staying.clone())
    };

    set_team_assignments(pool, &new_blue, &new_red, true).await?;

    Ok(BalancedTeamsResult {
        blue_player_ids: new_blue,
        red_player_ids: new_red,
    })
}
async fn fetch_ids(pool: &SqlitePool, ids: &[String]) -> AppResult<Vec<Player>> {
    let mut out = Vec::new();
    for id in ids {
        if let Some(p) = sqlx::query_as::<_, Player>("SELECT * FROM players WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?
        {
            out.push(p);
        }
    }
    Ok(out)
}
