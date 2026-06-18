import { create } from "zustand";
import type {
  ActiveMatch,
  ActiveMatchResponse,
  MatchEvent,
  MatchHistoryItem,
  MatchType,
  MatchWinner,
  ScoreAction,
} from "@/types/match";
import type { Player } from "@/types/player";
import { matchApi } from "@/lib/matchApi";

export interface MatchFormatConfig {
  matchType: MatchType;
  targetScore: number;
  teamSize: number;
}

interface MatchState {
  active: boolean;
  matchData: ActiveMatch | null;
  bluePlayers: Player[];
  redPlayers: Player[];
  history: MatchHistoryItem[];
  lastEvent: MatchEvent | null;
  loading: boolean;
  error: string | null;

  loadActive: () => Promise<void>;
  setupTeams: (blueIds: string[], redIds: string[], format: MatchFormatConfig) => Promise<void>;
  startMatch: () => Promise<void>;
  score: (action: ScoreAction) => Promise<MatchEvent | null>;
  undo: () => Promise<void>;
  reset: () => Promise<void>;
  finish: (winner: MatchWinner) => Promise<void>;
  cancel: () => Promise<void>;
  generateOpponent: () => Promise<void>;
  loadHistory: () => Promise<void>;
  clearError: () => void;
  clearLastEvent: () => void;
}

function applyResponse(set: (partial: Partial<MatchState>) => void, resp: ActiveMatchResponse) {
  set({
    active: resp.active,
    matchData: resp.match_data ?? null,
    bluePlayers: resp.blue_players,
    redPlayers: resp.red_players,
    lastEvent: resp.event ?? null,
  });
}

export const useMatchStore = create<MatchState>((set) => ({
  active: false,
  matchData: null,
  bluePlayers: [],
  redPlayers: [],
  history: [],
  lastEvent: null,
  loading: false,
  error: null,

  async loadActive() {
    set({ loading: true, error: null });
    try {
      const resp = await matchApi.getActive();
      applyResponse(set, resp);
      set({ loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  async setupTeams(blueIds, redIds, format) {
    set({ error: null });
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
    set({ error: null });
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
      const resp = await matchApi.finish(winner);
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async cancel() {
    set({ error: null });
    try {
      const resp = await matchApi.cancel();
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async generateOpponent() {
    set({ error: null });
    try {
      const resp = await matchApi.generateOpponent();
      applyResponse(set, resp);
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
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
