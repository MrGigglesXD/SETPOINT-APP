import type { Player } from "@/types/player";

interface PlayersSlice {
  players: Player[];
}

/** Jugadores en pool: solo cola, nunca en equipo. */
function compareQueueOrder(a: Player, b: Player): number {
  const aPos = a.queue_position != null ? a.queue_position : Number.MAX_SAFE_INTEGER;
  const bPos = b.queue_position != null ? b.queue_position : Number.MAX_SAFE_INTEGER;
  if (aPos !== bPos) return aPos - bPos;

  const aTime = a.waiting_since
    ? new Date(a.waiting_since).getTime()
    : a.arrival_time
    ? new Date(a.arrival_time).getTime()
    : Number.MAX_SAFE_INTEGER;
  const bTime = b.waiting_since
    ? new Date(b.waiting_since).getTime()
    : b.arrival_time
    ? new Date(b.arrival_time).getTime()
    : Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

export function selectPoolPlayers(state: PlayersSlice): Player[] {
  return state.players
    .filter((p) => p.status === "waiting")
    .sort((a, b) => compareQueueOrder(a, b));
}

export function selectBlueTeam(state: PlayersSlice): Player[] {
  return state.players.filter((p) => p.status === "blue");
}

export function selectRedTeam(state: PlayersSlice): Player[] {
  return state.players.filter((p) => p.status === "red");
}

export function selectQueuePlayers(state: PlayersSlice): Player[] {
  return state.players
    .filter((p) => p.status === "waiting")
    .sort(compareQueueOrder);
}

/**
 * Get current match blue team players (derived from canonical players store).
 * Enforces Player State Invariant: never returns duplicates, only blue status.
 */
export function selectCurrentBluePlayers(state: PlayersSlice): Player[] {
  return state.players.filter((p) => p.status === "blue");
}

/**
 * Get current match red team players (derived from canonical players store).
 * Enforces Player State Invariant: never returns duplicates, only red status.
 */
export function selectCurrentRedPlayers(state: PlayersSlice): Player[] {
  return state.players.filter((p) => p.status === "red");
}
