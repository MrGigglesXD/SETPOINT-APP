SPRINT 4 — PHASE 1B: FRONTEND STABILITY REPORT

Summary
- Scope: React frontend audit only.
- Goal: ensure the UI cannot become inconsistent with backend active-match state.
- Result: stabilized scoreboard flow by returning to Match page when no active match exists, and verified build passes.

Audit Findings
1) Empty Scoreboard after active match disappears
- Before: `ScoreboardPage` could remain on an empty or stale scoreboard state if the backend reported no active match.
- Fix: `ScoreboardPage` now calls `onNoActive` when `loadActive` is finished and there is no active match, preventing stale scoreboard display.
- Navigation: `App.tsx` now routes `ScoreboardPage` back to `MatchPage` via `onNoActive={() => setTab('match')}`.

2) Stale UI state risk
- `useMatchStore` remains the single source of truth for match state.
- Local component state in `MatchPage` is limited to format controls and is synced from `matchData` on match id changes.
- No stale player references are kept in scoreboard components: `ScoreboardView` receives fresh `bluePlayers`/`redPlayers` from the store.

3) Missing result screen
- The app does not currently include a dedicated match result screen.
- As a stabilization measure, finished/no-active state now redirects away from the empty scoreboard.
- This is intentionally not implemented as a new feature.

4) Match page and queue page checks
- `MatchPage` uses player status-derived teams from `usePlayersStore` and refreshes after team actions.
- `QueuePage` uses local polling and does not hold duplicate global state.
- No invalid navigation flows were found beyond the scoreboard empty-screen case.

Changes Made
- `src/pages/ScoreboardPage.tsx`
  - Added `onNoActive` callback support.
  - Redirects automatically when no active match exists after load.
  - Avoids stale scoreboard state after a finished or cleared match.
- `src/App.tsx`
  - Passed `onNoActive={() => setTab('match')}` into `ScoreboardPage`.

Verification
- `npm run build` — success.
- `cargo check` — success.

Conclusion
- The frontend now avoids displaying stale/empty scoreboard UI when the backend has no active match.
- Zustand remains the single source of truth for match data.
- The frontend passes production build and backend compile checks.

Notes
- A dedicated match result screen is not present in the current codebase; it would require separate feature work beyond this stabilization audit.
