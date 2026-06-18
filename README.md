# SETPOINT

Volleyball match management app — React + TypeScript + Vite + Tauri v2 + Rust + SQLite.

## Status: Step 1 + 2 complete

- ✅ Project scaffold (Vite + React + TS + Tailwind)
- ✅ Tauri v2 config (macOS + iOS)
- ✅ Rust backend with SQLite (sqlx) + migrations
- ✅ Zustand store architecture
- ✅ **Players module**: create, edit, delete, search, import, arrival tracking — fully wired to SQLite

Remaining modules (Match Generator, Scoreboard, Rotation Engine, History, Statistics) are stubbed
as "Coming soon" placeholder tabs so navigation works end-to-end today.

## Requirements

- Node.js 18+
- Rust (stable) + Cargo — install via https://rustup.rs
- Tauri v2 CLI prerequisites for your platform: https://v2.tauri.app/start/prerequisites/
  - macOS: Xcode + Xcode Command Line Tools
  - iOS: Xcode, an Apple Developer account (for device builds), `rustup target add aarch64-apple-ios`

## Setup

```bash
npm install
```

## Run (desktop dev, hot reload)

```bash
npm run tauri dev
```

This compiles the Rust backend, launches the app window, and starts the Vite dev server with HMR.
On first run it creates `setpoint.db` in the platform app-data directory and runs all migrations
automatically (via `sqlx::migrate!`).

## Run (web only, for quick UI iteration without Tauri)

```bash
npm run dev
```

Note: Tauri-specific calls (`invoke`, SQLite) will fail in plain browser mode — use `tauri dev`
for full functionality.

## Build for macOS

```bash
npm run tauri build
```

Produces a `.app` and `.dmg` in `src-tauri/target/release/bundle/`.

To regenerate proper macOS `.icns` icons from the source `icon.png`:

```bash
npx tauri icon src-tauri/icons/icon.png
```

(This must be run on macOS — `.icns` generation requires `iconutil`, which is macOS-only.)

## Build for iOS

First-time setup:

```bash
npx tauri ios init
```

Then to open in Xcode:

```bash
npx tauri ios dev
```

Or build for device/simulator:

```bash
npx tauri ios build
```

You'll need a valid Apple Developer signing certificate configured in Xcode for device builds.

## Project structure

```
setpoint/
├── src/                      # React frontend
│   ├── components/
│   │   ├── ui/               # Button, Card, Input, Modal, Toast primitives
│   │   └── BottomNav.tsx
│   ├── pages/
│   │   ├── PlayersPage.tsx    # Full CRUD UI (Module 1 - complete)
│   │   └── PlaceholderPages.tsx
│   ├── stores/
│   │   └── usePlayersStore.ts # Zustand store for players
│   ├── lib/
│   │   ├── playersApi.ts      # Typed Tauri invoke wrappers
│   │   └── utils.ts
│   ├── types/
│   │   └── player.ts          # Shared types (mirrors Rust models)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs             # App setup, command registration
│   │   ├── db.rs              # SQLite pool + migration runner
│   │   ├── error.rs           # AppError type
│   │   ├── models.rs          # Player struct + DTOs
│   │   └── players.rs         # Player CRUD commands
│   ├── migrations/
│   │   └── 0001_initial.sql   # players, matches, match_players, settings, statistics
│   ├── capabilities/
│   │   └── default.json       # Tauri v2 permissions
│   ├── icons/                  # App icons (all platforms)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── public/icons/               # PWA icons
├── index.html
├── vite.config.ts             # includes PWA plugin config
├── tailwind.config.js          # SETPOINT dark theme colors
└── package.json
```

## Database schema (SQLite)

Tables created by `migrations/0001_initial.sql`:

- **players** — id, name, level (1-5), elo, arrival_time, matches_played, wins, losses, status
- **matches** — id, date, winner, scores, sets, points_to_win, duration, finished
- **match_players** — join table: which players played on which team, ELO before/after, result
- **settings** — key/value app settings (points_to_win, keep_winners, team_size, max_sets)
- **statistics** — denormalized per-player aggregates

## Design system

- Background: `#0f172a`
- Card: `#1e293b`
- Primary accent: `#facc15` (yellow)
- Team Blue: `#2563eb`
- Team Red: `#dc2626`
- Dark mode only, mobile-first, 48px minimum touch targets

## Next steps (Step 3+)

- Match Generator: balanced 6v6 team generation, manual player movement between Blue/Red/Waiting
- Scoreboard: +1/-1, undo, set tracking, win detection (21, win by 2)
- Rotation Engine: auto-rotate queue after match ends, "Keep Winners On Court" setting
- History: searchable/filterable match history
- Statistics: leaderboard, win rate, charts (recharts)
- Import/Export JSON, full DB backup/restore
- PWA service worker + manifest finalization
