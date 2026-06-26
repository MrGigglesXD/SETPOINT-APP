import type { MatchType, TargetScore, TeamSize } from "@/types/match";
import { Card } from "@/components/ui/card";

const TARGET_OPTIONS: TargetScore[] = [16, 21, 25];

export function FormatSelector({
  matchType,
  targetScore,
  teamSize,
  onMatchTypeChange,
  onTargetScoreChange,
  onTeamSizeChange,
}: {
  matchType: MatchType;
  targetScore: TargetScore;
  teamSize: TeamSize;
  onMatchTypeChange: (v: MatchType) => void;
  onTargetScoreChange: (v: TargetScore) => void;
  onTeamSizeChange: (v: TeamSize) => void;
}) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="text-sm font-bold">Formato del partido</div>

      <div className="grid grid-cols-2 gap-2">
        <RadioOption
          selected={teamSize === 4}
          onClick={() => onTeamSizeChange(4)}
          label="4 vs 4"
        />
        <RadioOption
          selected={teamSize === 6}
          onClick={() => onTeamSizeChange(6)}
          label="6 vs 6"
        />
      </div>

      <div className="text-[11px] text-muted font-semibold uppercase">Tipo de partido</div>
      <div className="grid grid-cols-3 gap-2">
        <RadioOption
          selected={matchType === "exhibition"}
          onClick={() => onMatchTypeChange("exhibition")}
          label="Exhibición"
          sub="1 set"
          compact
        />
        <RadioOption
          selected={matchType === "best_of_3"}
          onClick={() => onMatchTypeChange("best_of_3")}
          label="Oficial"
          sub="3 sets"
          compact
        />
        <RadioOption
          selected={matchType === "best_of_5"}
          onClick={() => onMatchTypeChange("best_of_5")}
          label="Oficial"
          sub="5 sets"
          compact
        />
      </div>

      {matchType === "exhibition" && (
        <>
          <div className="text-[11px] text-muted font-semibold uppercase">Puntos para ganar</div>
          <div className="grid grid-cols-3 gap-2">
            {TARGET_OPTIONS.map((pts) => (
              <RadioOption
                key={pts}
                selected={targetScore === pts}
                onClick={() => onTargetScoreChange(pts)}
                label={`${pts}`}
                sub="pts"
                compact
              />
            ))}
          </div>
        </>
      )}

      {matchType !== "exhibition" && (
        <div className="text-xs text-muted bg-card2 rounded-xl px-3 py-2">
          Sets a 25 pts · set decisivo a 15 · win by 2
        </div>
      )}
    </Card>
  );
}

function RadioOption({
  selected,
  onClick,
  label,
  sub,
  compact,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left active:opacity-80 ${
        selected ? "border-setpoint-yellow bg-setpoint-yellow/10" : "border-border2 bg-card2"
      } ${compact ? "flex-col items-center text-center py-2" : ""}`}
    >
      <span
        className={`h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
          selected ? "border-setpoint-yellow" : "border-muted"
        }`}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-setpoint-yellow" />}
      </span>
      <div>
        <div className={`font-bold ${compact ? "text-base" : "text-sm"}`}>{label}</div>
        {sub && <div className="text-[10px] text-muted">{sub}</div>}
      </div>
    </button>
  );
}
