import { useEffect } from "react";
import { Medal } from "lucide-react";
import { Card, Avatar } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast";
import { usePlayersStore } from "@/stores/usePlayersStore";
import { initials, levelStars } from "@/types/player";
import { formatTime } from "@/types/match";

export function StatsPage() {
  const { players, loading, error, loadPlayers, clearError } = usePlayersStore();

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (error) {
      showToast(error);
      clearError();
    }
  }, [error]);

  const ranked = [...players]
    .filter((p) => p.matches_played > 0)
    .sort((a, b) => {
      const winRateA = a.wins / a.matches_played;
      const winRateB = b.wins / b.matches_played;
      if (winRateB !== winRateA) return winRateB - winRateA;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.name.localeCompare(b.name);
    });

  const totalMatches = players.reduce((sum, p) => sum + p.matches_played, 0) / 2;
  const totalWins = players.reduce((sum, p) => sum + p.wins, 0);

  return (
    <div className="flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">
          📊 <span className="text-setpoint-yellow">Estadísticas</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="text-center py-3">
          <div className="text-2xl font-black text-setpoint-yellow tabular-nums">
            {Math.round(totalMatches)}
          </div>
          <div className="text-[11px] text-muted font-semibold">Partidos jugados</div>
        </Card>
        <Card className="text-center py-3">
          <div className="text-2xl font-black text-white tabular-nums">{totalWins}</div>
          <div className="text-[11px] text-muted font-semibold">Victorias totales</div>
        </Card>
      </div>

      {loading && players.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm">Cargando…</div>
      ) : ranked.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-12">
          <Medal size={48} className="text-muted" />
          <div className="text-sm text-muted max-w-xs">
            Las estadísticas aparecerán después del primer partido finalizado.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted font-semibold uppercase tracking-wide">
            Ranking por victorias
          </div>
          {ranked.map((p, i) => {
            const winRate = Math.round((p.wins / p.matches_played) * 100);
            return (
              <Card key={p.id} className="flex items-center gap-3">
                <div
                  className={`text-lg font-black w-7 text-center ${
                    i === 0
                      ? "text-setpoint-yellow"
                      : i === 1
                        ? "text-muted"
                        : i === 2
                          ? "text-setpoint-teal"
                          : "text-muted/60"
                  }`}
                >
                  {i + 1}
                </div>
                <Avatar initials={initials(p.name)} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{p.name}</div>
                  <div className="text-[11px] text-muted">
                    {levelStars(p.level)} · {p.matches_played} partidos
                    {p.last_match_at && (
                      <span> · Último: {formatTime(p.last_match_at)}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-setpoint-green">{p.wins}W</div>
                  <div className="text-[11px] text-setpoint-red-text">{p.losses}L</div>
                  <div className="text-[10px] text-muted">{winRate}%</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {players.length > 0 && ranked.length < players.length && (
        <div className="flex flex-col gap-2 mt-2">
          <div className="text-xs text-muted font-semibold uppercase tracking-wide">
            Sin partidos aún
          </div>
          {players
            .filter((p) => p.matches_played === 0)
            .map((p) => (
              <Card key={p.id} className="flex items-center gap-3 opacity-60">
                <Avatar initials={initials(p.name)} />
                <div className="flex-1">
                  <div className="text-sm font-bold">{p.name}</div>
                  <div className="text-[11px] text-muted">{levelStars(p.level)}</div>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
