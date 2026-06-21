use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;

use crate::engines::NextMatchGenerator;
use crate::error::{AppError, AppResult};
use crate::models::{now_iso, Player};
use crate::players::DbState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BalancedTeamsResult {
    pub blue_player_ids: Vec<String>,
    pub red_player_ids: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TeamSide {
    Blue,
    Red,
    None,
}

pub async fn sync_queue_after_teams(
    pool: &SqlitePool,
    blue_ids: &[String],
    red_ids: &[String],
) -> AppResult<()> {
    let team: std::collections::HashSet<_> = blue_ids.iter().chain(red_ids.iter()).collect();
    let now = now_iso();

    let pool_players: Vec<(String, String)> =
        sqlx::query_as("SELECT id, status FROM players WHERE status IN ('available', 'waiting')")
            .fetch_all(pool)
            .await?;

    for (id, _) in pool_players {
        if team.contains(&id) {
            continue;
        }
        sqlx::query(
            "UPDATE players SET status = 'waiting', arrival_time = CASE WHEN arrival_time = '' THEN ?1 ELSE arrival_time END, updated_at = ?1 WHERE id = ?2",
        )
        .bind(&now)
        .bind(&id)
        .execute(pool)
        .await?;
    }
    Ok(())
}

pub async fn set_team_assignments(
    pool: &SqlitePool,
    blue_ids: &[String],
    red_ids: &[String],
    stamp_court: bool,
) -> AppResult<()> {
    let now = now_iso();
    let all: Vec<Player> = sqlx::query_as("SELECT * FROM players")
        .fetch_all(pool)
        .await?;

    for p in all {
        let (status, court) = if blue_ids.contains(&p.id) {
            (
                "blue",
                if stamp_court || p.court_since.is_empty() {
                    now.clone()
                } else {
                    p.court_since.clone()
                },
            )
        } else if red_ids.contains(&p.id) {
            (
                "red",
                if stamp_court || p.court_since.is_empty() {
                    now.clone()
                } else {
                    p.court_since.clone()
                },
            )
        } else if p.status == "blue" || p.status == "red" {
            if !p.arrival_time.is_empty() {
                ("waiting", String::new())
            } else {
                ("available", String::new())
            }
        } else {
            continue;
        };

        sqlx::query("UPDATE players SET status = ?, court_since = ?, updated_at = ? WHERE id = ?")
            .bind(status)
            .bind(&court)
            .bind(&now)
            .bind(&p.id)
            .execute(pool)
            .await?;
    }

    sync_queue_after_teams(pool, blue_ids, red_ids).await
}

pub fn balance_by_level(candidates: &[Player], team_size: i64) -> BalancedTeamsResult {
    let need = (team_size * 2) as usize;
    let pool: Vec<&Player> = candidates.iter().take(need).collect();

    // If there are not many candidates, fall back to greedy algorithm
    if pool.len() <= 1 {
        return BalancedTeamsResult {
            blue_player_ids: pool.iter().take(team_size as usize).map(|p| p.id.clone()).collect(),
            red_player_ids: pool.iter().skip(team_size as usize).map(|p| p.id.clone()).collect(),
        };
    }

    let total: i64 = pool.iter().map(|p| p.level).sum();
    let n = pool.len();

    // Exhaustive search over subsets (n <= 12 in normal usage) to find the team_size subset
    // whose sum is closest to total/2. This gives a near-optimal balance for small N.
    let mut best_mask: usize = 0;
    let mut best_diff: i64 = i64::MAX;

    let limit = 1usize << n;
    for mask in 0..limit {
        if mask.count_ones() as usize != team_size as usize {
            continue;
        }
        let mut sum = 0i64;
        for (i, p) in pool.iter().enumerate() {
            if (mask & (1 << i)) != 0 {
                sum += p.level;
            }
        }
        let diff = (total - 2 * sum).abs();
        if diff < best_diff {
            best_diff = diff;
            best_mask = mask;
        }
    }

    let mut blue: Vec<String> = Vec::new();
    let mut red: Vec<String> = Vec::new();
    for (i, p) in pool.iter().enumerate() {
        if (best_mask & (1 << i)) != 0 {
            blue.push(p.id.clone());
        } else {
            red.push(p.id.clone());
        }
    }

    BalancedTeamsResult { blue_player_ids: blue, red_player_ids: red }
}

#[tauri::command]
pub async fn generate_balanced_teams(
    db: State<'_, DbState>,
    team_size: i64,
) -> AppResult<BalancedTeamsResult> {
    if team_size != 4 && team_size != 6 {
        return Err(AppError::Validation("team_size must be 4 or 6".into()));
    }

    let candidates = NextMatchGenerator::new(&db.0)
        .next_players((team_size * 2) as usize)
        .await?;

    if candidates.len() < (team_size * 2) as usize {
        return Err(AppError::Validation(format!(
            "se necesitan al menos {} jugadores en el pool",
            team_size * 2
        )));
    }

    let result = balance_by_level(&candidates, team_size);
    set_team_assignments(
        &db.0,
        &result.blue_player_ids,
        &result.red_player_ids,
        false,
    )
    .await?;
    Ok(result)
}

#[tauri::command]
pub async fn assign_player_team(
    db: State<'_, DbState>,
    player_id: String,
    team: TeamSide,
) -> AppResult<Player> {
    let player = sqlx::query_as::<_, Player>("SELECT * FROM players WHERE id = ?")
        .bind(&player_id)
        .fetch_optional(&db.0)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("player {} not found", player_id)))?;

    let now = now_iso();
    let (status, court_since) = match team {
        TeamSide::Blue => ("blue", now.clone()),
        TeamSide::Red => ("red", now.clone()),
        TeamSide::None => {
            if !player.arrival_time.is_empty() {
                ("waiting", String::new())
            } else {
                ("available", String::new())
            }
        }
    };

    sqlx::query("UPDATE players SET status = ?, court_since = ?, updated_at = ? WHERE id = ?")
        .bind(status)
        .bind(&court_since)
        .bind(&now)
        .bind(&player_id)
        .execute(&db.0)
        .await?;

    sqlx::query_as::<_, Player>("SELECT * FROM players WHERE id = ?")
        .bind(&player_id)
        .fetch_one(&db.0)
        .await
        .map_err(AppError::from)
}
