use sqlx::SqlitePool;
use tauri::State;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    now_iso, DuplicatePlayerPayload, ImportPlayerRow, NewPlayer, Player, UpdatePlayer,
};

pub struct DbState(pub SqlitePool);

const VALID_STATUSES: [&str; 5] = ["available", "blue", "red", "waiting", "absent"];

fn validate_level(level: i64) -> AppResult<()> {
    if !(1..=5).contains(&level) {
        return Err(AppError::Validation("level must be between 1 and 5".into()));
    }
    Ok(())
}

/// Reserved words that should never become player names.
/// These are common headers, table columns, and metadata keywords.
fn is_reserved_word(name: &str) -> bool {
    let normalized = name
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphabetic())
        .collect::<String>();
    
    matches!(
        normalized.as_str(),
        "name" | "names" | "player" | "players" | "id" | "level" | "position"
            | "posición" | "nombre" | "nombres" | "jugador" | "jugadores"
            | "nivel" | "nro" | "no" | "col" | "row"
    )
}

/// Sanitize a player name by removing formatting, table markers, bullets, etc.
/// 
/// Performs:
/// 1. Trim whitespace
/// 2. Remove table pipes (|)
/// 3. Remove Markdown formatting (*, _, etc.)
/// 4. Remove bullet markers (-, *, +)
/// 5. Remove numbered list prefixes (1., 2), 3-, etc.)
/// 6. Collapse multiple spaces
/// 7. Trim again
fn sanitize_name(raw: &str) -> String {
    let mut cleaned = raw.trim().to_string();

    // Remove table pipes
    cleaned = cleaned.replace('|', " ");

    // Remove Markdown bold/italic: **, __, *, _
    cleaned = cleaned.replace(['*', '_'], "").replace("**", "").replace("__", "");

    // Remove bullet markers at the start: -, *, +, followed by space
    if cleaned.starts_with("- ") || cleaned.starts_with("* ") || cleaned.starts_with("+ ") {
        cleaned = cleaned[2..].trim().to_string();
    }

    // Remove numbered list prefixes: "1.", "2)", "3-", "10.", etc.
    // Pattern: one or more digits followed by . ) - : and optional space
    let mut skip_chars = 0;
    let mut chars_iter = cleaned.chars().peekable();
    let mut digit_count = 0;

    // Count leading digits
    while let Some(&c) = chars_iter.peek() {
        if c.is_ascii_digit() {
            digit_count += 1;
            chars_iter.next();
        } else {
            break;
        }
    }

    // If we found digits, check for separator
    if digit_count > 0 {
        if let Some(&c) = chars_iter.peek() {
            if matches!(c, '.' | ')' | '-' | ':') {
                skip_chars = digit_count + 1;
                chars_iter.next();
                // Skip optional space after separator
                if let Some(&' ') = chars_iter.peek() {
                    skip_chars += 1;
                }
            }
        }
    }

    if skip_chars > 0 {
        cleaned = cleaned[skip_chars..].trim().to_string();
    }

    // Collapse multiple spaces into one
    while cleaned.contains("  ") {
        cleaned = cleaned.replace("  ", " ");
    }

    // Trim again
    cleaned.trim().to_string()
}

fn validate_name(name: &str) -> AppResult<String> {
    let cleaned = sanitize_name(name);

    // Empty after sanitization
    if cleaned.is_empty() {
        return Err(AppError::Validation("name cannot be empty".into()));
    }

    // Too long
    if cleaned.len() > 40 {
        return Err(AppError::Validation(
            "name is too long (max 40 chars)".into(),
        ));
    }

    // Reserved word
    if is_reserved_word(&cleaned) {
        return Err(AppError::Validation(format!(
            "\"{}\" is a reserved word and cannot be used as a player name",
            cleaned
        )));
    }

    // Must contain at least 2 letters to be a plausible human name
    let letter_count = cleaned.chars().filter(|c| c.is_alphabetic()).count();
    if letter_count < 2 {
        return Err(AppError::Validation(
            "name must contain at least 2 letters".into(),
        ));
    }

    Ok(cleaned)
}

// ════════════════════════════════════════════════════════
// QUERIES
// ════════════════════════════════════════════════════════

#[tauri::command]
pub async fn get_players(db: State<'_, DbState>) -> AppResult<Vec<Player>> {
    let players =
        sqlx::query_as::<_, Player>("SELECT * FROM players ORDER BY name COLLATE NOCASE ASC")
            .fetch_all(&db.0)
            .await?;

    Ok(players)
}

#[tauri::command]
pub async fn get_player(db: State<'_, DbState>, id: String) -> AppResult<Player> {
    let player = sqlx::query_as::<_, Player>("SELECT * FROM players WHERE id = ?")
        .bind(&id)
        .fetch_optional(&db.0)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("player {} not found", id)))?;

    Ok(player)
}

#[tauri::command]
pub async fn search_players(db: State<'_, DbState>, query: String) -> AppResult<Vec<Player>> {
    let pattern = format!("%{}%", query.trim());
    let players = sqlx::query_as::<_, Player>(
        "SELECT * FROM players WHERE name LIKE ? COLLATE NOCASE ORDER BY name COLLATE NOCASE ASC",
    )
    .bind(pattern)
    .fetch_all(&db.0)
    .await?;

    Ok(players)
}

// ════════════════════════════════════════════════════════
// MUTATIONS
// ════════════════════════════════════════════════════════

#[tauri::command]
pub async fn create_player(db: State<'_, DbState>, payload: NewPlayer) -> AppResult<Player> {
    let name = validate_name(&payload.name)?;
    validate_level(payload.level)?;

    // Enforce uniqueness (case-insensitive) with a friendly error
    let exists =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM players WHERE name = ? COLLATE NOCASE")
            .bind(&name)
            .fetch_one(&db.0)
            .await?;

    if exists > 0 {
        return Err(AppError::Validation(format!(
            "a player named \"{}\" already exists",
            name
        )));
    }

    let id = Uuid::new_v4().to_string();
    let now = now_iso();
    let _future_tournament_arrival_flag = payload.mark_arrived;

    sqlx::query(
        r#"
        INSERT INTO players (id, name, level, elo, arrival_time, matches_played, wins, losses, status, court_since, last_match_at, created_at, updated_at)
        VALUES (?, ?, ?, 1000, ?, 0, 0, 0, 'waiting', '', '', ?, ?)
        "#,
    )
    .bind(&id)
    .bind(&name)
    .bind(payload.level)
    .bind(&now)
    .bind(&now)
    .bind(&now)
    .execute(&db.0)
    .await?;

    get_player(db, id).await
}

#[tauri::command]
pub async fn update_player(db: State<'_, DbState>, payload: UpdatePlayer) -> AppResult<Player> {
    let name = validate_name(&payload.name)?;
    validate_level(payload.level)?;

    // Check uniqueness against other players
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM players WHERE name = ? COLLATE NOCASE AND id != ?",
    )
    .bind(&name)
    .bind(&payload.id)
    .fetch_one(&db.0)
    .await?;

    if exists > 0 {
        return Err(AppError::Validation(format!(
            "a player named \"{}\" already exists",
            name
        )));
    }

    let now = now_iso();
    let result = sqlx::query("UPDATE players SET name = ?, level = ?, updated_at = ? WHERE id = ?")
        .bind(&name)
        .bind(payload.level)
        .bind(&now)
        .bind(&payload.id)
        .execute(&db.0)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!(
            "player {} not found",
            payload.id
        )));
    }

    get_player(db, payload.id).await
}

#[tauri::command]
pub async fn delete_player(db: State<'_, DbState>, id: String) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM players WHERE id = ?")
        .bind(&id)
        .execute(&db.0)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("player {} not found", id)));
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_players(db: State<'_, DbState>, ids: Vec<String>) -> AppResult<i64> {
    if ids.is_empty() {
        return Ok(0);
    }

    let mut transaction = db.0.begin().await?;
    let mut deleted = 0i64;
    for id in ids {
        deleted += sqlx::query("DELETE FROM players WHERE id = ?")
            .bind(id)
            .execute(&mut *transaction)
            .await?
            .rows_affected() as i64;
    }
    transaction.commit().await?;
    Ok(deleted)
}

#[tauri::command]
pub async fn duplicate_player(
    db: State<'_, DbState>,
    payload: DuplicatePlayerPayload,
) -> AppResult<Player> {
    let source = get_player(db.clone(), payload.id).await?;
    let mut suffix = 2;
    let name = loop {
        let candidate = format!("{} ({})", source.name, suffix);
        let exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM players WHERE name = ? COLLATE NOCASE",
        )
        .bind(&candidate)
        .fetch_one(&db.0)
        .await?;
        if exists == 0 {
            break candidate;
        }
        suffix += 1;
    };

    create_player(
        db,
        NewPlayer {
            name,
            level: source.level,
            mark_arrived: false,
        },
    )
    .await
}

#[tauri::command]
pub async fn set_player_status(
    db: State<'_, DbState>,
    id: String,
    status: String,
) -> AppResult<Player> {
    if !VALID_STATUSES.contains(&status.as_str()) {
        return Err(AppError::Validation(format!("invalid status: {}", status)));
    }

    let now = now_iso();

    let result = match status.as_str() {
        "waiting" => {
            sqlx::query("UPDATE players SET status = ?, arrival_time = ?, court_since = '', updated_at = ? WHERE id = ?")
                .bind(&status)
                .bind(&now)
                .bind(&now)
                .bind(&id)
                .execute(&db.0)
                .await?
        }
        "available" | "absent" => {
            sqlx::query("UPDATE players SET status = ?, arrival_time = '', court_since = '', updated_at = ? WHERE id = ?")
                .bind(&status)
                .bind(&now)
                .bind(&id)
                .execute(&db.0)
                .await?
        }
        _ => {
            sqlx::query("UPDATE players SET status = ?, updated_at = ? WHERE id = ?")
                .bind(&status)
                .bind(&now)
                .bind(&id)
                .execute(&db.0)
                .await?
        }
    };

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("player {} not found", id)));
    }

    get_player(db, id).await
}

#[tauri::command]
pub async fn mark_arrived(db: State<'_, DbState>, id: String) -> AppResult<Player> {
    let now = now_iso();
    let result = sqlx::query(
        "UPDATE players SET arrival_time = ?, status = 'waiting', updated_at = ? WHERE id = ?",
    )
    .bind(&now)
    .bind(&now)
    .bind(&id)
    .execute(&db.0)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("player {} not found", id)));
    }

    get_player(db, id).await
}

#[tauri::command]
pub async fn unmark_arrived(db: State<'_, DbState>, id: String) -> AppResult<Player> {
    let now = now_iso();
    let result = sqlx::query(
        "UPDATE players SET arrival_time = '', status = 'available', updated_at = ? WHERE id = ?",
    )
    .bind(&now)
    .bind(&id)
    .execute(&db.0)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound(format!("player {} not found", id)));
    }

    get_player(db, id).await
}

/// Bulk import players from parsed "Name Level" rows.
/// Skips (does not error on) duplicates; returns counts.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportResult {
    pub added: i64,
    pub skipped: i64,
    pub skipped_names: Vec<String>,
}

#[tauri::command]
pub async fn import_players(
    db: State<'_, DbState>,
    rows: Vec<ImportPlayerRow>,
) -> AppResult<ImportResult> {
    let mut added = 0i64;
    let mut skipped = 0i64;
    let mut skipped_names = Vec::new();
    let base = chrono::Utc::now();

    for row in rows {
        let name = match validate_name(&row.name) {
            Ok(n) => n,
            Err(_) => {
                skipped += 1;
                skipped_names.push(row.name.clone());
                continue;
            }
        };
        let level = if (1..=5).contains(&row.level) {
            row.level
        } else {
            3
        };

        let exists = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM players WHERE name = ? COLLATE NOCASE",
        )
        .bind(&name)
        .fetch_one(&db.0)
        .await?;

        if exists > 0 {
            skipped += 1;
            skipped_names.push(name);
            continue;
        }

        let id = Uuid::new_v4().to_string();
        let arrival_time = (base + chrono::Duration::seconds(added)).to_rfc3339();
        let created_at = now_iso();
        sqlx::query(
            r#"
            INSERT INTO players (id, name, level, elo, arrival_time, matches_played, wins, losses, status, court_since, last_match_at, created_at, updated_at)
            VALUES (?, ?, ?, 1000, ?, 0, 0, 0, 'waiting', '', '', ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&name)
        .bind(level)
        .bind(&arrival_time)
        .bind(&created_at)
        .bind(&created_at)
        .execute(&db.0)
        .await?;

        added += 1;
    }

    Ok(ImportResult {
        added,
        skipped,
        skipped_names,
    })
}
