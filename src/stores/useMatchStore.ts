import { create } from "zustand";
import type {
  ActiveMatch,
  ActiveMatchResponse,
  MatchEvent,
  MatchHistoryItem,
  MatchResult,
  MatchType,
  MatchWinner,
  ScoreAction,
} from "@/types/match";
import { matchApi } from "@/lib/matchApi";
import { usePlayersStore } from "@/stores/usePlayersStore";

export interface MatchFormatConfig {
  matchType: MatchType;
  targetScore: number;
  teamSize: number;
}

interface MatchState {
  active: boolean;
  matchData: ActiveMatch | null;
  history: MatchHistoryItem[];
  lastEvent: MatchEvent | null;
  matchResult: MatchResult | null;
  replayTeams: { blue: string[]; red: string[]; format: MatchFormatConfig } | null;
  loading: boolean;
  error: string | null;

  loadActive: () => Promise<void>;
  setupTeams: (blueIds: string[], redIds: string[], format: MatchFormatConfig) => Promise<void>;
  startMatch: () => Promise<void>;
  score: (action: ScoreAction) => Promise<MatchEvent | null>;
  undo: () => Promise<void>;
  reset: () => Promise<void>;
  finish: (winner: MatchWinner) => Promise<void>;
  nextMatch: () => Promise<void>;
  cancel: () => Promise<void>;
  generateOpponent: () => Promise<void>;
  rematch: () => Promise<void>;
  loadHistory: () => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
  clearLastEvent: () => void;
}

function applyResponse(set: (partial: Partial<MatchState>) => void, resp: ActiveMatchResponse): void {
  set({
    active: resp.active,
    matchData: resp.match_data ?? null,
    lastEvent: resp.event ?? null,
  });

  try {
    // Keep players store in sync with the authoritative match response.
    // This prevents duplication where a player appears both in a team and in the pool
    // because different stores were out of sync.
    const playersStore = usePlayersStore;
    const current = playersStore.getState().players || [];

    // Normalize statuses coming from the match response to ensure consistency.
    const respPlayers = [
      ...resp.blue_players.map((p) => ({ ...p, status: "blue" as const })),
      ...resp.red_players.map((p) => ({ ...p, status: "red" as const })),
    ];

    const respById = new Map<string, (typeof respPlayers)[0]>(respPlayers.map((p) => [p.id, p]));

    const merged = current
      .map((p) => (respById.has(p.id) ? (respById.get(p.id) as any) : p))
      .filter(Boolean);

    const missing = respPlayers.filter((p) => !current.some((c) => c.id === p.id));

    const finalList = [...merged, ...missing].sort((a, b) => a.name.localeCompare(b.name));
    playersStore.setState({ players: finalList });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("Failed to sync players from match response:", err);
  }
}

let _inFlightLoadActive: Promise<void> | null = null;

export const useMatchStore = create<MatchState>((set, get) => ({
  active: false,
  matchData: null,
  history: [],
  lastEvent: null,
  matchResult: null,
  replayTeams: null,
  loading: false,
  error: null,

  async loadActive() {
    if (_inFlightLoadActive) return _inFlightLoadActive;
    _inFlightLoadActive = (async () => {
      set({ loading: true, error: null });
      try {
        const resp = await matchApi.getActive();
        applyResponse(set, resp);
        set({ loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      } finally {
        _inFlightLoadActive = null;
      }
    })();
    return _inFlightLoadActive;
  },

  async setupTeams(blueIds, redIds, format) {
    set({ error: null, matchResult: null });
    try {
      const resp = await matchApi.setupTeams({
        blue_player_ids: blueIds,
        red_player_ids: redIds,
        match_type: format.matchType,
        target_score: format.targetScore,
        win_by_two: true,
        team_size: format.teamSize,
      });
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async startMatch() {
    set({ error: null, matchResult: null });
    try {
      const resp = await matchApi.start();
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async score(action) {
    set({ error: null });
    try {
      const resp = await matchApi.score(action);
      applyResponse(set, resp);
      return resp.event ?? null;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async undo() {
    set({ error: null });
    try {
      const resp = await matchApi.undo();
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async reset() {
    set({ error: null });
    try {
      const resp = await matchApi.reset();
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async finish(winner) {
    set({ error: null });
    try {
      const state = get();
      const currentMatch = state.matchData;
      const resp = await matchApi.finish(winner);
      const winnerTeam = winner === "blue" ? "blue" : "red";
      const loserTeam = winner === "blue" ? "red" : "blue";
      const matchResult: MatchResult = {
        winner: winnerTeam,
        loser: loserTeam,
        blue_score: state.matchData?.blue_score ?? 0,
        red_score: state.matchData?.red_score ?? 0,
        blue_sets: state.matchData?.blue_sets ?? 0,
        red_sets: state.matchData?.red_sets ?? 0,
        match_type: state.matchData?.match_type ?? "exhibition",
        duration_secs: state.matchData?.started_at ? Math.floor((Date.now() - new Date(state.matchData.started_at).getTime()) / 1000) : 0,
        completed_sets: state.matchData?.completed_sets ?? [],
      };
      set({
        matchResult,
        replayTeams: currentMatch
          ? {
              blue: currentMatch.blue_player_ids,
              red: currentMatch.red_player_ids,
              format: {
                matchType: currentMatch.match_type,
                targetScore: currentMatch.target_score,
                teamSize: currentMatch.team_size,
              },
            }
          : null,
      });
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async nextMatch() {
    set({ error: null });
    try {
      const resp = await matchApi.generateOpponent();
      applyResponse(set, resp);
      set({ matchResult: null, replayTeams: null });

      // Ensure related views are immediately consistent: refresh history and players.
      try {
        await get().loadHistory();
        await usePlayersStore.getState().loadPlayers();
      } catch (syncErr) {
        // eslint-disable-next-line no-console
        console.warn("nextMatch: background sync failed", syncErr);
      }
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async cancel() {
    set({ error: null, matchResult: null, replayTeams: null });
    try {
      const resp = await matchApi.cancel();
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async generateOpponent() {
    set({ error: null, matchResult: null, replayTeams: null });
    try {
      const resp = await matchApi.generateOpponent();
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async rematch() {
    const { replayTeams } = get();
    if (!replayTeams) {
      throw new Error("No rematch teams available");
    }
    await get().setupTeams(replayTeams.blue, replayTeams.red, replayTeams.format);
    await get().startMatch();
  },

  async loadHistory() {
    set({ loading: true, error: null });
    try {
      const history = await matchApi.history();
      set({ history, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  clearResult() {
    set({ matchResult: null, replayTeams: null });
  },

  clearError() {
    set({ error: null });
  },

  clearLastEvent() {
    set({ lastEvent: null });
  },
}));

export function selectIsLive(state: MatchState): boolean {
  return state.active && state.matchData?.phase === "live";
}

export function selectIsSetup(state: MatchState): boolean {
  return state.active && state.matchData?.phase === "setup";
}
