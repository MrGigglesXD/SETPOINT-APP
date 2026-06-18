import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreboardView } from "@/components/scoreboard/ScoreboardView";
import { useScoreboardController } from "@/hooks/useScoreboardController";

export function SoloScoreboardPage({ onBack }: { onBack?: () => void }) {
  const { matchData, bluePlayers, redPlayers, score, undo, reset, tick } =
    useScoreboardController({ loadPlayers: false });

  if (!matchData || matchData.phase !== "live") {
    return (
      <div className="flex h-screen flex-col bg-background">
        <div className="p-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={16} /> Volver
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center text-muted text-xl font-bold">
          Esperando partido en vivo…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={16} /> Volver
        </Button>
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <ScoreboardView
          match={matchData}
          bluePlayers={bluePlayers}
          redPlayers={redPlayers}
          onScore={(a) => score(a)}
          onUndo={() => undo()}
          onReset={() => reset()}
          minimal
          tick={tick}
        />
      </div>
    </div>
  );
}
