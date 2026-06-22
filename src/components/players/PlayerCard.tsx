import { Check, Clock3, Copy, MoreVertical, Pencil, Star, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar, Card, Pill } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { initials, levelStars, waitMinutes, type Player, type PlayerStatus } from "@/types/player";

const STATUS_META: Record<
  PlayerStatus,
  { label: string; icon: string; variant: "green" | "gray" | "blue" | "red" | "yellow" }
> = {
  waiting: { label: "En cola", icon: "🟢", variant: "green" },
  blue: { label: "Jugando", icon: "🔵", variant: "blue" },
  red: { label: "Jugando", icon: "🔵", variant: "red" },
  available: { label: "Inactivo", icon: "⚪", variant: "gray" },
  absent: { label: "Inactivo", icon: "⚪", variant: "gray" },
};

export function PlayerCard({
  player,
  selectionMode = false,
  selected = false,
  compact = false,
  embedded = false,
  menuOpen = false,
  trailing,
  onSelect,
  onMenu,
  onEdit,
  onLevel,
  onDuplicate,
  onDelete,
}: {
  player: Player;
  selectionMode?: boolean;
  selected?: boolean;
  compact?: boolean;
  embedded?: boolean;
  menuOpen?: boolean;
  trailing?: ReactNode;
  onSelect?: () => void;
  onMenu?: () => void;
  onEdit?: () => void;
  onLevel?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const status = STATUS_META[player.status];
  const waitingText = formatWaiting(player);

  return (
    <PlayerCardSurface
      embedded={embedded}
      className={cn(
        "relative overflow-visible transition-all duration-200 hover:border-white/15",
        selected && "border-setpoint-yellow ring-1 ring-setpoint-yellow/50 bg-setpoint-yellow/5",
        compact ? "p-3" : "hover:-translate-y-0.5 hover:shadow-lg"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <span
            className={cn(
              "mt-1 flex h-6 w-6 items-center justify-center rounded-md border transition-all",
              selected ? "bg-setpoint-yellow border-setpoint-yellow text-background" : "border-muted/60"
            )}
          >
            {selected && <Check size={16} strokeWidth={3} />}
          </span>
        )}

        <Avatar
          initials={initials(player.name)}
          className={cn(
            "bg-gradient-to-br from-card3 to-card2 border border-white/10",
            compact ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm"
          )}
        />

        <div className="min-w-0 flex-1">
          <Pill variant={status.variant} className="mb-1.5">
            <span className="mr-1">{status.icon}</span>
            {status.label}
          </Pill>
          <h2 className={cn("truncate font-extrabold tracking-tight", compact ? "text-sm" : "text-[15px]")}>
            {player.name}
          </h2>
          <div className="mt-1 text-[11px] font-bold text-setpoint-yellow">
            {levelStars(player.level)} <span className="ml-1 text-muted">Nivel {player.level}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span className="flex items-center gap-1.5">
              <Clock3 size={13} />
              {waitingText}
            </span>
            <span>🏐 {player.matches_played} partidos</span>
          </div>
        </div>

        {trailing}

        {!selectionMode && onMenu && (
          <div className="relative">
            <button
              aria-label={`Acciones de ${player.name}`}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-card3 hover:text-white"
              onClick={onMenu}
            >
              <MoreVertical size={19} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-10 z-30 w-52 overflow-hidden rounded-xl border border-border2 bg-card shadow-2xl animate-slide-in"
                onClick={(event) => event.stopPropagation()}
              >
                {onEdit && <MenuButton icon={<Pencil size={15} />} label="Editar" onClick={onEdit} />}
                {onLevel && <MenuButton icon={<Star size={15} />} label="Cambiar nivel" onClick={onLevel} />}
                {onDuplicate && <MenuButton icon={<Copy size={15} />} label="Duplicar" onClick={onDuplicate} />}
                {onDelete && <MenuButton danger icon={<Trash2 size={15} />} label="Eliminar" onClick={onDelete} />}
              </div>
            )}
          </div>
        )}
      </div>
    </PlayerCardSurface>
  );
}

function PlayerCardSurface({
  embedded,
  className,
  onClick,
  children,
}: {
  embedded: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (embedded) {
    return (
      <div className={cn("rounded-xl bg-card2", className)} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <Card className={className} onClick={onClick}>
      {children}
    </Card>
  );
}

function formatWaiting(player: Player): string {
  if (player.status !== "waiting" || !player.arrival_time) return "Ahora mismo";
  const minutes = waitMinutes(player.arrival_time);
  if (minutes <= 0) return "Ahora mismo";
  if (minutes === 1) return "Hace 1 min";
  return `Hace ${minutes} min`;
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-xs font-semibold transition-colors hover:bg-card3",
        danger ? "text-setpoint-red-text" : "text-white"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
