import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Pill, Avatar } from "@/components/ui/card";
import { PlayerCard } from "@/components/players/PlayerCard";
import { initials, levelStars, type Player } from "@/types/player";

export function TeamPanel({
  team,
  label,
  players,
  pool,
  teamSize,
  onAssign,
}: {
  team: "blue" | "red";
  label: string;
  players: Player[];
  pool: Player[];
  teamSize: number;
  onAssign: (id: string, side: "blue" | "red" | "none") => void;
}) {
  const border = team === "blue" ? "border-setpoint-blue/40" : "border-setpoint-red/40";
  const header = team === "blue" ? "text-setpoint-blue-text" : "text-setpoint-red-text";
  const teamIds = new Set(players.map((p) => p.id));
  const available = pool.filter((p) => !teamIds.has(p.id));
  const teamFull = players.length >= teamSize;
  
  const avgLevel = players.length > 0 
    ? (players.reduce((sum, p) => sum + p.level, 0) / players.length).toFixed(1)
    : null;

  return (
    <Card className={`border-2 ${border} flex flex-col gap-2.5`}>
      <div className="flex items-center justify-between">
        <div className={`text-sm font-bold ${header}`}>
          {label}
          {avgLevel && <span className="text-muted ml-1 text-xs">· {avgLevel}</span>}
        </div>
        <Pill variant={team}>{players.length}</Pill>
      </div>

      {players.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => onAssign(p.id, "none")}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold active:opacity-70 transition-all cursor-pointer hover:bg-opacity-40 ${
                team === "blue"
                  ? "bg-setpoint-blue/25 text-setpoint-blue-text hover:bg-setpoint-blue/35"
                  : "bg-setpoint-red/25 text-setpoint-red-text hover:bg-setpoint-red/35"
              }`}
              title={`Eliminar ${p.name}`}
              aria-label={`Eliminar ${p.name} del equipo`}
            >
              <Avatar initials={initials(p.name)} className="h-5 w-5 text-[9px]" />
              <span className="truncate max-w-[100px] text-left">
                {p.name} • {levelStars(p.level)}
              </span>
              <X size={14} className="flex-shrink-0 ml-0.5" />
            </button>
          ))}
        </div>
      )}

      <div className="text-[11px] text-muted font-semibold">Agregar del pool</div>
      {available.length === 0 ? (
        <div className="text-xs text-muted py-2 text-center">Pool vacío</div>
      ) : (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto no-scrollbar">
          {available.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              compact
              trailing={
                <button
                  aria-label={`Agregar ${p.name}`}
                  disabled={teamFull}
                  className={cn(
                    "rounded-lg p-2 transition-colors",
                    teamFull
                      ? "cursor-not-allowed opacity-40"
                      : "text-muted hover:bg-card3"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (teamFull) return;
                    onAssign(p.id, team);
                  }}
                >
                  <Plus size={16} className={header} />
                </button>
              }
            />
          ))}
        </div>
      )}
    </Card>
  );
}
