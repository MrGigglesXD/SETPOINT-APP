import { useEffect } from "react";
import { Monitor, Play, History, Home, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast";
import { ScoreboardView } from "@/components/scoreboard/ScoreboardView";
import { useScoreboardController } from "@/hooks/useScoreboardController";
//import { useMatchStore } from "@/stores/useMatchStore";
import { formatDuration } from "@/types/match";

export function ScoreboardPage({
  onGoTv,
  onNoActive,
  onGoMatch,
  onGoHistory,
}: {
  onGoTv?: () => void;
  onNoActive?: () => void;
  onGoMatch?: () => void;
  onGoHistory?: () => void;
}) {
  const {
    matchData,
    bluePlayers,
    redPlayers,
    players,
    lastEvent,
    matchResult,
    replayTeams,
    error,
    loading,
    loadActive,
    loadPlayers,
    loadHistory,
    startMatch,
    score,
    undo,
    reset,
    finish,
    generateOpponent,
    rematch,
    clearError,
    clearLastEvent,
    clearResult,
    tick,
    isLive,
  } = useScoreboardController();

  const resultBluePlayers = replayTeams
    ? replayTeams.blue
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean)
    : [];
  const resultRedPlayers = replayTeams
    ? replayTeams.red
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean)
    : [];

  useEffect(() => {
    if (error) {
      showToast(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.type === "set_completed") {
      const t = lastEvent.winner === "blue" ? "Azul" : "Rojo";
      showToast(`Set ${lastEvent.set_number}: ${lastEvent.blue_score}-${lastEvent.red_score} · ${t}`);
    } else {
      const t = lastEvent.winner === "blue" ? "Azul" : "Rojo";
      showToast(`✓ Gana ${t}`);
      loadPlayers();
      loadActive();
      loadHistory();
    }
    clearLastEvent();
  }, [lastEvent, loadPlayers, loadActive, loadHistory, clearLastEvent]);

// Do not auto-navigate away when there's no active match.
// Show a clear message and offer a button to go to the Match screen instead.

  async function handleStart() {
    try {
      await startMatch();
      await loadActive();
      showToast("🏐 Marcador activo");
    } catch {
      // toast
    }
  }

  async function handleNextMatch() {
    try {
      await generateOpponent();
      clearResult();
      await loadPlayers();
      await loadActive();
      loadHistory();
      showToast("✓ Equipos preparados");
    } catch {
      // toast
    }
  }

  async function handleRematch() {
    try {
      await rematch();
      showToast("✓ Revancha iniciada");
    } catch (e) {
      showToast(String(e));
    }
  }

  // Match result screen
  if (matchResult && resultBluePlayers.length > 0 && resultRedPlayers.length > 0) {
    const winnerTeam = matchResult.winner === "blue" ? "Azul" : "Rojo";
    const winnerPlayers = matchResult.winner === "blue" ? resultBluePlayers : resultRedPlayers;
    return (
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-xl font-extrabold text-center">🏆 Partido Finalizado</h1>
        
        <Card className="flex flex-col gap-4 p-6 text-center">
          <div className="text-3xl font-black text-setpoint-yellow">Gana {winnerTeam}</div>
          
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted">Azul</span>
              <span className="text-2xl font-bold">{matchResult.blue_score}</span>
            </div>
            <span className="text-muted">vs</span>
            <div className="flex flex-col items-center">
              <span className="text-xs text-muted">Rojo</span>
              <span className="text-2xl font-bold">{matchResult.red_score}</span>
            </div>
          </div>

          {matchResult.match_type !== "exhibition" && (
            <div className="text-xs text-muted">
              Sets {matchResult.blue_sets}–{matchResult.red_sets}
            </div>
          )}
          
          <div className="text-xs text-muted">
            ⏱ {formatDuration(matchResult.duration_secs)}
          </div>

          <div className="text-xs">
            <span className="font-semibold">{winnerTeam}:</span> {winnerPlayers.map((p: any) => p.name).join(", ")}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid grid-cols-1 gap-2">
            <Button variant="yellow" fullWidth onClick={handleNextMatch} disabled={loading}>
              <RotateCw size={16} /> Generar siguiente partido
            </Button>
            <Button variant="ghost" fullWidth onClick={handleRematch} disabled={!replayTeams || loading}>
              Revancha
            </Button>
          </div>
          <Button 
            variant="ghost"
            onClick={() => {
              clearResult();
              onGoMatch?.();
            }}
          >
            ✏ Editar
          </Button>
          <Button 
            variant="ghost"
            onClick={onGoHistory}
          >
            <History size={16} /> Historial
          </Button>
          <Button 
            variant="ghost"
            onClick={() => {
              clearResult();
              onNoActive?.();
            }}
          >
            <Home size={16} /> Inicio
          </Button>
        </div>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="text-lg font-bold">No existe un partido activo</div>
        <div className="text-sm text-muted">Arma equipos en la pestaña Partido primero.</div>
        <div className="flex gap-2 mt-2">
          <Button variant="yellow" onClick={() => onGoMatch?.()}>Ir a Partido</Button>
        </div>
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
