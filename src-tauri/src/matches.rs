use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tauri::State;
use uuid::Uuid;

use crate::engines::NextMatchGenerator;
use crate::error::{AppError, AppResult};
use crate::models::{now_iso, parse_iso, Player};
use crate::players::DbState;
use crate::rotation::apply_post_match_rotation;
use crate::teams::set_team_assignments;

const ACTIVE_MATCH_KEY: &str = "active_match";
const LAST_WINNER_SIDE_KEY: &str = "last_winner_side";

// ════════════════════════════════════════════════════════
// MODELS
// ════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MatchPhase {
    Setup,
    Live,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum MatchType {
    #[default]
    Exhibition,
    BestOf3,
    BestOf5,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SetScore {
    pub blue: i64,
    pub red: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreSnapshot {
    pub blue_score: i64,
    pub red_score: i64,
    #[serde(default)]
    pub blue_sets: i64,
    #[serde(default)]
    pub red_sets: i64,
    #[serde(default = "default_one")]
    pub current_set: i64,
    #[serde(default)]
    pub completed_sets: Vec<SetScore>,
}

fn default_one() -> i64 {
    1
}

fn default_target_score() -> i64 {
    21
}

fn default_win_by_two() -> bool {
    true
}

fn default_team_size() -> i64 {
    4
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveMatch {
    pub match_id: String,
    pub phase: MatchPhase,
    pub blue_player_ids: Vec<String>,
    pub red_player_ids: Vec<String>,
    #[serde(default)]
    pub match_type: MatchType,
    #[serde(default = "default_target_score")]
    pub target_score: i64,
    #[serde(default = "default_win_by_two")]
    pub win_by_two: bool,
    #[serde(default = "default_team_size")]
    pub team_size: i64,
    pub blue_score: i64,
    pub red_score: i64,
    #[serde(default)]
    pub blue_sets: i64,
    #[serde(default)]
    pub red_sets: i64,
    #[serde(default = "default_one")]
    pub current_set: i64,
    #[serde(default)]
    pub completed_sets: Vec<SetScore>,
    pub started_at: String,
    pub undo_stack: Vec<ScoreSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum MatchEvent {
    SetCompleted {
        winner: String,
        set_number: i64,
        blue_score: i64,
        red_score: i64,
    },
    MatchCompleted {
        winner: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveMatchResponse {
    pub active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub match_data: Option<ActiveMatch>,
    pub blue_players: Vec<Player>,
    pub red_players: Vec<Player>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub event: Option<MatchEvent>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SetupTeamsPayload {
    pub blue_player_ids: Vec<String>,
    pub red_player_ids: Vec<String>,
    pub match_type: MatchType,
    pub target_score: i64,
    pub win_by_two: bool,
    pub team_size: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScoreAction {
    BluePlus,
    BlueMinus,
    RedPlus,
    RedMinus,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MatchWinner {
    Blue,
    Red,
}

#[derive(Debug, Clone, Serialize)]
pub struct MatchHistoryItem {
    pub id: String,
    pub date: String,
    pub started_at: String,
    pub finished_at: String,
    pub duration_secs: i64,
    pub match_type: String,
    pub target_score: i64,
    pub win_by_two: bool,
    pub blue_score: i64,
    pub red_score: i64,
    pub blue_sets: i64,
    pub red_sets: i64,
    pub sets: Vec<SetScore>,
    pub winner: Option<String>,
    pub blue_players: Vec<String>,
    pub red_players: Vec<String>,
}

#[derive(sqlx::FromRow)]
struct MatchHistoryRow {
    id: String,
    date: String,
    started_at: String,
    finished_at: String,
    duration_secs: i64,
    match_type: String,
    win_by_two: i64,
    blue_score: i64,
    red_score: i64,
    blue_sets: i64,
    red_sets: i64,
    points_to_win: i64,
    sets_json: String,
    winner: Option<String>,
}

// ════════════════════════════════════════════════════════
// SETTINGS HELPERS
// ════════════════════════════════════════════════════════

async fn get_setting(pool: &SqlitePool, key: &str) -> AppResult<Option<String>> {
    let row = sqlx::query_scalar::<_, String>("SELECT value FROM settings WHERE key = ?")
        .bind(key)
        .fetch_optional(pool)
        .await?;
    Ok(row)
}

async fn set_setting(pool: &SqlitePool, key: &str, value: &str) -> AppResult<()> {
    sqlx::query(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

async fn delete_setting(pool: &SqlitePool, key: &str) -> AppResult<()> {
    sqlx::query("DELETE FROM settings WHERE key = ?")
        .bind(key)
        .execute(pool)
        .await?;
    Ok(())
}

async fn load_active_match(pool: &SqlitePool) -> AppResult<Option<ActiveMatch>> {
    let Some(raw) = get_setting(pool, ACTIVE_MATCH_KEY).await? else {
        return Ok(None);
    };
    if raw.is_empty() {
        return Ok(None);
    }
    let parsed: ActiveMatch = serde_json::from_str(&raw)?;
    Ok(Some(parsed))
}

async fn save_active_match(pool: &SqlitePool, active: &ActiveMatch) -> AppResult<()> {
    let json = serde_json::to_string(active)?;
    set_setting(pool, ACTIVE_MATCH_KEY, &json).await
}

async fn clear_active_match(pool: &SqlitePool) -> AppResult<()> {
    delete_setting(pool, ACTIVE_MATCH_KEY).await
}

async fn fetch_players_by_ids(pool: &SqlitePool, ids: &[String]) -> AppResult<Vec<Player>> {
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let mut players = Vec::with_capacity(ids.len());
    for id in ids {
        let player = sqlx::query_as::<_, Player>("SELECT * FROM players WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?
            .ok_or_else(|| AppError::NotFound(format!("player {} not found", id)))?;
        players.push(player);
    }
    Ok(players)
}

fn validate_team_setup(blue_ids: &[String], red_ids: &[String]) -> AppResult<()> {
    if blue_ids.is_empty() {
        return Err(AppError::Validation(
            "blue team must have at least one player".into(),
        ));
    }
    if red_ids.is_empty() {
        return Err(AppError::Validation(
            "red team must have at least one player".into(),
        ));
    }
    let blue_set: std::collections::HashSet<_> = blue_ids.iter().collect();
    for id in red_ids {
        if blue_set.contains(id) {
            return Err(AppError::Validation(
                "a player cannot be on both teams".into(),
            ));
        }
    }
    Ok(())
}

fn validate_format(match_type: &MatchType, target_score: i64) -> AppResult<()> {
    if *match_type == MatchType::Exhibition && ![16, 21, 25].contains(&target_score) {
        return Err(AppError::Validation(
            "exhibition target score must be 16, 21, or 25".into(),
        ));
    }
    Ok(())
}

fn set_target(active: &ActiveMatch) -> i64 {
    match active.match_type {
        MatchType::Exhibition => active.target_score,
        MatchType::BestOf3 | MatchType::BestOf5 => {
            let decider = match active.match_type {
                MatchType::BestOf3 => 3,
                MatchType::BestOf5 => 5,
                _ => 3,
            };
            if active.current_set >= decider {
                15
            } else {
                25
            }
        }
    }
}

fn sets_to_win(match_type: &MatchType) -> i64 {
    match match_type {
        MatchType::Exhibition => 1,
        MatchType::BestOf3 => 2,
        MatchType::BestOf5 => 3,
    }
}

fn match_type_str(match_type: &MatchType) -> &'static str {
    match match_type {
        MatchType::Exhibition => "exhibition",
        MatchType::BestOf3 => "best_of_3",
        MatchType::BestOf5 => "best_of_5",
    }
}

fn check_set_winner(blue: i64, red: i64, target: i64, win_by_two: bool) -> Option<&'static str> {
    if win_by_two {
        if blue >= target && blue >= red + 2 {
            Some("blue")
        } else if red >= target && red >= blue + 2 {
            Some("red")
        } else {
            None
        }
    } else if blue >= target && blue > red {
        Some("blue")
    } else if red >= target && red > blue {
        Some("red")
    } else {
        None
    }
}

fn snapshot_from(active: &ActiveMatch) -> ScoreSnapshot {
    ScoreSnapshot {
        blue_score: active.blue_score,
        red_score: active.red_score,
        blue_sets: active.blue_sets,
        red_sets: active.red_sets,
        current_set: active.current_set,
        completed_sets: active.completed_sets.clone(),
    }
}

fn restore_snapshot(active: &mut ActiveMatch, snap: ScoreSnapshot) {
    active.blue_score = snap.blue_score;
    active.red_score = snap.red_score;
    active.blue_sets = snap.blue_sets;
    active.red_sets = snap.red_sets;
    active.current_set = snap.current_set;
    active.completed_sets = snap.completed_sets;
}

async fn build_active_response(
    pool: &SqlitePool,
    event: Option<MatchEvent>,
) -> AppResult<ActiveMatchResponse> {
    let active = load_active_match(pool).await?;
    match active {
        None => Ok(ActiveMatchResponse {
            active: false,
            match_data: None,
            blue_players: vec![],
            red_players: vec![],
            event,
        }),
        Some(m) => {
            let blue_players = fetch_players_by_ids(pool, &m.blue_player_ids).await?;
            let red_players = fetch_players_by_ids(pool, &m.red_player_ids).await?;
            Ok(ActiveMatchResponse {
                active: true,
                match_data: Some(m),
                blue_players,
                red_players,
                event,
            })
        }
    }
}

// ════════════════════════════════════════════════════════
// COMMANDS
// ════════════════════════════════════════════════════════

#[tauri::command]
pub async fn get_active_match(db: State<'_, DbState>) -> AppResult<ActiveMatchResponse> {
    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn setup_match_teams(
    db: State<'_, DbState>,
    payload: SetupTeamsPayload,
) -> AppResult<ActiveMatchResponse> {
    validate_team_setup(&payload.blue_player_ids, &payload.red_player_ids)?;
    validate_format(&payload.match_type, payload.target_score)?;
    if payload.team_size != 4 && payload.team_size != 6 {
        return Err(AppError::Validation("team_size must be 4 or 6".into()));
    }

    fetch_players_by_ids(&db.0, &payload.blue_player_ids).await?;
    fetch_players_by_ids(&db.0, &payload.red_player_ids).await?;

    set_team_assignments(
        &db.0,
        &payload.blue_player_ids,
        &payload.red_player_ids,
        false,
    )
    .await?;

    let existing = load_active_match(&db.0).await?;
    let match_id = existing
        .as_ref()
        .map(|m| m.match_id.clone())
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let active = ActiveMatch {
        match_id,
        phase: MatchPhase::Setup,
        blue_player_ids: payload.blue_player_ids,
        red_player_ids: payload.red_player_ids,
        match_type: payload.match_type,
        target_score: payload.target_score,
        win_by_two: payload.win_by_two,
        team_size: payload.team_size,
        blue_score: 0,
        red_score: 0,
        blue_sets: 0,
        red_sets: 0,
        current_set: 1,
        completed_sets: vec![],
        started_at: String::new(),
        undo_stack: vec![],
    };

    save_active_match(&db.0, &active).await?;
    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn start_match(db: State<'_, DbState>) -> AppResult<ActiveMatchResponse> {
    let mut active = load_active_match(&db.0)
        .await?
        .ok_or_else(|| AppError::Validation("no match setup — select teams first".into()))?;

    if matches!(active.phase, MatchPhase::Live) {
        return Err(AppError::Validation("match is already live".into()));
    }

    validate_team_setup(&active.blue_player_ids, &active.red_player_ids)?;
    validate_format(&active.match_type, active.target_score)?;

    let now = now_iso();
    active.phase = MatchPhase::Live;
    active.started_at = now.clone();
    active.blue_score = 0;
    active.red_score = 0;
    active.blue_sets = 0;
    active.red_sets = 0;
    active.current_set = 1;
    active.completed_sets.clear();
    active.undo_stack.clear();

    let match_type_db = match_type_str(&active.match_type);
    let points_to_win = set_target(&active);

    sqlx::query(
        r#"
        INSERT INTO matches (
            id, date, winner, blue_score, red_score, blue_sets, red_sets, sets_json,
            points_to_win, match_type, win_by_two, duration_secs, finished,
            started_at, finished_at, created_at
        )
        VALUES (?, ?, NULL, 0, 0, 0, 0, '[]', ?, ?, 1, 0, 0, ?, '', ?)
        "#,
    )
    .bind(&active.match_id)
    .bind(&now)
    .bind(points_to_win)
    .bind(match_type_db)
    .bind(&now)
    .bind(&now)
    .execute(&db.0)
    .await?;

    set_team_assignments(&db.0, &active.blue_player_ids, &active.red_player_ids, true).await?;
    save_active_match(&db.0, &active).await?;

    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn score_action(
    db: State<'_, DbState>,
    action: ScoreAction,
) -> AppResult<ActiveMatchResponse> {
    let mut active = load_active_match(&db.0)
        .await?
        .ok_or_else(|| AppError::Validation("no active match".into()))?;

    if !matches!(active.phase, MatchPhase::Live) {
        return Err(AppError::Validation("match is not live".into()));
    }

    active.undo_stack.push(snapshot_from(&active));

    match action {
        ScoreAction::BluePlus => active.blue_score += 1,
        ScoreAction::BlueMinus => {
            if active.blue_score > 0 {
                active.blue_score -= 1;
            } else {
                active.undo_stack.pop();
                return Err(AppError::Validation("blue score cannot go below 0".into()));
            }
        }
        ScoreAction::RedPlus => active.red_score += 1,
        ScoreAction::RedMinus => {
            if active.red_score > 0 {
                active.red_score -= 1;
            } else {
                active.undo_stack.pop();
                return Err(AppError::Validation("red score cannot go below 0".into()));
            }
        }
    }

    let target = set_target(&active);
    if let Some(winner) = check_set_winner(
        active.blue_score,
        active.red_score,
        target,
        active.win_by_two,
    ) {
        let set_number = active.current_set;
        let set_blue = active.blue_score;
        let set_red = active.red_score;

        active.completed_sets.push(SetScore {
            blue: set_blue,
            red: set_red,
        });

        if winner == "blue" {
            active.blue_sets += 1;
        } else {
            active.red_sets += 1;
        }

        let sets_needed = sets_to_win(&active.match_type);
        let match_winner = if active.blue_sets >= sets_needed {
            Some("blue")
        } else if active.red_sets >= sets_needed {
            Some("red")
        } else {
            None
        };

        if let Some(w) = match_winner {
            let event = MatchEvent::MatchCompleted {
                winner: w.to_string(),
            };
            persist_match_progress(&db.0, &active).await?;
            finalize_match(&db.0, &active, w).await?;
            return build_active_response(&db.0, Some(event)).await;
        }

        // Advance to next set (best of 3)
        active.current_set += 1;
        active.blue_score = 0;
        active.red_score = 0;

        let event = MatchEvent::SetCompleted {
            winner: winner.to_string(),
            set_number,
            blue_score: set_blue,
            red_score: set_red,
        };

        persist_match_progress(&db.0, &active).await?;
        save_active_match(&db.0, &active).await?;
        return build_active_response(&db.0, Some(event)).await;
    }

    save_active_match(&db.0, &active).await?;
    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn undo_score(db: State<'_, DbState>) -> AppResult<ActiveMatchResponse> {
    let mut active = load_active_match(&db.0)
        .await?
        .ok_or_else(|| AppError::Validation("no active match".into()))?;

    if !matches!(active.phase, MatchPhase::Live) {
        return Err(AppError::Validation("match is not live".into()));
    }

    let Some(prev) = active.undo_stack.pop() else {
        return Err(AppError::Validation("nothing to undo".into()));
    };

    restore_snapshot(&mut active, prev);

    save_active_match(&db.0, &active).await?;
    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn reset_scoreboard(db: State<'_, DbState>) -> AppResult<ActiveMatchResponse> {
    let mut active = load_active_match(&db.0)
        .await?
        .ok_or_else(|| AppError::Validation("no active match".into()))?;

    if !matches!(active.phase, MatchPhase::Live) {
        return Err(AppError::Validation("match is not live".into()));
    }

    active.blue_score = 0;
    active.red_score = 0;
    active.blue_sets = 0;
    active.red_sets = 0;
    active.current_set = 1;
    active.completed_sets.clear();
    active.undo_stack.clear();

    save_active_match(&db.0, &active).await?;
    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn finish_match(
    db: State<'_, DbState>,
    winner: MatchWinner,
) -> AppResult<ActiveMatchResponse> {
    let active = load_active_match(&db.0)
        .await?
        .ok_or_else(|| AppError::Validation("no active match".into()))?;

    if !matches!(active.phase, MatchPhase::Live) {
        return Err(AppError::Validation("match is not live".into()));
    }

    let winner_str = match winner {
        MatchWinner::Blue => "blue",
        MatchWinner::Red => "red",
    };

    finalize_match(&db.0, &active, winner_str).await?;

    Ok(ActiveMatchResponse {
        active: false,
        match_data: None,
        blue_players: vec![],
        red_players: vec![],
        event: Some(MatchEvent::MatchCompleted {
            winner: winner_str.to_string(),
        }),
    })
}

#[tauri::command]
pub async fn cancel_match(db: State<'_, DbState>) -> AppResult<ActiveMatchResponse> {
    let active = load_active_match(&db.0).await?;

    if let Some(m) = active {
        if matches!(m.phase, MatchPhase::Live) {
            sqlx::query("DELETE FROM matches WHERE id = ? AND finished = 0")
                .bind(&m.match_id)
                .execute(&db.0)
                .await?;
        }

        set_team_assignments(&db.0, &[], &[], false).await?;
        clear_active_match(&db.0).await?;
        delete_setting(&db.0, LAST_WINNER_SIDE_KEY).await?;
    }

    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn generate_opponent_team(db: State<'_, DbState>) -> AppResult<ActiveMatchResponse> {
    let active = load_active_match(&db.0)
        .await?
        .ok_or_else(|| AppError::Validation("no hay partido configurado".into()))?;

    if active.team_size != 4 && active.team_size != 6 {
        return Err(AppError::Validation("team_size must be 4 or 6".into()));
    }

    let last_winner_side = get_setting(&db.0, LAST_WINNER_SIDE_KEY).await?;
    let keep_blue = match last_winner_side.as_deref() {
        Some("blue") => true,
        Some("red") => false,
        _ => !active.blue_player_ids.is_empty(),
    };

    let (keeper_ids, old_opponent_ids) = if keep_blue {
        (
            active.blue_player_ids.clone(),
            active.red_player_ids.clone(),
        )
    } else {
        (
            active.red_player_ids.clone(),
            active.blue_player_ids.clone(),
        )
    };

    if keeper_ids.is_empty() {
        return Err(AppError::Validation(
            "no hay equipo ganador para conservar".into(),
        ));
    }

    move_players_to_queue_end(&db.0, &old_opponent_ids).await?;

    let candidates = NextMatchGenerator::new(&db.0)
        .next_players(active.team_size as usize)
        .await?;

    if candidates.len() < active.team_size as usize {
        return Err(AppError::Validation(format!(
            "se necesitan {} jugadores en cola para generar el contrincante",
            active.team_size
        )));
    }

    let opponent_ids: Vec<String> = candidates.into_iter().map(|p| p.id).collect();
    let (blue_ids, red_ids) = if keep_blue {
        (keeper_ids, opponent_ids)
    } else {
        (opponent_ids, keeper_ids)
    };

    set_team_assignments(&db.0, &blue_ids, &red_ids, false).await?;

    let updated = ActiveMatch {
        blue_player_ids: blue_ids,
        red_player_ids: red_ids,
        blue_score: 0,
        red_score: 0,
        blue_sets: 0,
        red_sets: 0,
        current_set: 1,
        completed_sets: vec![],
        undo_stack: vec![],
        ..active
    };
    save_active_match(&db.0, &updated).await?;

    build_active_response(&db.0, None).await
}

#[tauri::command]
pub async fn get_match_history(db: State<'_, DbState>) -> AppResult<Vec<MatchHistoryItem>> {
    let rows: Vec<MatchHistoryRow> = sqlx::query_as(
        r#"
        SELECT id, date, started_at, finished_at, duration_secs,
               match_type, win_by_two, blue_score, red_score,
               blue_sets, red_sets, points_to_win, sets_json, winner
        FROM matches
        WHERE finished = 1
        ORDER BY finished_at DESC
        "#,
    )
    .fetch_all(&db.0)
    .await?;

    let mut history = Vec::with_capacity(rows.len());
    for row in rows {
        let roster: Vec<(String, String)> = sqlx::query_as(
            "SELECT team, player_name FROM match_players WHERE match_id = ? ORDER BY team, player_name",
        )
        .bind(&row.id)
        .fetch_all(&db.0)
        .await?;

        let blue_players: Vec<String> = roster
            .iter()
            .filter(|(team, _)| team == "blue")
            .map(|(_, name)| name.clone())
            .collect();
        let red_players: Vec<String> = roster
            .iter()
            .filter(|(team, _)| team == "red")
            .map(|(_, name)| name.clone())
            .collect();

        let sets: Vec<SetScore> = serde_json::from_str(&row.sets_json).unwrap_or_default();

        history.push(MatchHistoryItem {
            id: row.id,
            date: row.date,
            started_at: row.started_at,
            finished_at: row.finished_at,
            duration_secs: row.duration_secs,
            match_type: row.match_type,
            target_score: row.points_to_win,
            win_by_two: row.win_by_two != 0,
            blue_score: row.blue_score,
            red_score: row.red_score,
            blue_sets: row.blue_sets,
            red_sets: row.red_sets,
            sets,
            winner: row.winner,
            blue_players,
            red_players,
        });
    }

    Ok(history)
}

// ════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ════════════════════════════════════════════════════════

async fn persist_match_progress(pool: &SqlitePool, active: &ActiveMatch) -> AppResult<()> {
    let sets_json = serde_json::to_string(&active.completed_sets)?;
    sqlx::query(
        "UPDATE matches SET blue_score = ?, red_score = ?, blue_sets = ?, red_sets = ?, sets_json = ? WHERE id = ?",
    )
    .bind(active.blue_score)
    .bind(active.red_score)
    .bind(active.blue_sets)
    .bind(active.red_sets)
    .bind(&sets_json)
    .bind(&active.match_id)
    .execute(pool)
    .await?;
    Ok(())
}

async fn finalize_match(
    pool: &SqlitePool,
    active: &ActiveMatch,
    winner_str: &str,
) -> AppResult<()> {
    let now = now_iso();
    let duration_secs = compute_duration_secs(&active.started_at, &now);

    // Include current set in progress if it has points and isn't already in completed_sets
    let mut all_sets = active.completed_sets.clone();
    if active.blue_score > 0 || active.red_score > 0 {
        let last = all_sets.last();
        let current = SetScore {
            blue: active.blue_score,
            red: active.red_score,
        };
        if last
            .map(|s| s.blue != current.blue || s.red != current.red)
            .unwrap_or(true)
        {
            all_sets.push(current);
        }
    }

    let sets_json = serde_json::to_string(&all_sets)?;
    let match_type_db = match_type_str(&active.match_type);

    sqlx::query(
        r#"
        UPDATE matches
        SET winner = ?, blue_score = ?, red_score = ?, blue_sets = ?, red_sets = ?,
            sets_json = ?, duration_secs = ?, finished = 1, finished_at = ?,
            match_type = ?, win_by_two = 1, points_to_win = ?
        WHERE id = ?
        "#,
    )
    .bind(winner_str)
    .bind(active.blue_score)
    .bind(active.red_score)
    .bind(active.blue_sets)
    .bind(active.red_sets)
    .bind(&sets_json)
    .bind(duration_secs)
    .bind(&now)
    .bind(match_type_db)
    .bind(active.target_score)
    .bind(&active.match_id)
    .execute(pool)
    .await?;

    let blue_players = fetch_players_by_ids(pool, &active.blue_player_ids).await?;
    let red_players = fetch_players_by_ids(pool, &active.red_player_ids).await?;

    for player in blue_players.iter().chain(red_players.iter()) {
        let won = (winner_str == "blue" && active.blue_player_ids.contains(&player.id))
            || (winner_str == "red" && active.red_player_ids.contains(&player.id));
        let result = if won { "win" } else { "loss" };
        let team = if active.blue_player_ids.contains(&player.id) {
            "blue"
        } else {
            "red"
        };
        insert_match_player(pool, &active.match_id, player, team, result).await?;
        update_player_stats(pool, &player.id, won, &now).await?;
    }

    let rotated = apply_post_match_rotation(
        pool,
        winner_str,
        &active.blue_player_ids,
        &active.red_player_ids,
        active.team_size,
    )
    .await?;
    set_setting(pool, LAST_WINNER_SIDE_KEY, winner_str).await?;

    let new_active = ActiveMatch {
        match_id: Uuid::new_v4().to_string(),
        phase: MatchPhase::Setup,
        blue_player_ids: rotated.blue_player_ids,
        red_player_ids: rotated.red_player_ids,
        match_type: active.match_type.clone(),
        target_score: active.target_score,
        win_by_two: true,
        team_size: active.team_size,
        blue_score: 0,
        red_score: 0,
        blue_sets: 0,
        red_sets: 0,
        current_set: 1,
        completed_sets: vec![],
        started_at: String::new(),
        undo_stack: vec![],
    };
    save_active_match(pool, &new_active).await?;

    Ok(())
}

async fn move_players_to_queue_end(pool: &SqlitePool, player_ids: &[String]) -> AppResult<()> {
    if player_ids.is_empty() {
        return Ok(());
    }

    let existing_queue: Vec<Player> = sqlx::query_as(
        "SELECT * FROM players WHERE status = 'waiting' AND arrival_time != '' ORDER BY arrival_time ASC",
    )
    .fetch_all(pool)
    .await?;

    let now = Utc::now();
    let latest_queue_time = existing_queue
        .iter()
        .filter_map(|p| parse_iso(&p.arrival_time))
        .max()
        .unwrap_or(now);
    let base = if latest_queue_time > now {
        latest_queue_time
    } else {
        now
    };

    for (i, id) in player_ids.iter().enumerate() {
        let ts = (base + Duration::seconds(i as i64 + 1)).to_rfc3339();
        sqlx::query(
            "UPDATE players SET status = 'waiting', arrival_time = ?, court_since = '', updated_at = ? WHERE id = ?",
        )
        .bind(&ts)
        .bind(now_iso())
        .bind(id)
        .execute(pool)
        .await?;
    }

    Ok(())
}

fn compute_duration_secs(started_at: &str, finished_at: &str) -> i64 {
    use chrono::DateTime;
    let start = DateTime::parse_from_rfc3339(started_at).ok();
    let end = DateTime::parse_from_rfc3339(finished_at).ok();
    match (start, end) {
        (Some(s), Some(e)) => (e - s).num_seconds().max(0),
        _ => 0,
    }
}

async fn insert_match_player(
    pool: &SqlitePool,
    match_id: &str,
    player: &Player,
    team: &str,
    result: &str,
) -> AppResult<()> {
    let id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO match_players (id, match_id, player_id, team, player_name, elo_before, elo_after, result)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&id)
    .bind(match_id)
    .bind(&player.id)
    .bind(team)
    .bind(&player.name)
    .bind(player.elo)
    .bind(player.elo)
    .bind(result)
    .execute(pool)
    .await?;
    Ok(())
}

async fn update_player_stats(
    pool: &SqlitePool,
    player_id: &str,
    won: bool,
    now: &str,
) -> AppResult<()> {
    if won {
        sqlx::query(
            "UPDATE players SET matches_played = matches_played + 1, wins = wins + 1, last_match_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(now)
        .bind(now)
        .bind(player_id)
        .execute(pool)
        .await?;
    } else {
        sqlx::query(
            "UPDATE players SET matches_played = matches_played + 1, losses = losses + 1, last_match_at = ?, updated_at = ? WHERE id = ?",
        )
        .bind(now)
        .bind(now)
        .bind(player_id)
        .execute(pool)
        .await?;
    }
    Ok(())
}
