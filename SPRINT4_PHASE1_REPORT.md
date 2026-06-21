SPRINT 4 — PHASE 1: STABILITY REPORT

Summary
- Goal: stabilize core flows without redesigning UI or changing architecture.
- Work: fixed match id uniqueness on start, made match finalization transactional, improved team balancing algorithm, sanitized player import parsing, and ensured build/tests pass.

What was fixed
1) UNIQUE constraint failed: matches.id
- Problem: starting a match could attempt to insert a `matches` row with an id already present, causing UNIQUE violations.
- Fix: `start_match` now uses `INSERT ... ON CONFLICT(id) DO UPDATE` to update the existing row instead of failing. File: `src-tauri/src/matches.rs`.

2) Team balancing producing unfair teams
- Problem: greedy heuristic produced unbalanced teams in many cases.
- Fix: `balance_by_level` now does an exhaustive subset search for the candidate set (usually <= 12 players) to pick a `team_size` subset whose level sum is closest to half the total. This produces near-optimal parity for small team sizes. File: `src-tauri/src/teams.rs`.

3) Player import creates invalid players from Markdown headers
- Problem: importing text containing markdown headers or bullets produced bogus player names ("# Header", "- Item").
- Fixes:
  - Frontend `parseImportText` skips lines starting with common markdown/list markers (leading `#`, `>` or `-/*`). File: `src/lib/playersApi.ts`.
  - Backend `validate_name` sanitizes leading markdown/bullet markers and trims them so import cannot create header rows. File: `src-tauri/src/players.rs`.

4) Match lifecycle reliability (setup → start → score → finish → rotation → next match)
- Problem: `finalize_match` performed multiple writes/inserts across different tables without a transaction, risking DB inconsistency on partial failures.
- Fix: `finalize_match` now wraps the critical persistence steps into a DB transaction: updates the `matches` row, inserts `match_players`, and updates player stats atomically. Rotation and settings updates still run after commit to avoid long transactions; this prevents partial match persistence. File: `src-tauri/src/matches.rs`.
- Also fixed a logic bug: `win_by_two` was being written unconditionally to `1` during finalization; now it preserves the `active.win_by_two` value.

5) Queue consistency & duplicate players
- Problem: potential inconsistent queue order and accidental imports
- Fixes:
  - `set_team_assignments` behavior left intact (it already syncs queue status) but input sanitization and transactional finalization reduce chances of inconsistencies.
  - Import sanitization prevents header-based duplicate entries. Backend `create_player` and `import_players` still enforce case-insensitive uniqueness.

Files modified
- Backend (Tauri / Rust)
  - src-tauri/src/matches.rs — start insertion conflict handling, transactional finalize_match, preserve `win_by_two`, inline player/match_player updates (removed unused helpers).
  - src-tauri/src/teams.rs — improved `balance_by_level` algorithm.
  - src-tauri/src/players.rs — `validate_name` sanitization for markdown/bullet prefixes.
- Frontend (TypeScript)
  - src/lib/playersApi.ts — `parseImportText` now skips markdown/list lines.
- Documentation files created during audit remain: `PROJECT_ARCHITECTURE.md`, `SPRINT4_AUDIT.md` (unchanged for this step).

Tests executed
- Backend unit tests (Rust):
  - Command: `cd src-tauri && cargo test`
  - Result: all tests passed.
    - Ran backup unit tests; 2 passed, 0 failed.
- Rust lints: `cargo clippy --all-targets --all-features -- -D warnings`
  - Result: after adjustments (removed unused helpers and loop refactor) clippy completed with no warnings.
- Frontend build: `npm run build` (root)
  - Result: success; Vite produced `dist/` artifacts.

Commands run
- cd src-tauri && cargo test
- cd /Users/andreseusebiomercedes/Documents/setpoint/src-tauri && cargo clippy --all-targets --all-features -- -D warnings
- cd /Users/andreseusebiomercedes/Documents/setpoint && npm run build

Remaining known issues / notes
- Rotation runs after commit: rotation and setting updates are executed after the core transaction commits. This avoids long transactions but could leave rotation undone if rotation fails; add a retry mechanism or include rotation in a broader transactional flow if atomic rotation is required.
- `undo_stack` is still persisted inside `settings.active_match` on every score action; frequent writes may be costly. A future optimization could keep `undo_stack` in-memory and persist minimal snapshots.
- `set_team_assignments` still does a full `SELECT * FROM players` and loops updates per player; this may be slow for very large player tables — batching updates is recommended for future work.
- Elo calculation: `elo_after` currently remains equal to `elo_before`. If Elo rating updates are desired, implement Elo update logic in `finalize_match`.
- Some UI consistency issues (localization and selector ordering differences) remain as noted in the audit; these were intentionally not changed in Phase 1 to preserve UX.

Preservation of architecture
- No UI redesigns or new pages were introduced. Changes were localized to backend command handlers, validation and a small frontend parser — preserving the overall architecture and API surface.

If you want, next actions I can take (separate PRs):
- Include rotation inside the finalization transaction or add robust retry/compensation logic.
- Implement Elo rating updates.
- Optimize `set_team_assignments` to batch DB updates.
- Move `undo_stack` out of persistent settings to in-memory runtime state.

Report generated: 2026-06-20
