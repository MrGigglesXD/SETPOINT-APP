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
import { parseImportText as parseImportTextSanitized } from "@/lib/playerImportSanitizer";

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
 * 
 * This is a robust parser that handles:
 * - Plain text lists: "Name Level"
 * - Markdown tables: "| Name | Level |"
 * - Bullet lists: "- Name Level"
 * - Numbered lists: "1. Name Level"
 * - Mixed formatting from copy/paste (Markdown, Excel, Notion, WhatsApp)
 * 
 * Automatically filters:
 * - Markdown headers (#, ##, ###)
 * - Markdown tables (| ... |)
 * - Separator lines (---, ===, etc.)
 * - Reserved words (Name, Player, Nombre, Jugador, etc.)
 * - Empty lines and whitespace
 * 
 * Level is optional (1-5) and defaults to 3.
 * Names with accents and hyphens are supported (José, Maria-José, etc.).
 */
export function parseImportText(raw: string): ImportPlayerRow[] {
  return parseImportTextSanitized(raw);
}
