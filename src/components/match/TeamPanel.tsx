import { Plus, X } from "lucide-react";
import { Card, Pill, Avatar } from "@/components/ui/card";
import { PlayerCard } from "@/components/players/PlayerCard";
import { initials, type Player } from "@/types/player";

export function TeamPanel({
  team,
  label,
  players,
  pool,
  onAssign,
}: {
  team: "blue" | "red";
  label: string;
  players: Player[];
  pool: Player[];
  onAssign: (id: string, side: "blue" | "red" | "none") => void;
}) {
  const border = team === "blue" ? "border-setpoint-blue/40" : "border-setpoint-red/40";
  const header = team === "blue" ? "text-setpoint-blue-text" : "text-setpoint-red-text";
  const teamIds = new Set(players.map((p) => p.id));
  const available = pool.filter((p) => !teamIds.has(p.id));

  return (
    <Card className={`border-2 ${border} flex flex-col gap-2.5`}>
      <div className="flex items-center justify-between">
        <div className={`text-sm font-bold ${header}`}>{label}</div>
        <Pill variant={team}>{players.length}</Pill>
      </div>

      {players.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => onAssign(p.id, "none")}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold active:opacity-70 ${
                team === "blue"
                  ? "bg-setpoint-blue/25 text-setpoint-blue-text"
                  : "bg-setpoint-red/25 text-setpoint-red-text"
              }`}
            >
              <Avatar initials={initials(p.name)} className="h-5 w-5 text-[9px]" />
              {p.name}
              <X size={12} className="opacity-60" />
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
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-card3"
                  onClick={() => onAssign(p.id, team)}
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
