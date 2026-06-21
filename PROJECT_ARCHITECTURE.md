**Project Overview**
- **Repo Root**: Single Tauri + React (Vite/TS) application combining a Rust backend with a TypeScript/React frontend.

**Folder Structure**
- **Root**: app manifests and build config: `package.json`, `vite.config.*`, `tsconfig.json`, `README.md`.
- **Frontend**: [src](src) — React + TypeScript UI and client logic.
  - **Pages**: [src/pages](src/pages) — views: `MatchPage`, `ScoreboardPage`, `QueuePage`, `HistoryPage`, `PlayersPage`, `StatsPage`.
  - **Components**: [src/components](src/components) — UI pieces (match, players, scoreboard, ui primitives).
  - **Stores**: [src/stores](src/stores) — Zustand stores: `useMatchStore.ts`, `usePlayersStore.ts`.
  - **Lib**: [src/lib](src/lib) — typed thin wrappers for Tauri commands: `matchApi.ts`, `playersApi.ts`, `queueApi.ts`, `teamsApi.ts`, helpers and selectors in `playerSelectors.ts`.
  - **Types**: [src/types](src/types) — client-side mirrored types: `player.ts`, `match.ts`.
  - **Hooks**: [src/hooks](src/hooks) — `useScoreboardController.ts` (orchestration of tick/live state, initial loads).

- **Backend (Tauri / Rust)**: [src-tauri/src](src-tauri/src)
  - **Entry**: `main.rs`, `lib.rs`
  - **DB init**: `db.rs` (pool + migrations)
  - **Domain**: `players.rs`, `matches.rs`, `queue.rs`, `teams.rs`, `rotation.rs`, `engines.rs`, `backup.rs`, `models.rs`, `error.rs`
  - **Migrations**: [src-tauri/migrations](src-tauri/migrations) — SQL migrations (0001..0004)

**Backend Architecture**
- **Tauri Commands**: Rust functions exposed with `#[tauri::command]` provide the backend surface. Key commands:
  - Players/backup: [src-tauri/src/players.rs](src-tauri/src/players.rs), [src-tauri/src/backup.rs](src-tauri/src/backup.rs)
    - `get_players`, `get_player`, `search_players`, `create_player`, `update_player`, `delete_player`, `delete_players`, `duplicate_player`, `set_player_status`, `mark_arrived`, `unmark_arrived`, `import_players`, `export_backup`, `import_backup`.
  - Queue: [src-tauri/src/queue.rs](src-tauri/src/queue.rs)
    - `get_queue`, `reset_arrival_order`.
  - Teams/Balance: [src-tauri/src/teams.rs](src-tauri/src/teams.rs)
    - `generate_balanced_teams`, `assign_player_team`.
  - Matches: [src-tauri/src/matches.rs](src-tauri/src/matches.rs)
    - `get_active_match`, `setup_match_teams`, `start_match`, `score_action`, `undo_score`, `reset_scoreboard`, `finish_match`, `cancel_match`, `generate_opponent_team`, `get_match_history`.
  - Utilities/Engines: [src-tauri/src/engines.rs](src-tauri/src/engines.rs) — `QueueManager`, `NextMatchGenerator`, `RotationEngine`.

- **DB layer**: `db.rs` initializes a `SqlitePool` and runs SQLx migrations from [src-tauri/migrations](src-tauri/migrations). Queries use SQLx `query`/`query_as` directly in command modules.

**Database Schema**
- Defined in migrations: [src-tauri/migrations/0001_initial.sql](src-tauri/migrations/0001_initial.sql) plus subsequent ALTERs in 0002..0004.
- Key tables:
  - **players**: `id, name, level, elo, arrival_time, matches_played, wins, losses, status, court_since, last_match_at, created_at, updated_at` — indexed on `status` and `arrival_time`.
  - **matches**: `id, date, started_at, finished_at, winner, blue_score, red_score, blue_sets, red_sets, sets_json, points_to_win, duration_secs, match_type, win_by_two, finished, created_at`.
  - **match_players**: join rows linking players to matches: `match_id, player_id, team, player_name, elo_before, elo_after, result`.
  - **settings**: key/value store; used to persist `active_match` JSON and small flags like `points_to_win`, `team_size`, `last_winner_side`.
  - **statistics**: denormalized per-player aggregates (optional/refresh-on-demand) — `total_matches, total_wins, win_rate, current_streak, best_elo`.

**Tauri Commands (surface)**
- The UI calls thin wrappers in [src/lib/*.ts](src/lib) which invoke backend commands by name. Example mapping: `matchApi.start()` -> `start_match` (Rust).
- All commands are co-located in their domain rust files (players, matches, teams, queue, backup). See [src-tauri/src](src-tauri/src).

**Zustand Stores**
- `usePlayersStore` ([src/stores/usePlayersStore.ts](src/stores/usePlayersStore.ts))
  - State: `players[]`, `loading`, `error`, `searchQuery`.
  - Actions: `loadPlayers`, `addPlayer`, `editPlayer`, `removePlayer`, `removePlayers`, `duplicatePlayer`, `setStatus`, `markArrived`, `unmarkArrived`, `importPlayers`, `setSearchQuery`, etc.
  - Selectors exported at file bottom: `selectFilteredPlayers`, `selectArrivedPlayers`, `selectAvailablePlayers`, `selectWaitingQueue`.
- `useMatchStore` ([src/stores/useMatchStore.ts](src/stores/useMatchStore.ts))
  - State: `active`, `matchData`, `bluePlayers`, `redPlayers`, `history`, `lastEvent`, `loading`, `error`.
  - Actions: `loadActive`, `setupTeams`, `startMatch`, `score`, `undo`, `reset`, `finish`, `cancel`, `generateOpponent`, `loadHistory`.
- Stores are thin orchestration layers that call `src/lib/*Api.ts` and mirror backend responses.

**Match Lifecycle (end-to-end)**
- Setup: UI collects two rosters from pool → `matchApi.setupTeams` -> `setup_match_teams` ensures validity and calls `set_team_assignments` to stamp `status` and optionally `court_since`. Active match JSON is stored in `settings.active_match`.
- Start: `matchApi.start()` -> `start_match` inserts a `matches` row (started_at set, finished=0), stamps team assignments (`blue`/`red`) and transitions `ActiveMatch.phase` to `live`.
- Live scoring: `score_action` adjusts `ActiveMatch` in-memory (serialized in `settings.active_match`), pushes undo snapshots, detects set winners via `check_set_winner`, persists partial progress with `persist_match_progress`, and when match ends calls `finalize_match`.
- Finalize: `finalize_match` writes final scores/sets to `matches`, inserts `match_players` entries, updates per-player stats (`matches_played, wins/losses, last_match_at`) and triggers `apply_post_match_rotation`.
- Post-match: `apply_post_match_rotation` moves losing team players to waiting queue (updates `status = 'waiting'` + `arrival_time`) and uses `NextMatchGenerator` to refetch candidates and build the next setup (winner stays / opponent replaced). New `active_match` setup is saved into settings.

**Queue Lifecycle**
- Arrival / mark: `mark_arrived` sets `arrival_time`, `status = 'waiting'` and updated timestamps ([src-tauri/src/players.rs](src-tauri/src/players.rs)).
- Queue read: `QueueManager::waiting_players()` (SQL: select players with `status = 'waiting' AND arrival_time != '' ORDER BY arrival_time ASC`) is used by `get_queue` and match-generation engines.
- Reset ordering: `reset_arrival_order` rewrites `arrival_time` timestamps to now-ordered values.
- When players are assigned to teams via `set_team_assignments`, non-team waiting players are left untouched; non-team players currently in `blue`/`red` are converted back to `waiting` or `available` depending on arrival timestamp.

**Rotation Algorithm**
- Implemented in [src-tauri/src/rotation.rs](src-tauri/src/rotation.rs): `apply_post_match_rotation`.
  - Losers (loser team) are appended to the end of the queue: their `status` is set to `waiting` and `arrival_time` is set to a timestamp after the latest `waiting` player.
  - Winner side (`staying`) remains; `NextMatchGenerator::candidates()` is polled for fresh queue candidates.
  - New opponent is chosen by taking the first `team_size` candidates that are not the staying players.
  - Teams are reassigned with `set_team_assignments`.
- This is a conservative rotation: winners stay, losers requeue, queue order preserved; no complex round-robin rotation table.

**Team Balancing Algorithm**
- Implemented in [src-tauri/src/teams.rs](src-tauri/src/teams.rs): `balance_by_level`.
  - Greedy heuristic: take the first `need = team_size * 2` candidates ordered primarily by `level` descending and then `arrival_time` ascending.
  - Iterates sorted candidates and assigns each to the currently weaker team (by sum of levels) while respecting team size caps.
  - Returns `BalancedTeamsResult { blue_player_ids, red_player_ids }` and then `set_team_assignments` persists team status.
- This is simple and fast but not optimal for minimising level-difference across teams; it favors higher-level players and earlier arrival.

**Statistics Flow**
- `statistics` table exists as a denormalized per-player summary ([src-tauri/migrations/0001_initial.sql](src-tauri/migrations/0001_initial.sql)).
- Stats are incrementally updated within `update_player_stats` during `finalize_match` (players' `matches_played`, `wins`, `losses`, `last_match_at` are updated). The `statistics` table is populated/managed by backup/import and may be refreshed on demand (code paths for refresh are not centralised).
- `backup.rs` exports/imports `statistics` as part of a full-set backup.

**History Flow**
- Completed matches persist in `matches` with `finished=1` and `sets_json` (array of SetScore). `match_players` stores roster and per-player elo/result.
- `get_match_history` (Rust) joins `matches` + `match_players` and returns `MatchHistoryItem` objects consumed by the frontend `useMatchStore.loadHistory()` and displayed in [src/pages/HistoryPage.tsx](src/pages/HistoryPage.tsx).

**Dead Code / Likely Unused Areas**
- `statistics` table is present but there is limited orchestration code to re-compute/refresh the table; aside from backup import/export and the migrations, a dedicated refresh scheduler is not obvious. Consider verifying live usage in the UI (search for references to `statistics` beyond backup and initial migration).
- Some helper functions (e.g., `RotationEngine::pool()` is a thin accessor) are very small wrappers; not dead but lightweight.

**Duplicate / Repeated Patterns**
- Status / arrival_time update SQL logic repeats in multiple places: `players.rs` (`set_player_status`, `mark_arrived`, `unmark_arrived`), `teams.rs` (`set_team_assignments`, `sync_queue_after_teams`), `matches.rs` (`move_players_to_queue_end`, `persist/finalize`), `rotation.rs`. Consolidating into a single helper or module would reduce duplication and risk of inconsistent behavior.
- Several SQL update patterns (stamp `updated_at`, adjust `court_since`) are repeated; consider a small ORM/helper to centralize updates.

**Large Files / Candidates to Split**
- `src-tauri/src/matches.rs` (hundreds of lines): contains models, command handlers, persistence helpers, event logic and should be split into `models.rs` (or moved to `models.rs`), `handlers.rs`, and `persistence.rs` or `score_logic.rs` for clearer separation.
- `src-tauri/src/players.rs` is large and mixes query endpoints, validation, import helpers; consider splitting import/validation and CRUD handlers.
- Frontend: `src/stores/*` are reasonable but `usePlayersStore.ts` contains selectors and CRUD logic — could be split into `playersActions.ts` + `playersSelectors.ts` if it grows.

**Architecture Improvements / Recommendations**
- Centralize player status / queue manipulation: create a `player_state.rs` module on backend to encapsulate transitions (`to_waiting`, `to_available`, `assign_team`) and a single exported helper used across `matches`, `teams`, `rotation`, `players` modules.
- Extract match logic: separate scoring/undo/set-winner logic from persistence. E.g., `score_engine.rs` pure logic functions + small persistence adapter used by `matches.rs` handlers—allows easier unit testing.
- Improve balancing algorithm: consider an ILP or more robust heuristic (e.g., greedy with backtracking, or simulated annealing over small candidate set) if match quality matters.
- Reduce SQL repetition by adopting a small query builder/utility functions (or light wrapper around SQLx queries). Keep explicit SQL for clarity but avoid copy/paste.
- Consider adding tests for rotation and balancing engines (there are some tests in `backup.rs` as examples). Add unit tests that exercise `balance_by_level` and `apply_post_match_rotation` using `sqlx::SqlitePool` in memory.
- Schema: add explicit foreign key/index coverage for `match_players.match_id` and `match_players.player_id` (there are indices already, validate constraints in production). Consider normalizing `statistics` or deriving it on demand if maintenance / freshness is a problem.
- Frontend: centralize API error handling and add retry/consistency checks after mutating commands (e.g., after `setupTeams` and `start`, reload `players` / `match` to ensure UI and DB states are consistent).

**File References (key source files)**
- Backend: [src-tauri/src/matches.rs](src-tauri/src/matches.rs), [src-tauri/src/players.rs](src-tauri/src/players.rs), [src-tauri/src/teams.rs](src-tauri/src/teams.rs), [src-tauri/src/rotation.rs](src-tauri/src/rotation.rs), [src-tauri/src/queue.rs](src-tauri/src/queue.rs), [src-tauri/src/engines.rs](src-tauri/src/engines.rs), [src-tauri/src/backup.rs](src-tauri/src/backup.rs), [src-tauri/src/models.rs](src-tauri/src/models.rs), migrations [src-tauri/migrations](src-tauri/migrations).
- Frontend: [src/stores/useMatchStore.ts](src/stores/useMatchStore.ts), [src/stores/usePlayersStore.ts](src/stores/usePlayersStore.ts), API wrappers [src/lib](src/lib), types [src/types](src/types), [src/hooks/useScoreboardController.ts](src/hooks/useScoreboardController.ts).

**Next steps (optional)**
- Add unit tests for `balance_by_level` and `apply_post_match_rotation`.
- Extract and centralize status/queue mutation helpers.
- Split large backend modules for maintainability and to enable focused code review.

---

Generated on: 2026-06-20

