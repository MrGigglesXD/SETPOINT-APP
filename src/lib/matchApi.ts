import { invoke } from "@tauri-apps/api/core";
import type {
  ActiveMatchResponse,
  MatchHistoryItem,
  MatchWinner,
  ScoreAction,
  SetupTeamsPayload,
} from "@/types/match";

export const matchApi = {
  getActive(): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("get_active_match");
  },

  setupTeams(payload: SetupTeamsPayload): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("setup_match_teams", { payload });
  },

  start(): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("start_match");
  },

  score(action: ScoreAction): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("score_action", { action });
  },

  undo(): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("undo_score");
  },

  finish(winner: MatchWinner): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("finish_match", { winner });
  },

  cancel(): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("cancel_match");
  },

  reset(): Promise<ActiveMatchResponse> {
    return invoke<ActiveMatchResponse>("reset_scoreboard");
  },

  history(): Promise<MatchHistoryItem[]> {
    return invoke<MatchHistoryItem[]>("get_match_history");
  },
};
