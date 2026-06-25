import { create } from "zustand";
import type {
  Player,
  NewPlayer,
  UpdatePlayer,
  ImportPlayerRow,
  PlayerStatus,
} from "@/types/player";
import { playersApi } from "@/lib/playersApi";

interface PlayersState {
  players: Player[];
  loading: boolean;
  error: string | null;
  searchQuery: string;

  // actions
  loadPlayers: () => Promise<void>;
  addPlayer: (payload: NewPlayer) => Promise<void>;
  editPlayer: (payload: UpdatePlayer) => Promise<void>;
  removePlayer: (id: string) => Promise<void>;
  removePlayers: (ids: string[]) => Promise<number>;
  duplicatePlayer: (id: string) => Promise<Player>;
  setStatus: (id: string, status: PlayerStatus) => Promise<void>;
  markArrived: (id: string) => Promise<void>;
  unmarkArrived: (id: string) => Promise<void>;
  importPlayers: (rows: ImportPlayerRow[]) => Promise<{ added: number; skipped: number }>;
  setSearchQuery: (q: string) => void;
  clearError: () => void;
}

let _inFlightLoadPlayers: Promise<void> | null = null;

export const usePlayersStore = create<PlayersState>((set, get) => ({
  players: [],
  loading: false,
  error: null,
  searchQuery: "",

  async loadPlayers() {
    if (_inFlightLoadPlayers) return _inFlightLoadPlayers;
    set({ loading: true, error: null });
    _inFlightLoadPlayers = (async () => {
      try {
        const players = await playersApi.list();
        set({ players, loading: false });
      } catch (e) {
        set({ error: String(e), loading: false });
      } finally {
        _inFlightLoadPlayers = null;
      }
    })();
    return _inFlightLoadPlayers;
  },

  async addPlayer(payload) {
    set({ error: null });
    try {
      const player = await playersApi.create(payload);
      set({ players: [...get().players, player] });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async editPlayer(payload) {
    set({ error: null });
    try {
      const updated = await playersApi.update(payload);
      set({
        players: get().players.map((p) => (p.id === updated.id ? updated : p)),
      });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async removePlayer(id) {
    set({ error: null });
    try {
      await playersApi.remove(id);
      set({ players: get().players.filter((p) => p.id !== id) });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async removePlayers(ids) {
    set({ error: null });
    try {
      const deleted = await playersApi.removeMany(ids);
      const idSet = new Set(ids);
      set({ players: get().players.filter((p) => !idSet.has(p.id)) });
      return deleted;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async duplicatePlayer(id) {
    set({ error: null });
    try {
      const player = await playersApi.duplicate(id);
      set({ players: [...get().players, player] });
      return player;
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async setStatus(id, status) {
    set({ error: null });
    try {
      const updated = await playersApi.setStatus(id, status);
      set({ players: get().players.map((p) => (p.id === updated.id ? updated : p)) });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async markArrived(id) {
    set({ error: null });
    try {
      const updated = await playersApi.markArrived(id);
      set({ players: get().players.map((p) => (p.id === updated.id ? updated : p)) });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async unmarkArrived(id) {
    set({ error: null });
    try {
      const updated = await playersApi.unmarkArrived(id);
      set({ players: get().players.map((p) => (p.id === updated.id ? updated : p)) });
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  async importPlayers(rows) {
    set({ error: null });
    try {
      const result = await playersApi.import(rows);
      await get().loadPlayers();
      return { added: result.added, skipped: result.skipped };
    } catch (e) {
      set({ error: String(e) });
      throw e;
    }
  },

  setSearchQuery(q) {
    set({ searchQuery: q });
  },

  clearError() {
    set({ error: null });
  },
}));

// ════════════════════════════════════════════════════════
// Selectors (derived state, kept outside the store for reuse)
// ════════════════════════════════════════════════════════

export function selectFilteredPlayers(state: PlayersState): Player[] {
  const q = normalizeSearch(state.searchQuery);
  if (!q) return state.players;
  return state.players.filter((p) => {
    const searchable = [
      p.name,
      initialsForSearch(p.name),
      String(p.level),
      `nivel ${p.level}`,
      p.status,
      statusLabel(p.status),
    ]
      .map(normalizeSearch)
      .join(" ");
    return searchable.includes(q);
  });
}

function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function initialsForSearch(name: string): string {
  return name.split(/\s+/).map((part) => part[0] ?? "").join("");
}

function statusLabel(status: PlayerStatus): string {
  return {
    available: "disponible",
    waiting: "espera llegado cola",
    blue: "azul partido",
    red: "rojo partido",
    absent: "ausente",
  }[status];
}

export function selectArrivedPlayers(state: PlayersState): Player[] {
  return state.players
    .filter((p) => !!p.arrival_time)
    .sort((a, b) => new Date(a.arrival_time).getTime() - new Date(b.arrival_time).getTime());
}

export function selectAvailablePlayers(state: PlayersState): Player[] {
  return state.players.filter((p) => p.status === "available" || p.status === "waiting");
}

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

export function selectWaitingQueue(state: PlayersState): Player[] {
  return state.players.filter((p) => p.status === "waiting").sort(compareQueueOrder);
}
