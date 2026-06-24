// ════════════════════════════════════════════════════════
// Player types - mirror src-tauri/src/models.rs
// ════════════════════════════════════════════════════════

export type PlayerStatus = "available" | "blue" | "red" | "waiting" | "absent";

export interface Player {
  id: string;
  name: string;
  level: number;
  elo: number;
  arrival_time: string;
  waiting_since: string;
  queue_position: number;
  matches_played: number;
  wins: number;
  losses: number;
  status: PlayerStatus;
  court_since: string;
  last_match_at: string;
  created_at: string;
  updated_at: string;
}

export interface NewPlayer {
  name: string;
  level: number;
  mark_arrived: boolean;
}

export interface UpdatePlayer {
  id: string;
  name: string;
  level: number;
}

export interface ImportPlayerRow {
  name: string;
  level: number;
}

export interface ImportResult {
  added: number;
  skipped: number;
  skipped_names: string[];
}

export interface BackupCounts {
  players: number;
  levels: number;
  matches: number;
  statistics: number;
  settings: number;
}

export interface SetpointBackup {
  format: "setpoint-backup";
  version: 1;
  exported_at: string;
  counts: BackupCounts;
  players: Player[];
  matches: unknown[];
  match_players: unknown[];
  statistics: unknown[];
  settings: unknown[];
}

export type BackupImportMode = "replace" | "merge";
export type BackupImportResult = Omit<BackupCounts, "levels">;

// ════════════════════════════════════════════════════════
// Derived / computed helpers used across the UI
// ════════════════════════════════════════════════════════

export function hasArrived(p: Player): boolean {
  return !!p.arrival_time && p.arrival_time.length > 0;
}

export function eloToStars(elo: number): string {
  if (elo >= 1550) return "★★★★★";
  if (elo >= 1400) return "★★★★";
  if (elo >= 1250) return "★★★";
  if (elo >= 1100) return "★★";
  return "★";
}

export function levelStars(level: number): string {
  return "★★★★★".slice(0, level) + "☆☆☆☆☆".slice(0, 5 - level);
}

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??"
  );
}

export function waitMinutes(arrivalTime: string): number {
  if (!arrivalTime) return 0;
  const arrived = new Date(arrivalTime).getTime();
  return Math.max(0, Math.floor((Date.now() - arrived) / 60000));
}
