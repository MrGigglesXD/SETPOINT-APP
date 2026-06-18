import type { Player } from "@/types/player";

interface PlayersSlice {
  players: Player[];
}

/** Jugadores en pool: disponibles o en cola, nunca en equipo. */
export function selectPoolPlayers(state: PlayersSlice): Player[] {
  return state.players
    .filter((p) => p.status === "available" || p.status === "waiting")
    .sort((a, b) => {
      const ta = a.arrival_time ? new Date(a.arrival_time).getTime() : Infinity;
      const tb = b.arrival_time ? new Date(b.arrival_time).getTime() : Infinity;
      return ta - tb;
    });
}

export function selectBlueTeam(state: PlayersSlice): Player[] {
  return state.players.filter((p) => p.status === "blue");
}

export function selectRedTeam(state: PlayersSlice): Player[] {
  return state.players.filter((p) => p.status === "red");
}

export function selectQueuePlayers(state: PlayersSlice): Player[] {
  return state.players
    .filter((p) => p.status === "waiting" && !!p.arrival_time)
    .sort((a, b) => new Date(a.arrival_time).getTime() - new Date(b.arrival_time).getTime());
}
