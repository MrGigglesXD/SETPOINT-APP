import { useEffect, useState } from "react";
import { Play, Shuffle, Swords, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { showToast } from "@/components/ui/toast";
import { FormatSelector } from "@/components/match/FormatSelector";
import { TeamPanel } from "@/components/match/TeamPanel";
import { useMatchStore, type MatchFormatConfig } from "@/stores/useMatchStore";
import { usePlayersStore } from "@/stores/usePlayersStore";
import { selectBlueTeam, selectPoolPlayers, selectRedTeam } from "@/lib/playerSelectors";
import { teamsApi } from "@/lib/teamsApi";
import type { MatchType, TargetScore, TeamSize } from "@/types/match";

export function MatchPage({ onGoScoreboard }: { onGoScoreboard?: () => void }) {
  const {
    matchData,
    loading,
    error,
    loadActive,
    setupTeams,
    startMatch,
    cancel,
    generateOpponent,
    clearError,
  } =
    useMatchStore();
  const { players, loadPlayers } = usePlayersStore();

  const [matchType, setMatchType] = useState<MatchType>("exhibition");
  const [targetScore, setTargetScore] = useState<TargetScore>(21);
  const [teamSize, setTeamSize] = useState<TeamSize>(4);
  const [showCancel, setShowCancel] = useState(false);

  const format: MatchFormatConfig = { matchType, targetScore, teamSize };
  const pool = selectPoolPlayers({ players });
  const blueTeam = selectBlueTeam({ players });
  const redTeam = selectRedTeam({ players });
  const isSetup = matchData?.phase === "setup";

  useEffect(() => {
    loadActive();
    loadPlayers();
  }, []);

  useEffect(() => {
    if (error) {
      showToast(error);
      clearError();
    }
  }, [error]);

  useEffect(() => {
    if (matchData) {
      setMatchType(matchData.match_type ?? "exhibition");
      setTargetScore((matchData.target_score as TargetScore) || 21);
      setTeamSize((matchData.team_size as TeamSize) || 4);
    }
  }, [matchData?.match_id]);

  async function refresh() {
    await loadPlayers();
    await loadActive();
  }

  async function handleAssign(playerId: string, team: "blue" | "red" | "none") {
    if (team !== "none") {
      const teamPlayers = team === "blue" ? blueTeam : redTeam;
      if (teamPlayers.length >= teamSize) {
        showToast("El equipo ya alcanzó el formato seleccionado");
        return;
      }
    }

    try {
      await teamsApi.assign(playerId, team);
      await refresh();
    } catch {
      // toast via store
    }
  }

  async function handleGenerate() {
    try {
      await teamsApi.generateBalanced(teamSize);
      await refresh();
      showToast("✓ Equipos balanceados");
    } catch (e) {
      showToast(String(e));
    }
  }

  async function handleTeamSizeChange(size: TeamSize) {
    if (size === teamSize) return;
    setTeamSize(size);

    if (matchData?.phase === "setup" && (blueTeam.length > 0 || redTeam.length > 0)) {
      try {
        await cancel();
        await refresh();
        showToast("Formato cambiado: equipos y pool reiniciados");
      } catch {
        // ignore, toast handled by store
      }
    }
  }

  async function handleMatchTypeChange(type: MatchType) {
    if (type === matchType) return;
    setMatchType(type);

    if (matchData?.phase === "setup" && (blueTeam.length > 0 || redTeam.length > 0)) {
      try {
        await cancel();
        await refresh();
        showToast("Formato cambiado: equipos y pool reiniciados");
      } catch {
        // ignore, toast handled by store
      }
    }
  }

  async function handleTargetScoreChange(score: TargetScore) {
    if (score === targetScore) return;
    setTargetScore(score);

    if (matchData?.phase === "setup" && (blueTeam.length > 0 || redTeam.length > 0)) {
      try {
        await cancel();
        await refresh();
        showToast("Formato cambiado: equipos y pool reiniciados");
      } catch {
        // ignore, toast handled by store
      }
    }
  }

  async function handleGenerateOpponent() {
    try {
      await generateOpponent();
      await refresh();
      showToast("✓ Equipo contrincante generado");
    } catch (e) {
      showToast(String(e));
    }
  }

  async function handleSave() {
    if (blueTeam.length !== teamSize || redTeam.length !== teamSize) {
      showToast(`Cada equipo debe tener ${teamSize} jugadores`);
      return;
    }
    try {
      await setupTeams(
        blueTeam.map((p) => p.id),
        redTeam.map((p) => p.id),
        format
      );
      await refresh();
      showToast("✓ Equipos guardados");
    } catch {
      // toast
    }
  }

  async function handleStart() {
    if (blueTeam.length !== teamSize || redTeam.length !== teamSize) {
      showToast(`Cada equipo debe tener ${teamSize} jugadores`);
      return;
    }
    try {
      await setupTeams(
        blueTeam.map((p) => p.id),
        redTeam.map((p) => p.id),
        format
      );
      await startMatch();
      await refresh();
      showToast("🏐 Partido listo — ve al Marcador");
      onGoScoreboard?.();
    } catch {
      // toast
    }
  }

  async function handleCancel() {
    try {
      await cancel();
      await refresh();
      setShowCancel(false);
      showToast("Configuración cancelada");
    } catch {
      // toast
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">
          🏐 <span className="text-setpoint-yellow">Partido</span>
        </h1>
        {isSetup && <Pill variant="yellow">Equipos listos</Pill>}
      </div>

      <FormatSelector
        matchType={matchType}
        targetScore={targetScore}
        teamSize={teamSize}
        onMatchTypeChange={handleMatchTypeChange}
        onTargetScoreChange={handleTargetScoreChange}
        onTeamSizeChange={handleTeamSizeChange}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant="yellow" fullWidth onClick={handleGenerate}>
          <Shuffle size={18} /> Generar Equipos Balanceados
        </Button>
        <Button variant="ghost" fullWidth onClick={handleGenerateOpponent} disabled={!matchData}>
          <Swords size={18} /> Generar Equipo Contrincante
        </Button>
      </div>

      <TeamPanel team="blue" label="Equipo Azul" players={blueTeam} pool={pool} teamSize={teamSize} onAssign={handleAssign} />
      <TeamPanel team="red" label="Equipo Rojo" players={redTeam} pool={pool} teamSize={teamSize} onAssign={handleAssign} />

      <div className="text-xs text-muted text-center">
        Pool: {pool.length} jugador{pool.length === 1 ? "" : "es"} disponibles
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={handleSave} disabled={loading}>
          Guardar equipos
        </Button>
        <Button
          variant="yellow"
          onClick={handleStart}
          disabled={blueTeam.length === 0 || redTeam.length === 0}
        >
          <Play size={18} /> Iniciar partido
        </Button>
      </div>

      {isSetup && (
        <Button variant="ghost" size="sm" onClick={() => setShowCancel(true)}>
          <X size={14} /> Cancelar configuración
        </Button>
      )}

      <Modal
        open={showCancel}
        title="¿Cancelar configuración?"
        description="Se borrarán los equipos seleccionados."
        onClose={() => setShowCancel(false)}
        actions={[{ label: "Confirmar", onClick: handleCancel, variant: "red" }]}
      />
    </div>
  );
}
