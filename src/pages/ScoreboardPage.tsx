import { useEffect } from "react";
import { Monitor, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";
import { ScoreboardView } from "@/components/scoreboard/ScoreboardView";
import { useScoreboardController } from "@/hooks/useScoreboardController";

export function ScoreboardPage({ onGoTv }: { onGoTv?: () => void }) {
  const {
    matchData,
    bluePlayers,
    redPlayers,
    lastEvent,
    error,
    loadActive,
    loadPlayers,
    startMatch,
    score,
    undo,
    reset,
    finish,
    clearError,
    clearLastEvent,
    tick,
    isLive,
  } = useScoreboardController();

  useEffect(() => {
    if (error) {
      showToast(error);
      clearError();
    }
  }, [error]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === "set_completed") {
      const t = lastEvent.winner === "blue" ? "Azul" : "Rojo";
      showToast(`Set ${lastEvent.set_number}: ${lastEvent.blue_score}-${lastEvent.red_score} · ${t}`);
    } else {
      const t = lastEvent.winner === "blue" ? "Azul" : "Rojo";
      showToast(`✓ Gana ${t} — equipos rotados`);
      loadPlayers();
      loadActive();
    }
    clearLastEvent();
  }, [lastEvent]);

  async function handleStart() {
    try {
      await startMatch();
      await loadActive();
      showToast("🏐 Marcador activo");
    } catch {
      // toast
    }
  }

  if (!matchData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="text-lg font-bold">Sin partido configurado</div>
        <div className="text-sm text-muted">Arma equipos en la pestaña Partido primero.</div>
      </div>
    );
  }

  if (!isLive) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-xl font-extrabold">
          📺 <span className="text-setpoint-yellow">Marcador</span>
        </h1>
        <div className="text-sm text-muted">
          Equipos listos: {bluePlayers.length} azul · {redPlayers.length} rojo
        </div>
        <Button variant="yellow" fullWidth onClick={handleStart}>
          <Play size={18} /> Abrir marcador
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={onGoTv}
        >
          <Monitor size={18} /> Modo Solo Marcador (TV)
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">
          📺 <span className="text-setpoint-yellow">Marcador</span>
        </h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoTv}
        >
          <Monitor size={14} /> TV
        </Button>
      </div>
      <ScoreboardView
        match={matchData}
        bluePlayers={bluePlayers}
        redPlayers={redPlayers}
        onScore={(a) => score(a)}
        onUndo={() => undo()}
        onReset={() => reset()}
        onFinish={(w) => finish(w)}
        tick={tick}
      />
    </div>
  );
}
