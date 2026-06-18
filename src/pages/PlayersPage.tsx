import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  CheckSquare2,
  Clock3,
  Copy,
  Database,
  Download,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

import { Button } from "@/components/ui/button";
import { Avatar, Card, Pill } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { parseImportText, playersApi } from "@/lib/playersApi";
import {
  selectFilteredPlayers,
  usePlayersStore,
} from "@/stores/usePlayersStore";
import {
  hasArrived,
  initials,
  waitMinutes,
  type Player,
  type PlayerStatus,
  type SetpointBackup,
} from "@/types/player";

const STATUS_META: Record<PlayerStatus, { label: string; variant: "green" | "gray" | "blue" | "red" | "yellow" }> = {
  available: { label: "Disponible", variant: "green" },
  waiting: { label: "En espera", variant: "yellow" },
  blue: { label: "Equipo azul", variant: "blue" },
  red: { label: "Equipo rojo", variant: "red" },
  absent: { label: "Ausente", variant: "gray" },
};

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
    setStatus,
    markArrived,
    unmarkArrived,
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
  const [newArrived, setNewArrived] = useState(true);
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
      await addPlayer({ name: newName.trim(), level: newLevel, mark_arrived: newArrived });
      showToast(`✓ ${newName.trim()} agregado`);
      setNewName("");
      setNewLevel(3);
      setNewArrived(true);
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

  async function toggleArrival(player: Player) {
    setMenuId(null);
    if ((player.status === "blue" || player.status === "red") && hasArrived(player)) {
      showToast("No se puede quitar la llegada durante un partido");
      return;
    }
    try {
      if (hasArrived(player)) await unmarkArrived(player.id);
      else {
        await markArrived(player.id);
        showToast(`✓ Llegada de ${player.name} registrada`);
      }
    } catch {
      // El store muestra el error.
    }
  }

  async function handleStatus(player: Player, status: PlayerStatus) {
    setMenuId(null);
    try {
      await setStatus(player.id, status);
      showToast(`Estado de ${player.name} actualizado`);
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
        defaultPath: `SETPOINT-respaldo-${date}.json`,
        filters: [{ name: "Respaldo SETPOINT", extensions: ["json"] }],
      });
      if (!path) return;
      await writeTextFile(path, JSON.stringify(backup, null, 2));
      showToast(`Respaldo exportado · ${backup.counts.players} jugadores`);
      setShowBackup(false);
    } catch (caught) {
      showToast(`No se pudo exportar: ${String(caught)}`);
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
        filters: [{ name: "Respaldo SETPOINT", extensions: ["json"] }],
      });
      if (!path || Array.isArray(path)) return;
      const parsed = JSON.parse(await readTextFile(path)) as SetpointBackup;
      if (parsed.format !== "setpoint-backup" || parsed.version !== 1 || !parsed.counts) {
        throw new Error("formato de respaldo no válido");
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
      showToast(`Respaldo importado · ${result.players} jugadores procesados`);
    } catch (caught) {
      showToast(`No se pudo importar: ${String(caught)}`);
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
        <Button onClick={() => setShowBackup(true)}><Database size={17} />Respaldo</Button>
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
          <div className="grid grid-cols-2 gap-2">
            <Select value={newLevel} onChange={(event) => setNewLevel(Number(event.target.value))}>
              {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>Nivel {level}</option>)}
            </Select>
            <Select value={newArrived ? "yes" : "no"} onChange={(event) => setNewArrived(event.target.value === "yes")}>
              <option value="yes">Marcar llegada</option><option value="no">Solo registrar</option>
            </Select>
          </div>
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
              onArrival={() => void toggleArrival(player)}
              onLevel={() => openLevel(player)}
              onDelete={() => { setDeleteTarget(player); setMenuId(null); }}
              onDuplicate={() => void handleDuplicate(player)}
              onStatus={(status) => void handleStatus(player, status)}
            />
          ))}
        </div>
      )}

      {selectionMode && selectedIds.size > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] w-[calc(100%-2rem)] max-w-[448px] animate-float-up">
          <div className="flex items-center gap-2 rounded-2xl border border-border2 bg-card/95 backdrop-blur-xl p-2 shadow-2xl">
            <Button className="flex-1" onClick={toggleAllVisible}>{allVisibleSelected ? "Quitar todo" : "Seleccionar todo"}</Button>
            <Button variant="danger" className="flex-1" onClick={() => setConfirmBulkDelete(true)}><Trash2 size={16} />Eliminar ({selectedIds.size})</Button>
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

      <Modal open={showBackup} title="Respaldo completo" description="Incluye jugadores, niveles, partidos, estadísticas y configuraciones." onClose={() => { setShowBackup(false); setBackupPreview(null); }}>
        {!backupPreview ? (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="yellow" disabled={busy} onClick={() => void exportBackup()}><Download size={17} />Exportar</Button>
            <Button disabled={busy} onClick={() => void chooseBackup()}><Upload size={17} />Importar</Button>
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

function PlayerCard({
  player,
  selectionMode,
  selected,
  menuOpen,
  onSelect,
  onMenu,
  onEdit,
  onArrival,
  onLevel,
  onDelete,
  onDuplicate,
  onStatus,
}: {
  player: Player;
  selectionMode: boolean;
  selected: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onMenu: () => void;
  onEdit: () => void;
  onArrival: () => void;
  onLevel: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onStatus: (status: PlayerStatus) => void;
}) {
  const arrived = hasArrived(player);
  const status = STATUS_META[player.status];

  return (
    <Card
      className={`relative overflow-visible transition-all duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-lg ${selected ? "border-setpoint-yellow ring-1 ring-setpoint-yellow/50 bg-setpoint-yellow/5" : ""}`}
      onClick={selectionMode ? onSelect : undefined}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <span className={`mt-2 flex h-6 w-6 items-center justify-center rounded-md border transition-all ${selected ? "bg-setpoint-yellow border-setpoint-yellow text-background" : "border-muted/60"}`}>
            {selected && <Check size={16} strokeWidth={3} />}
          </span>
        )}
        <Avatar initials={initials(player.name)} className="h-12 w-12 bg-gradient-to-br from-card3 to-card2 border border-white/10 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-extrabold tracking-tight">{player.name}</h2>
            <Pill variant={status.variant}>{status.label}</Pill>
          </div>
          <div className="mt-1 flex items-center gap-1 text-setpoint-yellow" aria-label={`Nivel ${player.level} de 5`}>
            {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={17} fill={star <= player.level ? "currentColor" : "transparent"} className={star > player.level ? "text-muted/40" : ""} />)}
            <span className="ml-1 text-[10px] font-bold text-muted">NIVEL {player.level}</span>
          </div>
        </div>
        {!selectionMode && (
          <div className="relative">
            <button aria-label={`Acciones de ${player.name}`} className="rounded-lg p-2 text-muted transition-colors hover:bg-card3 hover:text-white" onClick={onMenu}><MoreVertical size={19} /></button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-xl border border-border2 bg-card shadow-2xl animate-slide-in" onClick={(event) => event.stopPropagation()}>
                <MenuButton icon={<Pencil size={15} />} label="Editar" onClick={onEdit} />
                <MenuButton icon={<MapPin size={15} />} label={arrived ? "Quitar llegada" : "Marcar llegada"} onClick={onArrival} />
                <MenuButton icon={<Star size={15} />} label="Cambiar nivel" onClick={onLevel} />
                <MenuButton icon={<UserCheck size={15} />} label={player.status === "absent" ? "Marcar disponible" : "Marcar ausente"} onClick={() => onStatus(player.status === "absent" ? "available" : "absent")} />
                <MenuButton icon={<Copy size={15} />} label="Duplicar jugador" onClick={onDuplicate} />
                <MenuButton danger icon={<Trash2 size={15} />} label="Eliminar" onClick={onDelete} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2.5 text-[11px] text-muted">
        <div className="flex items-center gap-1.5"><Clock3 size={13} />{arrived ? `Llegó ${formatArrival(player.arrival_time)}` : "Sin llegada"}</div>
        <div className="text-right font-semibold">{arrived ? `${waitMinutes(player.arrival_time)} min esperando` : `ELO ${player.elo}`}</div>
        <div>🏐 {player.matches_played} partidos</div>
        <div className="text-right"><span className="text-setpoint-green">{player.wins} G</span><span className="mx-1.5">·</span><span className="text-setpoint-red-text">{player.losses} P</span></div>
      </div>
    </Card>
  );
}

function MenuButton({ icon, label, onClick, danger = false }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return <button className={`flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-xs font-semibold transition-colors hover:bg-card3 ${danger ? "text-setpoint-red-text" : "text-white"}`} onClick={onClick}>{icon}{label}</button>;
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
      <p className="mb-2 text-xs font-bold">Contenido del respaldo</p>
      {rows.map(([label, count]) => <div key={String(label)} className="flex justify-between py-1 text-xs text-muted"><span>{label}</span><strong className="text-white">{count}</strong></div>)}
    </div>
  );
}

function formatArrival(value: string): string {
  return new Intl.DateTimeFormat("es-DO", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
