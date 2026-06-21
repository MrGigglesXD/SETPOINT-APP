**SPRINT 4 — CODE AUDIT**

Scope: entire repository (frontend + Tauri backend). Report groups findings and points to exact source areas.

**1. Critical Bugs**
- Missing transactional integrity in multi-step persistence flows (HIGH)
  - `finalize_match` performs multiple updates/inserts (update `matches`, insert `match_players`, update player stats, rotation) without wrapping in a DB transaction. Partial failures can leave DB inconsistent (see [src-tauri/src/matches.rs](src-tauri/src/matches.rs)).
  - `start_match` inserts a `matches` row then calls `set_team_assignments`; failure in the second step leaves a dangling `matches` row. (same file)
- Incorrect hard-coded `win_by_two` in match finalization (MEDIUM)
  - `finalize_match` UPDATE sets `win_by_two = 1` unconditionally instead of using the active match's `win_by_two` value. This overwrites user-selected format. ([src-tauri/src/matches.rs](src-tauri/src/matches.rs)).
- Potential crash at startup on environment resolution (MEDIUM)
  - `lib.rs` uses `expect()` when resolving `app_data_dir` and `init_pool`; these will panic and crash the whole app if the environment is unusual. Consider returning an error UI instead of panic. ([src-tauri/src/lib.rs](src-tauri/src/lib.rs)).
- Inconsistent/missing error handling surface for some operations (MEDIUM)
  - Many frontend store functions do `set({ error: String(e) })` and rethrow. The error shape and user-facing messaging are inconsistent; some backend commands return Spanish messages while others use English. This can cause confusing UX (see `matches::generate_opponent_team` and other error strings in [src-tauri/src/matches.rs](src-tauri/src/matches.rs)).

**2. Algorithm Issues**
- Greedy leveling balance is suboptimal (LOW→MEDIUM)
  - `balance_by_level` in [src-tauri/src/teams.rs](src-tauri/src/teams.rs) sorts candidates by level and arrival, then greedily assigns to the weaker-sum team. This is fast but may produce suboptimal team level parity. For tighter balancing consider a small search/backtracking or knapsack-like heuristic.
- Rotation is simplistic and not configurable (LOW)
  - `apply_post_match_rotation` (rotation.rs) appends losers to queue end and keeps winners. There is no configurable rotation strategy (e.g., round-robin, keep-best, slide windows). Also it assumes queue state is canonical and immediate candidates are valid—edge cases if players are concurrently moved.
- No Elo/skill update implemented despite schema fields (LOW)
  - `match_players.elo_before` and `elo_after` are stored but `elo_after` is currently same as `elo_before` (no Elo update logic seen). If Elo is intended, missing algorithm is a functional gap. ([src-tauri/src/matches.rs::insert_match_player])

**3. UX Problems**
- Inconsistent localization/messages (LOW→MEDIUM)
  - Error strings are mixed Spanish/English across back-end commands (e.g., `generate_opponent_team` returns Spanish messages). The frontend does not centralize i18n, causing inconsistent user-visible text. ([src-tauri/src/matches.rs](src-tauri/src/matches.rs), [src-tauri/src/players.rs](src-tauri/src/players.rs)).
- Inconsistent queue sorting between selectors (LOW)
  - `selectQueuePlayers` (src/lib/playerSelectors.ts) sorts by arrival time ascending (earliest first); `selectWaitingQueue` (src/stores/usePlayersStore.ts) sorts by wait time descending (longest wait first). This leads to different UI components showing different orders for the same concept. ([src/lib/playerSelectors.ts](src/lib/playerSelectors.ts), [src/stores/usePlayersStore.ts](src/stores/usePlayersStore.ts)).
- Verbose raw errors in UI (LOW)
  - Stores set `error: String(e)` where `e` can be a structured object. The UI may display raw Rust error messages; map errors to user-friendly messages.
- Heavy write frequency for active match state (MEDIUM)
  - `ActiveMatch` (including `undo_stack`) is saved into `settings.active_match` in many operations (every score action). Storing large undo stacks in a single `settings` row causes many small writes and increases chance of DB write contention and wear on persistent storage (particularly on embedded devices).

**4. Architecture Improvements**
- Centralize player status / queue mutation logic (HIGH)
  - Status/arrival_time/court_since update patterns are repeated across `players.rs`, `teams.rs`, `matches.rs`, and `rotation.rs`. Extract to a `player_state` module or helper to avoid duplication and subtle bugs. (see repeated SQL updates in [src-tauri/src/players.rs](src-tauri/src/players.rs) and [src-tauri/src/teams.rs](src-tauri/src/teams.rs)).
- Use DB transactions for compound operations (HIGH)
  - Wrap multi-step operations (`finalize_match`, `start_match`, `import_backup` already uses tx) in transactions to ensure atomicity and easier rollback on error. [src-tauri/src/matches.rs](src-tauri/src/matches.rs).
- Split large modules and separate concerns (MEDIUM)
  - `matches.rs` (~big file) implements models, handlers, persistence and scoring logic. Split into `handlers.rs`, `persistence.rs` and `score_engine.rs` for testability and clarity. ([src-tauri/src/matches.rs](src-tauri/src/matches.rs)).
- Replace string constants with typed enums/constants (LOW→MEDIUM)
  - Status strings (`available`, `waiting`, `blue`, `red`, `absent`) are repeated across modules. Create a single enum/const to avoid typos and drift.
- Centralize settings keys (LOW)
  - `ACTIVE_MATCH_KEY`, `LAST_WINNER_SIDE_KEY` defined locally in `matches.rs`. Consider moving keys to a single `settings` constants file shared by modules.
- Add unit tests for rotation and balancing (LOW→MEDIUM)
  - There are tests for backup, but no tests for `balance_by_level` or `apply_post_match_rotation`. Add in-memory SQLite tests exercising edge cases.

**5. Performance**
- N per-row updates and lack of batching (MEDIUM)
  - `set_team_assignments`, `move_players_to_queue_end`, `apply_post_match_rotation`, and import loops update players inside a loop issuing one UPDATE per player. This causes many separate SQL statements; use batched updates or single UPDATE with CASE expressions to reduce roundtrips and speed up large imports/rotations. ([src-tauri/src/teams.rs](src-tauri/src/teams.rs), [src-tauri/src/rotation.rs](src-tauri/src/rotation.rs)).
- Full table scans where not necessary (MEDIUM)
  - `set_team_assignments` does `SELECT * FROM players` and then loops to update statuses. For large player lists this becomes wasteful; prefer targeted selects (e.g., only players in affected sets) or index-friendly queries.
- Frequent large JSON writes to `settings` row (MEDIUM)
  - Persisting the entire `ActiveMatch` (including `undo_stack`) on every score action writes a potentially growing JSON blob to disk frequently. Consider keeping `undo_stack` in-memory (Rust-side) or storing incremental snapshots only.
- Unnecessary client-side sorting work (LOW)
  - Selectors sometimes map and re-sort arrays in JS which can be costly if `players` grows large; consider server-side ordered queries for queue listing (`get_queue`) and relying on returned order in UI.

**Other Code Smells & Duplicates**
- Repeated SQL timestamping pattern: many places use `now_iso()` and `updated_at` updates; extract a helper.
- Use of empty string `''` to mean missing timestamps (`arrival_time`, `court_since`) rather than SQL NULL (design choice but error-prone).
- Several small wrapper structs and accessors (e.g., `RotationEngine::pool()`) add indirection without benefit.
- Mixed language code comments and error strings - reduce friction by centralizing i18n.

**Concrete Quick Fix Recommendations (prioritized)**
1. Immediate (High priority)
  - Wrap `finalize_match` and `start_match` in transactions to avoid partial state (implement with `pool.begin()` and commit/rollback). ([src-tauri/src/matches.rs](src-tauri/src/matches.rs)).
  - Fix `win_by_two` bug in finalization to use active value. ([src-tauri/src/matches.rs](src-tauri/src/matches.rs)).
  - Extract central player status helper to reduce duplication and guarantee consistent updates.
2. Medium
  - Reduce per-player UPDATE loops by batching or using CASE WHEN updates.
  - Avoid saving full `undo_stack` to `settings` on every score change; keep undo in-memory or compress changes.
  - Add unit tests for `balance_by_level` and `apply_post_match_rotation` using sqlite::memory.
3. Low
  - Improve team balancing algorithm (optional) and implement Elo updates if desired.
  - Centralize error messages and add i18n support or consistent English/Spanish polish.

**References (key files)**
- [src-tauri/src/matches.rs](src-tauri/src/matches.rs)
- [src-tauri/src/teams.rs](src-tauri/src/teams.rs)
- [src-tauri/src/rotation.rs](src-tauri/src/rotation.rs)
- [src-tauri/src/players.rs](src-tauri/src/players.rs)
- [src-tauri/src/engines.rs](src-tauri/src/engines.rs)
- [src-tauri/src/backup.rs](src-tauri/src/backup.rs)
- Frontend stores/selectors: [src/stores/usePlayersStore.ts](src/stores/usePlayersStore.ts), [src/lib/playerSelectors.ts](src/lib/playerSelectors.ts), [src/stores/useMatchStore.ts](src/stores/useMatchStore.ts).

---
Report generated: 2026-06-20
