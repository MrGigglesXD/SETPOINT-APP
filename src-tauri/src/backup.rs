use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use std::collections::HashMap;
use tauri::State;

use crate::error::{AppError, AppResult};
use crate::models::{now_iso, Player};
use crate::players::DbState;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MatchBackup {
    id: String,
    date: String,
    winner: Option<String>,
    blue_score: i64,
    red_score: i64,
    blue_sets: i64,
    red_sets: i64,
    sets_json: String,
    points_to_win: i64,
    duration_secs: i64,
    finished: i64,
    created_at: String,
    started_at: String,
    finished_at: String,
    match_type: String,
    win_by_two: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MatchPlayerBackup {
    id: String,
    match_id: String,
    player_id: String,
    team: String,
    player_name: String,
    elo_before: i64,
    elo_after: i64,
    result: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SettingBackup {
    key: String,
    value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct StatisticBackup {
    id: String,
    player_id: String,
    total_matches: i64,
    total_wins: i64,
    total_losses: i64,
    win_rate: f64,
    current_streak: i64,
    best_elo: i64,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupCounts {
    players: usize,
    levels: usize,
    matches: usize,
    statistics: usize,
    settings: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetpointBackup {
    format: String,
    version: u32,
    exported_at: String,
    counts: BackupCounts,
    players: Vec<Player>,
    matches: Vec<MatchBackup>,
    match_players: Vec<MatchPlayerBackup>,
    statistics: Vec<StatisticBackup>,
    settings: Vec<SettingBackup>,
}

#[derive(Debug, Clone, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ImportMode {
    Replace,
    Merge,
}

#[derive(Debug, Clone, Serialize)]
pub struct BackupImportResult {
    players: usize,
    matches: usize,
    statistics: usize,
    settings: usize,
}

#[tauri::command]
pub async fn export_backup(db: State<'_, DbState>) -> AppResult<SetpointBackup> {
    export_backup_from_pool(&db.0).await
}

async fn export_backup_from_pool(pool: &SqlitePool) -> AppResult<SetpointBackup> {
    let players: Vec<Player> = sqlx::query_as("SELECT * FROM players ORDER BY name COLLATE NOCASE")
        .fetch_all(pool)
        .await?;
    let matches: Vec<MatchBackup> = sqlx::query_as("SELECT * FROM matches ORDER BY date")
        .fetch_all(pool)
        .await?;
    let match_players: Vec<MatchPlayerBackup> = sqlx::query_as("SELECT * FROM match_players")
        .fetch_all(pool)
        .await?;
    let statistics: Vec<StatisticBackup> = sqlx::query_as("SELECT * FROM statistics")
        .fetch_all(pool)
        .await?;
    let settings: Vec<SettingBackup> = sqlx::query_as("SELECT * FROM settings ORDER BY key")
        .fetch_all(pool)
        .await?;
    let levels = players
        .iter()
        .map(|player| player.level)
        .collect::<std::collections::HashSet<_>>()
        .len();

    Ok(SetpointBackup {
        format: "setpoint-backup".into(),
        version: 1,
        exported_at: now_iso(),
        counts: BackupCounts {
            players: players.len(),
            levels,
            matches: matches.len(),
            statistics: statistics.len(),
            settings: settings.len(),
        },
        players,
        matches,
        match_players,
        statistics,
        settings,
    })
}

#[tauri::command]
pub async fn import_backup(
    db: State<'_, DbState>,
    backup: SetpointBackup,
    mode: ImportMode,
) -> AppResult<BackupImportResult> {
    import_backup_into_pool(&db.0, backup, mode).await
}

async fn import_backup_into_pool(
    pool: &SqlitePool,
    backup: SetpointBackup,
    mode: ImportMode,
) -> AppResult<BackupImportResult> {
    if backup.format != "setpoint-backup" || backup.version != 1 {
        return Err(AppError::Validation(
            "archivo de respaldo SETPOINT no válido".into(),
        ));
    }

    let counts = BackupImportResult {
        players: backup.players.len(),
        matches: backup.matches.len(),
        statistics: backup.statistics.len(),
        settings: backup.settings.len(),
    };
    let mut tx = pool.begin().await?;
    let mut player_ids = HashMap::<String, String>::new();

    if mode == ImportMode::Replace {
        sqlx::query("DELETE FROM statistics")
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM match_players")
            .execute(&mut *tx)
            .await?;
        sqlx::query("DELETE FROM matches").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM players").execute(&mut *tx).await?;
        sqlx::query("DELETE FROM settings")
            .execute(&mut *tx)
            .await?;
    }

    for p in backup.players {
        let source_id = p.id.clone();
        if mode == ImportMode::Merge {
            let existing = sqlx::query_scalar::<_, String>(
                "SELECT id FROM players WHERE id = ? OR name = ? COLLATE NOCASE LIMIT 1",
            )
            .bind(&p.id)
            .bind(&p.name)
            .fetch_optional(&mut *tx)
            .await?;
            if let Some(existing_id) = existing {
                player_ids.insert(source_id, existing_id);
                continue;
            }
        }
        player_ids.insert(source_id, p.id.clone());
        sqlx::query("INSERT OR IGNORE INTO players (id,name,level,elo,arrival_time,matches_played,wins,losses,status,court_since,last_match_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
            .bind(p.id).bind(p.name).bind(p.level).bind(p.elo).bind(p.arrival_time)
            .bind(p.matches_played).bind(p.wins).bind(p.losses).bind(p.status)
            .bind(p.court_since).bind(p.last_match_at).bind(p.created_at).bind(p.updated_at)
            .execute(&mut *tx).await?;
    }
    for m in backup.matches {
        sqlx::query("INSERT OR IGNORE INTO matches (id,date,winner,blue_score,red_score,blue_sets,red_sets,sets_json,points_to_win,duration_secs,finished,created_at,started_at,finished_at,match_type,win_by_two) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
            .bind(m.id).bind(m.date).bind(m.winner).bind(m.blue_score).bind(m.red_score)
            .bind(m.blue_sets).bind(m.red_sets).bind(m.sets_json).bind(m.points_to_win)
            .bind(m.duration_secs).bind(m.finished).bind(m.created_at).bind(m.started_at)
            .bind(m.finished_at).bind(m.match_type).bind(m.win_by_two)
            .execute(&mut *tx).await?;
    }
    for mp in backup.match_players {
        let player_id = player_ids
            .get(&mp.player_id)
            .cloned()
            .unwrap_or(mp.player_id);
        sqlx::query("INSERT OR IGNORE INTO match_players (id,match_id,player_id,team,player_name,elo_before,elo_after,result) VALUES (?,?,?,?,?,?,?,?)")
            .bind(mp.id).bind(mp.match_id).bind(player_id).bind(mp.team).bind(mp.player_name)
            .bind(mp.elo_before).bind(mp.elo_after).bind(mp.result)
            .execute(&mut *tx).await?;
    }
    for s in backup.statistics {
        let player_id = player_ids.get(&s.player_id).cloned().unwrap_or(s.player_id);
        sqlx::query("INSERT OR IGNORE INTO statistics (id,player_id,total_matches,total_wins,total_losses,win_rate,current_streak,best_elo,updated_at) VALUES (?,?,?,?,?,?,?,?,?)")
            .bind(s.id).bind(player_id).bind(s.total_matches).bind(s.total_wins).bind(s.total_losses)
            .bind(s.win_rate).bind(s.current_streak).bind(s.best_elo).bind(s.updated_at)
            .execute(&mut *tx).await?;
    }
    for setting in backup.settings {
        if mode == ImportMode::Merge && setting.key == "active_match" {
            continue;
        }
        sqlx::query("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
            .bind(setting.key).bind(setting.value).execute(&mut *tx).await?;
    }

    tx.commit().await?;
    Ok(counts)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    async fn test_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn backup_round_trip_replaces_all_data() {
        let source = test_pool().await;
        sqlx::query("INSERT INTO players (id,name,level,elo,arrival_time,matches_played,wins,losses,status,court_since,last_match_at,created_at,updated_at) VALUES ('p1','Ana',4,1200,'',3,2,1,'available','','','now','now')")
            .execute(&source)
            .await
            .unwrap();

        let backup = export_backup_from_pool(&source).await.unwrap();
        assert_eq!(backup.counts.players, 1);
        assert_eq!(backup.players[0].level, 4);

        let destination = test_pool().await;
        import_backup_into_pool(&destination, backup, ImportMode::Replace)
            .await
            .unwrap();

        let restored: (String, i64) =
            sqlx::query_as("SELECT name, level FROM players WHERE id = 'p1'")
                .fetch_one(&destination)
                .await
                .unwrap();
        assert_eq!(restored, ("Ana".into(), 4));
    }

    #[tokio::test]
    async fn merge_remaps_same_name_to_existing_player() {
        let source = test_pool().await;
        sqlx::query("INSERT INTO players (id,name,level,elo,arrival_time,matches_played,wins,losses,status,court_since,last_match_at,created_at,updated_at) VALUES ('source-id','Ana',4,1200,'',0,0,0,'available','','','now','now')")
            .execute(&source)
            .await
            .unwrap();
        let backup = export_backup_from_pool(&source).await.unwrap();

        let destination = test_pool().await;
        sqlx::query("INSERT INTO players (id,name,level,elo,arrival_time,matches_played,wins,losses,status,court_since,last_match_at,created_at,updated_at) VALUES ('existing-id','Ana',5,1300,'',0,0,0,'available','','','now','now')")
            .execute(&destination)
            .await
            .unwrap();
        import_backup_into_pool(&destination, backup, ImportMode::Merge)
            .await
            .unwrap();

        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM players WHERE name = 'Ana'")
            .fetch_one(&destination)
            .await
            .unwrap();
        assert_eq!(count, 1);
    }
}
