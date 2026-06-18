import { invoke } from "@tauri-apps/api/core";
import type {
  Player,
  NewPlayer,
  UpdatePlayer,
  ImportPlayerRow,
  ImportResult,
  PlayerStatus,
  SetpointBackup,
  BackupImportMode,
  BackupImportResult,
} from "@/types/player";

// ════════════════════════════════════════════════════════
// Players API - thin typed layer over Tauri commands
// ════════════════════════════════════════════════════════

export const playersApi = {
  list(): Promise<Player[]> {
    return invoke<Player[]>("get_players");
  },

  get(id: string): Promise<Player> {
    return invoke<Player>("get_player", { id });
  },

  search(query: string): Promise<Player[]> {
    return invoke<Player[]>("search_players", { query });
  },

  create(payload: NewPlayer): Promise<Player> {
    return invoke<Player>("create_player", { payload });
  },

  update(payload: UpdatePlayer): Promise<Player> {
    return invoke<Player>("update_player", { payload });
  },

  remove(id: string): Promise<void> {
    return invoke<void>("delete_player", { id });
  },

  removeMany(ids: string[]): Promise<number> {
    return invoke<number>("delete_players", { ids });
  },

  duplicate(id: string): Promise<Player> {
    return invoke<Player>("duplicate_player", { payload: { id } });
  },

  setStatus(id: string, status: PlayerStatus): Promise<Player> {
    return invoke<Player>("set_player_status", { id, status });
  },

  markArrived(id: string): Promise<Player> {
    return invoke<Player>("mark_arrived", { id });
  },

  unmarkArrived(id: string): Promise<Player> {
    return invoke<Player>("unmark_arrived", { id });
  },

  import(rows: ImportPlayerRow[]): Promise<ImportResult> {
    return invoke<ImportResult>("import_players", { rows });
  },

  exportBackup(): Promise<SetpointBackup> {
    return invoke<SetpointBackup>("export_backup");
  },

  importBackup(backup: SetpointBackup, mode: BackupImportMode): Promise<BackupImportResult> {
    return invoke<BackupImportResult>("import_backup", { backup, mode });
  },
};

/**
 * Parses pasted text in "Name Level" format (one player per line).
 * Level is optional and defaults to 3. Examples:
 *   "Andres 4"
 *   "Ana 2"
 *   "Miguel" -> level 3
 */
export function parseImportText(raw: string): ImportPlayerRow[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const parts = line.split(/\s+/);
      const last = parts[parts.length - 1];
      if (/^[1-5]$/.test(last) && parts.length > 1) {
        return {
          name: parts.slice(0, -1).join(" "),
          level: parseInt(last, 10),
        };
      }
      return { name: parts.join(" "), level: 3 };
    })
    .filter((row) => row.name.length > 0);
}
