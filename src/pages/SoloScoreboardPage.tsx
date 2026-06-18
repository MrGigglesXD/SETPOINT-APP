import { useEffect, useState } from "react";
import { ScoreboardView } from "@/components/scoreboard/ScoreboardView";
import { useMatchStore } from "@/stores/useMatchStore";

export function SoloScoreboardPage() {
  const { matchData, bluePlayers, redPlayers, loadActive, score, undo, reset } = useMatchStore();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    loadActive();
  }, []);

  useEffect(() => {
    if (matchData?.phase !== "live") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [matchData?.phase]);

  if (!matchData || matchData.phase !== "live") {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-muted text-xl font-bold">
        Esperando partido en vivo…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center">
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
  );
}
