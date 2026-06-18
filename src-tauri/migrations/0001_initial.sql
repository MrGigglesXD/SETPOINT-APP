-- ════════════════════════════════════════════════════════
-- SETPOINT - Initial schema
-- ════════════════════════════════════════════════════════

-- PLAYERS
CREATE TABLE IF NOT EXISTS players (
    id              TEXT PRIMARY KEY NOT NULL,
    name            TEXT NOT NULL UNIQUE,
    level           INTEGER NOT NULL DEFAULT 3 CHECK (level BETWEEN 1 AND 5),
    elo             INTEGER NOT NULL DEFAULT 1000,
    arrival_time    TEXT NOT NULL,
    matches_played  INTEGER NOT NULL DEFAULT 0,
    wins            INTEGER NOT NULL DEFAULT 0,
    losses          INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','blue','red','waiting','absent')),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_arrival ON players(arrival_time);

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
    id              TEXT PRIMARY KEY NOT NULL,
    date            TEXT NOT NULL DEFAULT (datetime('now')),
    winner          TEXT CHECK (winner IN ('blue','red')),
    blue_score      INTEGER NOT NULL DEFAULT 0,
    red_score       INTEGER NOT NULL DEFAULT 0,
    blue_sets       INTEGER NOT NULL DEFAULT 0,
    red_sets        INTEGER NOT NULL DEFAULT 0,
    sets_json       TEXT NOT NULL DEFAULT '[]',
    points_to_win   INTEGER NOT NULL DEFAULT 21,
    duration_secs   INTEGER NOT NULL DEFAULT 0,
    finished        INTEGER NOT NULL DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
CREATE INDEX IF NOT EXISTS idx_matches_finished ON matches(finished);

-- MATCH_PLAYERS (join table: which players were on which team in which match)
CREATE TABLE IF NOT EXISTS match_players (
    id              TEXT PRIMARY KEY NOT NULL,
    match_id        TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    team            TEXT NOT NULL CHECK (team IN ('blue','red')),
    player_name     TEXT NOT NULL,
    elo_before      INTEGER NOT NULL DEFAULT 1000,
    elo_after       INTEGER NOT NULL DEFAULT 1000,
    result          TEXT CHECK (result IN ('win','loss'))
);

CREATE INDEX IF NOT EXISTS idx_match_players_match ON match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player ON match_players(player_id);

-- SETTINGS (key-value store for app settings)
CREATE TABLE IF NOT EXISTS settings (
    key             TEXT PRIMARY KEY NOT NULL,
    value           TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('points_to_win', '21');
INSERT OR IGNORE INTO settings (key, value) VALUES ('keep_winners', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('team_size', '6');
INSERT OR IGNORE INTO settings (key, value) VALUES ('max_sets', '1');

-- STATISTICS (denormalized session-level aggregates, refreshed on demand)
CREATE TABLE IF NOT EXISTS statistics (
    id                  TEXT PRIMARY KEY NOT NULL,
    player_id           TEXT NOT NULL UNIQUE REFERENCES players(id) ON DELETE CASCADE,
    total_matches       INTEGER NOT NULL DEFAULT 0,
    total_wins          INTEGER NOT NULL DEFAULT 0,
    total_losses        INTEGER NOT NULL DEFAULT 0,
    win_rate            REAL NOT NULL DEFAULT 0,
    current_streak      INTEGER NOT NULL DEFAULT 0,
    best_elo            INTEGER NOT NULL DEFAULT 1000,
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
