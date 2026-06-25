import { Minus, Plus, Undo2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Pill } from "@/components/ui/card";
import {
  canUndo,
  currentSetTarget,
  formatDuration,
  formatSetsSummary,
  formatTime,
  matchDurationSecs,
  type ActiveMatch,
} from "@/types/match";
import type { Player } from "@/types/player";

interface ScoreboardViewProps {
  match: ActiveMatch;
  bluePlayers: Player[];
  redPlayers: Player[];
  onScore: (action: "blue_plus" | "blue_minus" | "red_plus" | "red_minus") => void;
  onUndo: () => void;
  onReset: () => void;
  minimal?: boolean;
  tick?: number;
}

export function ScoreboardView({
  match,
  bluePlayers,
  redPlayers,
  onScore,
  onUndo,
  onReset,
  minimal = false,
  tick = 0,
}: ScoreboardViewProps) {
  void tick;
  const duration = match.started_at ? matchDurationSecs(match.started_at) : 0;
  const target = currentSetTarget(match);

  return (
    <div className={`flex flex-col ${minimal ? "gap-6 p-6" : "gap-4"}`}>
      {!minimal && (
        <div className="flex flex-wrap items-center gap-2">
          {match.started_at && (
            <Pill variant="gray">
              {formatTime(match.started_at)} · {formatDuration(duration)}
            </Pill>
          )}
          {match.match_type !== "exhibition" && (
            <Pill variant="yellow">
              Sets {match.blue_sets}–{match.red_sets} · Set {match.current_set}
            </Pill>
          )}
          <Pill variant="gray">
            Meta {target} · win by 2
          </Pill>
          {match.completed_sets.length > 0 && (
            <Pill variant="gray">{formatSetsSummary(match.completed_sets)}</Pill>
          )}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
          <TeamScoreSide
            label="Azul"
            score={match.blue_score}
            sets={match.blue_sets}
            showSets={match.match_type !== "exhibition"}
            variant="blue"
            players={bluePlayers}
            onPlus={() => onScore("blue_plus")}
            onMinus={() => onScore("blue_minus")}
            large={minimal}
          />
          <div className="flex items-center justify-center px-3 bg-card2">
            <span className="text-sm font-extrabold text-muted">VS</span>
          </div>
          <TeamScoreSide
            label="Rojo"
            score={match.red_score}
            sets={match.red_sets}
            showSets={match.match_type !== "exhibition"}
            variant="red"
            players={redPlayers}
            onPlus={() => onScore("red_plus")}
            onMinus={() => onScore("red_minus")}
            large={minimal}
          />
        </div>
      </Card>

      {!minimal && match.completed_sets.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {match.completed_sets.map((s, i) => (
            <span key={i} className="text-xs font-bold tabular-nums bg-card2 px-2 py-1 rounded-lg">
              S{i + 1}: {s.blue}–{s.red}
            </span>
          ))}
        </div>
      )}

      <div className={`grid ${minimal ? "grid-cols-2" : "grid-cols-2"} gap-2`}>
        <Button variant="ghost" fullWidth onClick={onUndo} disabled={!canUndo(match)}>
          <Undo2 size={18} /> Deshacer
        </Button>
        <Button variant="ghost" fullWidth onClick={onReset}>
          <RotateCcw size={18} /> Reset
        </Button>
      </div>
    </div>
  );
}

function TeamScoreSide({
  label,
  score,
  sets,
  showSets,
  variant,
  players,
  onPlus,
  onMinus,
  large,
}: {
  label: string;
  score: number;
  sets: number;
  showSets: boolean;
  variant: "blue" | "red";
  players: Player[];
  onPlus: () => void;
  onMinus: () => void;
  large?: boolean;
}) {
  const bg = variant === "blue" ? "bg-setpoint-blue-dim" : "bg-setpoint-red-dim";
  const text = variant === "blue" ? "text-setpoint-blue-text" : "text-setpoint-red-text";
  const btn = variant === "blue" ? "blue" : "red";

  return (
    <div className={`flex flex-col items-center ${bg} p-4 gap-3`}>
      <div className={`text-xs font-bold ${text} uppercase tracking-wider`}>
        {label}
        {showSets && sets > 0 && <span className="ml-1">({sets})</span>}
      </div>
      <div
        className={`${large ? "text-8xl" : "text-6xl sm:text-7xl"} font-black text-white tabular-nums leading-none`}
      >
        {score}
      </div>
      <div className="flex gap-2 w-full">
        <Button variant="ghost" className="flex-1 min-h-[52px]" onClick={onMinus}>
          <Minus size={22} />
        </Button>
        <Button variant={btn as "blue" | "red"} className="flex-[2] min-h-[52px]" onClick={onPlus}>
          <Plus size={28} />
        </Button>
      </div>
      {!large && (
        <div className="flex flex-wrap gap-1 justify-center">
          {players.map((p) => (
            <span key={p.id} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${text}`}>
              {p.name.split(" ")[0]}
            </span>
          ))}
        </div>
      )}
      {large && (
        <div className={`text-lg font-bold ${text}`}>
          {players.map((p) => p.name.split(" ")[0]).join(" · ")}
        </div>
      )}
    </div>
  );
}
