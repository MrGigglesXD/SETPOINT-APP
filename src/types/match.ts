// ════════════════════════════════════════════════════════
// Match types - mirror src-tauri/src/matches.rs
// ════════════════════════════════════════════════════════

import type { Player } from "@/types/player";

export type MatchPhase = "setup" | "live";
export type MatchType = "exhibition" | "best_of_3" | "best_of_5";
export type TargetScore = 16 | 21 | 25;
export type TeamSize = 4 | 6;

export interface SetScore {
  blue: number;
  red: number;
}

export interface ScoreSnapshot {
  blue_score: number;
  red_score: number;
  blue_sets?: number;
  red_sets?: number;
  current_set?: number;
  completed_sets?: SetScore[];
}

export interface ActiveMatch {
  match_id: string;
  phase: MatchPhase;
  blue_player_ids: string[];
  red_player_ids: string[];
  match_type: MatchType;
  target_score: number;
  win_by_two: boolean;
  team_size: number;
  blue_score: number;
  red_score: number;
  blue_sets: number;
  red_sets: number;
  current_set: number;
  completed_sets: SetScore[];
  started_at: string;
  undo_stack: ScoreSnapshot[];
}

export type MatchEvent =
  | {
      type: "set_completed";
      winner: string;
      set_number: number;
      blue_score: number;
      red_score: number;
    }
  | {
      type: "match_completed";
      winner: string;
    };

export interface ActiveMatchResponse {
  active: boolean;
  match_data?: ActiveMatch;
  blue_players: Player[];
  red_players: Player[];
  event?: MatchEvent;
}

export interface SetupTeamsPayload {
  blue_player_ids: string[];
  red_player_ids: string[];
  match_type: MatchType;
  target_score: number;
  win_by_two: boolean;
  team_size: number;
}

export type ScoreAction = "blue_plus" | "blue_minus" | "red_plus" | "red_minus";
export type MatchWinner = "blue" | "red";

export interface MatchHistoryItem {
  id: string;
  date: string;
  started_at: string;
  finished_at: string;
  duration_secs: number;
  match_type: string;
  target_score: number;
  win_by_two: boolean;
  blue_score: number;
  red_score: number;
  blue_sets: number;
  red_sets: number;
  sets: SetScore[];
  winner: string | null;
  blue_players: string[];
  red_players: string[];
}

// ════════════════════════════════════════════════════════
// Display helpers
// ════════════════════════════════════════════════════════

export function formatDuration(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function matchDurationSecs(startedAt: string, nowMs = Date.now()): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((nowMs - start) / 1000));
}

export function canUndo(match: ActiveMatch | undefined): boolean {
  return !!match && match.undo_stack.length > 0;
}

export function currentSetTarget(match: ActiveMatch): number {
  if (match.match_type === "exhibition") return match.target_score;
  const decider = match.match_type === "best_of_5" ? 5 : 3;
  return match.current_set >= decider ? 15 : 25;
}

export function formatMatchTypeLabel(matchType: string): string {
  if (matchType === "best_of_5") return "Oficial (al mejor de 5)";
  if (matchType === "best_of_3") return "Oficial (al mejor de 3)";
  return "Exhibición";
}

export function formatSetsSummary(sets: SetScore[]): string {
  if (!sets.length) return "";
  return sets.map((s) => `${s.blue}-${s.red}`).join(" · ");
}

export function formatMatchFormatHistory(item: MatchHistoryItem): string {
  const typeLabel = formatMatchTypeLabel(item.match_type);
  if (item.match_type === "best_of_3" || item.match_type === "best_of_5") {
    const setsStr = formatSetsSummary(item.sets);
    const winByTwo = item.win_by_two ? " · win by 2" : "";
    return `${typeLabel}${setsStr ? ` · ${setsStr}` : ""}${winByTwo}`;
  }
  const winByTwo = item.win_by_two ? " · win by 2" : "";
  return `${typeLabel} · ${item.target_score} pts${winByTwo}`;
}
