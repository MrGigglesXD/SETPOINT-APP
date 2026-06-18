import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare2,
  Copy,
  Database,
  Download,
  FileText,
  FolderOpen,
  Plus,
  Search,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PlayerCard } from "@/components/players/PlayerCard";
import { showToast } from "@/components/ui/toast";
import { parseImportText, playersApi } from "@/lib/playersApi";
import {
  selectFilteredPlayers,
  usePlayersStore,
} from "@/stores/usePlayersStore";
import {
  type Player,
  type SetpointBackup,
} from "@/types/player";

export function PlayersPage() {
  const {
    players,
    loading,
    error,
    searchQuery,
    loadPlayers,
    addPlayer,
    editPlayer,
    removePlayer,
    removePlayers,
    duplicatePlayer,
    importPlayers,
    setSearchQuery,
    clearError,
  } = usePlayersStore();
  const filtered = usePlayersStore(selectFilteredPlayers);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLevel, setNewLevel] = useState(3);
  const [importText, setImportText] = useState("");
  const [editing, setEditing] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState(3);
  const [levelTarget, setLevelTarget] = useState<Player | null>(null);
  const [quickLevel, setQuickLevel] = useState(3);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkLevelOpen, setBulkLevelOpen] = useState(false);
  const [bulkLevel, setBulkLevel] = useState(3);
  const [backupPreview, setBackupPreview] = useState<SetpointBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [, setMinuteTick] = useState(0);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    if (error) {
      showToast(error);
      clearError();
    }
  }, [clearError, error]);

  useEffect(() => {
    const timer = window.setInterval(() => setMinuteTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const allVisibleSelected = useMemo(
    () => filtered.length > 0 && filtered.every((player) => selectedIds.has(player.id)),
    [filtered, selectedIds]
  );

  function closeSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) filtered.forEach((player) => next.delete(player.id));
      else filtered.forEach((player) => next.add(player.id));
      return next;
    });
  }

  async function handleAdd() {
    if (!newName.trim()) return showToast("Escribe un nombre");
    try {
      await addPlayer({ name: newName.trim(), level: newLevel, mark_arrived: true });
      showToast(`✓ ${newName.trim()} agregado`);
      setNewName("");
      setNewLevel(3);
      setShowAddForm(false);
    } catch {
      // El store muestra el error.
    }
  }

  function openEdit(player: Player) {
    setEditing(player);
    setEditName(player.name);
    setEditLevel(player.level);
    setMenuId(null);
  }

  async function handleSaveEdit() {
    if (!editing || !editName.trim()) return;
    try {
      await editPlayer({ id: editing.id, name: editName.trim(), level: editLevel });
      setEditing(null);
      showToast("✓ Jugador actualizado");
    } catch {
      // El store muestra el error.
    }
  }

  function openLevel(player: Player) {
    setLevelTarget(player);
    setQuickLevel(player.level);
    setMenuId(null);
  }

  async function handleLevelChange() {
    if (!levelTarget) return;
    try {
      await editPlayer({ id: levelTarget.id, name: levelTarget.name, level: quickLevel });
      setLevelTarget(null);
      showToast(`Nivel de ${levelTarget.name} actualizado`);
    } catch {
      // El store muestra el error.
    }
  }

  async function handleDuplicate(player: Player) {
    setMenuId(null);
    try {
      const duplicate = await duplicatePlayer(player.id);
      showToast(`✓ ${duplicate.name} creado`);
    } catch {
      // El store muestra el error.
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await removePlayer(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Jugador eliminado");
    } catch {
      // El store muestra el error.
    }
  }

  async function handleBulkDelete() {
    if (!selectedIds.size) return;
    try {
      const deleted = await removePlayers([...selectedIds]);
      setConfirmBulkDelete(false);
      closeSelectionMode();
      showToast(`${deleted} jugador${deleted === 1 ? "" : "es"} eliminado${deleted === 1 ? "" : "s"}`);
    } catch {
      // La transacción preserva todos los registros si falla.
    }
  }

  async function handleBulkDuplicate() {
    if (!selectedIds.size) return;
    try {
      for (const id of selectedIds) {
        await duplicatePlayer(id);
      }
      const count = selectedIds.size;
      closeSelectionMode();
      showToast(`${count} jugador${count === 1 ? "" : "es"} duplicado${count === 1 ? "" : "s"}`);
    } catch {
      // El store muestra el error.
    }
  }

  async function handleBulkLevelChange() {
    const selectedPlayers = players.filter((player) => selectedIds.has(player.id));
    if (!selectedPlayers.length) return;
    try {
      for (const player of selectedPlayers) {
        await editPlayer({ id: player.id, name: player.name, level: bulkLevel });
      }
      const count = selectedPlayers.length;
      setBulkLevelOpen(false);
      closeSelectionMode();
      showToast(`Nivel actualizado para ${count} jugador${count === 1 ? "" : "es"}`);
    } catch {
      // El store muestra el error.
    }
  }

  async function handleTextImport() {
    const rows = parseImportText(importText);
    if (!rows.length) return showToast("No se encontraron jugadores válidos");
    try {
      const result = await importPlayers(rows);
      setImportText("");
      setShowTextImport(false);
      showToast(`${result.added} agregados · ${result.skipped} omitidos`);
    } catch {
      // El store muestra el error.
    }
  }

  async function exportBackup() {
    setBusy(true);
    try {
      const backup = await playersApi.exportBackup();
      const date = new Date().toISOString().slice(0, 10);
      const path = await saveDialog({
        defaultPath: `SETPOINT-torneo-${date}.setpoint`,
        filters: [{ name: "Torneo SETPOINT", extensions: ["setpoint"] }],
      });
      if (!path) return;
      await writeTextFile(path, JSON.stringify(backup, null, 2));
      showToast(`Torneo guardado · ${backup.counts.players} jugadores`);
      setShowBackup(false);
    } catch (caught) {
      showToast(`No se pudo guardar: ${String(caught)}`);
    } finally {
      setBusy(false);
    }
  }

  async function chooseBackup() {
    setBusy(true);
    try {
      const path = await openDialog({
        multiple: false,
        directory: false,
        filters: [{ name: "Torneo SETPOINT", extensions: ["setpoint", "json"] }],
      });
      if (!path || Array.isArray(path)) return;
      const parsed = JSON.parse(await readTextFile(path)) as SetpointBackup;
      if (parsed.format !== "setpoint-backup" || parsed.version !== 1 || !parsed.counts) {
        throw new Error("archivo de torneo no válido");
      }
      setBackupPreview(parsed);
    } catch (caught) {
      showToast(`No se pudo abrir: ${String(caught)}`);
    } finally {
      setBusy(false);
    }
  }

  async function restoreBackup(mode: "replace" | "merge") {
    if (!backupPreview) return;
    setBusy(true);
    try {
      const result = await playersApi.importBackup(backupPreview, mode);
      await loadPlayers();
      setBackupPreview(null);
      setShowBackup(false);
      showToast(`Torneo abierto · ${result.players} jugadores procesados`);
    } catch (caught) {
      showToast(`No se pudo abrir: ${String(caught)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-32">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight">SET<span className="text-setpoint-yellow">POINT</span></h1>
          <p className="text-xs text-muted mt-0.5">Gestión de jugadores</p>
        </div>
        <div className="rounded-full bg-card2 border border-border px-3 py-1.5 text-xs font-bold">
          {players.length} jugador{players.length === 1 ? "" : "es"}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="yellow" onClick={() => setShowAddForm((open) => !open)}><Plus size={17} />Agregar</Button>
        <Button onClick={() => setShowBackup(true)}><Database size={17} />Torneo</Button>
        <Button onClick={() => setShowTextImport((open) => !open)}><Upload size={17} />Importar lista</Button>
        <Button
          variant={selectionMode ? "red" : "ghost"}
          onClick={() => selectionMode ? closeSelectionMode() : setSelectionMode(true)}
        >
          {selectionMode ? <X size={17} /> : <CheckSquare2 size={17} />}
          {selectionMode ? "Cancelar" : "Seleccionar"}
        </Button>
      </div>

      {showAddForm && (
        <Card className="flex flex-col gap-2.5 animate-slide-in">
          <strong className="text-sm">Nuevo jugador</strong>
          <Input autoFocus maxLength={40} placeholder="Nombre" value={newName} onChange={(event) => setNewName(event.target.value)} />
          <Select value={newLevel} onChange={(event) => setNewLevel(Number(event.target.value))}>
            {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Nivel {level}</option>)}
          </Select>
          <Button variant="yellow" onClick={handleAdd}>Agregar jugador</Button>
        </Card>
      )}

      {showTextImport && (
        <Card className="flex flex-col gap-2.5 animate-slide-in">
          <strong className="text-sm">Importar lista rápida</strong>
          <p className="text-xs text-muted">Una línea por jugador: “Nombre Nivel”. El nivel es opcional.</p>
          <Textarea rows={4} placeholder={"Ana 4\nLuis 3\nMaría"} value={importText} onChange={(event) => setImportText(event.target.value)} />
          <Button variant="yellow" onClick={handleTextImport}>Importar lista</Button>
        </Card>
      )}

      <div className="relative">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <Input
          className="pl-10 pr-10"
          placeholder="Nombre, iniciales, nivel o estado…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
        {searchQuery && <button aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" onClick={() => setSearchQuery("")}><X size={17} /></button>}
      </div>

      {selectionMode && (
        <button className="flex items-center justify-between rounded-xl px-3 py-2 bg-setpoint-yellow/10 text-setpoint-yellow text-xs font-bold animate-slide-in" onClick={toggleAllVisible}>
          <span>{allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar todo"}</span>
          <span>{selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}</span>
        </button>
      )}

      {loading && !players.length ? (
        <div className="py-12 text-center text-sm text-muted">Cargando jugadores…</div>
      ) : !filtered.length ? (
        <div className="py-12 text-center text-sm text-muted">{players.length ? "No hay coincidencias" : "Agrega tu primer jugador"}</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              selectionMode={selectionMode}
              selected={selectedIds.has(player.id)}
              menuOpen={menuId === player.id}
              onSelect={() => toggleSelected(player.id)}
              onMenu={() => setMenuId((id) => id === player.id ? null : player.id)}
              onEdit={() => openEdit(player)}
              onLevel={() => openLevel(player)}
              onDelete={() => { setDeleteTarget(player); setMenuId(null); }}
              onDuplicate={() => void handleDuplicate(player)}
            />
          ))}
        </div>
      )}

      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] w-[calc(100%-2rem)] max-w-[448px] animate-float-up">
          <div className="flex items-center gap-2 rounded-2xl border border-border2 bg-card/95 backdrop-blur-xl p-2 shadow-2xl">
            <Button className="flex-1" onClick={() => setBulkLevelOpen(true)}>Nivel</Button>
            <Button className="flex-1" onClick={() => void handleBulkDuplicate()}><Copy size={16} />Duplicar</Button>
            <Button variant="danger" className="flex-1" onClick={() => setConfirmBulkDelete(true)}><Trash2 size={16} />Eliminar</Button>
            <Button size="icon" aria-label="Cancelar selección" onClick={closeSelectionMode}><X size={18} /></Button>
          </div>
        </div>
      )}

      <Modal open={!!editing} title="Editar jugador" onClose={() => setEditing(null)} actions={[{ label: "Guardar", onClick: handleSaveEdit, variant: "yellow" }]}>
        <Input value={editName} maxLength={40} onChange={(event) => setEditName(event.target.value)} />
        <Select value={editLevel} onChange={(event) => setEditLevel(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Nivel {level}</option>)}
        </Select>
      </Modal>

      <Modal open={!!levelTarget} title={`Cambiar nivel · ${levelTarget?.name ?? ""}`} onClose={() => setLevelTarget(null)} actions={[{ label: "Actualizar", onClick: handleLevelChange, variant: "yellow" }]}>
        <Select value={quickLevel} onChange={(event) => setQuickLevel(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Nivel {level} · {"★".repeat(level)}</option>)}
        </Select>
      </Modal>

      <Modal open={!!deleteTarget} title={`¿Eliminar a ${deleteTarget?.name ?? "este jugador"}?`} description="También se eliminarán sus relaciones históricas. Esta acción no se puede deshacer." onClose={() => setDeleteTarget(null)} actions={[{ label: "Eliminar", onClick: handleDelete, variant: "red" }]} />
      <Modal open={confirmBulkDelete} title={`¿Eliminar ${selectedIds.size} jugadores?`} description="La operación se realizará de forma segura y no se puede deshacer." onClose={() => setConfirmBulkDelete(false)} actions={[{ label: `Eliminar (${selectedIds.size})`, onClick: handleBulkDelete, variant: "red" }]} />
      <Modal open={bulkLevelOpen} title={`Cambiar nivel · ${selectedIds.size} seleccionado${selectedIds.size === 1 ? "" : "s"}`} onClose={() => setBulkLevelOpen(false)} actions={[{ label: "Actualizar", onClick: handleBulkLevelChange, variant: "yellow" }]}>
        <Select value={bulkLevel} onChange={(event) => setBulkLevel(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Nivel {level} · {"★".repeat(level)}</option>)}
        </Select>
      </Modal>

      <Modal open={showBackup} title="Torneo" description="Guarda o abre toda la información de SETPOINT." onClose={() => { setShowBackup(false); setBackupPreview(null); }}>
        {!backupPreview ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="yellow" disabled={busy} onClick={() => void exportBackup()}><Download size={17} />Guardar Torneo</Button>
            <Button disabled={busy} onClick={() => void chooseBackup()}><FolderOpen size={17} />Abrir Torneo</Button>
            <Button disabled><FileText size={17} />Exportar Reporte PDF</Button>
            <Button disabled><Share2 size={17} />Compartir</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <BackupSummary backup={backupPreview} />
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={busy} onClick={() => void restoreBackup("merge")}>Fusionar</Button>
              <Button variant="red" disabled={busy} onClick={() => void restoreBackup("replace")}>Reemplazar</Button>
            </div>
            <Button size="sm" onClick={() => setBackupPreview(null)}>Cancelar</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function BackupSummary({ backup }: { backup: SetpointBackup }) {
  const rows = [
    ["Jugadores", backup.counts.players],
    ["Niveles", backup.counts.levels],
    ["Partidos", backup.counts.matches],
    ["Estadísticas", backup.counts.statistics],
    ["Configuraciones", backup.counts.settings],
  ];
  return (
    <div className="rounded-xl border border-border bg-card2 p-3">
      <p className="mb-2 text-xs font-bold">Contenido del torneo</p>
      {rows.map(([label, count]) => <div key={String(label)} className="flex justify-between py-1 text-xs text-muted"><span>{label}</span><strong className="text-white">{count}</strong></div>)}
    </div>
  );
}
