import { invoke } from "@tauri-apps/api/core";

export interface BalancedTeamsResult {
  blue_player_ids: string[];
  red_player_ids: string[];
}

export type TeamSide = "blue" | "red" | "none";

export const teamsApi = {
  generateBalanced(teamSize: number): Promise<BalancedTeamsResult> {
    return invoke<BalancedTeamsResult>("generate_balanced_teams", { teamSize });
  },

  assign(playerId: string, team: TeamSide): Promise<void> {
    return invoke("assign_player_team", { playerId, team });
  },
};
