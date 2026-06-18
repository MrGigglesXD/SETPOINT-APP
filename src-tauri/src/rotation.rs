use chrono::{Duration, Utc};
use sqlx::SqlitePool;

use crate::engines::RotationEngine;
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

    let winner_players = fetch_ids(pool, &winner_ids).await?;
    let loser_players = fetch_ids(pool, &loser_ids).await?;

    let rotated_out = winner_players
        .iter()
        .max_by(|a, b| a.court_since.cmp(&b.court_since))
        .map(|p| p.id.clone())
        .unwrap_or_else(|| winner_ids[0].clone());

    let mut staying: Vec<String> = winner_ids
        .iter()
        .filter(|id| *id != &rotated_out)
        .cloned()
        .collect();

    let queue: Vec<Player> = sqlx::query_as(
        "SELECT * FROM players WHERE status = 'waiting' AND arrival_time != '' ORDER BY arrival_time ASC",
    )
    .fetch_all(pool)
    .await?;

    let team_set: std::collections::HashSet<_> =
        blue_ids.iter().chain(red_ids.iter()).cloned().collect();

    let mut queue_ids: Vec<String> = queue
        .iter()
        .filter(|p| !team_set.contains(&p.id))
        .map(|p| p.id.clone())
        .collect();

    let now = Utc::now();
    let mut offset = queue_ids.len() as i64;

    for lp in &loser_players {
        if !queue_ids.contains(&lp.id) {
            let ts = (now + Duration::seconds(offset)).to_rfc3339();
            sqlx::query(
                "UPDATE players SET status = 'waiting', arrival_time = ?, court_since = '', updated_at = ? WHERE id = ?",
            )
            .bind(&ts)
            .bind(now_iso())
            .bind(&lp.id)
            .execute(pool)
            .await?;
            queue_ids.push(lp.id.clone());
            offset += 1;
        }
    }

    let ts_rot = (now + Duration::seconds(offset)).to_rfc3339();
    sqlx::query(
        "UPDATE players SET status = 'waiting', arrival_time = ?, court_since = '', updated_at = ? WHERE id = ?",
    )
    .bind(&ts_rot)
    .bind(now_iso())
    .bind(&rotated_out)
    .execute(pool)
    .await?;
    queue_ids.push(rotated_out);

    let fresh_queue: Vec<Player> = sqlx::query_as(
        "SELECT * FROM players WHERE status = 'waiting' AND arrival_time != '' ORDER BY arrival_time ASC",
    )
    .fetch_all(pool)
    .await?;

    let mut incoming: Vec<String> = fresh_queue
        .iter()
        .filter(|p| !staying.contains(&p.id))
        .take(1)
        .map(|p| p.id.clone())
        .collect();

    staying.append(&mut incoming);

    let need_loser = team_size as usize;
    let new_opponent: Vec<String> = fresh_queue
        .iter()
        .filter(|p| !staying.contains(&p.id))
        .take(need_loser)
        .map(|p| p.id.clone())
        .collect();

    while staying.len() < team_size as usize {
        if let Some(id) = fresh_queue
            .iter()
            .find(|p| !staying.contains(&p.id) && !new_opponent.contains(&p.id))
            .map(|p| p.id.clone())
        {
            staying.push(id);
        } else {
            break;
        }
    }

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
