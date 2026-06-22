import { useEffect } from "react";
import { Trophy } from "lucide-react";
import { Card, Pill } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast";
import { useMatchStore } from "@/stores/useMatchStore";
import {
  formatDate,
  formatDuration,
  formatMatchFormatHistory,
  formatSetsSummary,
  formatTime,
} from "@/types/match";

export function HistoryPage() {
  const { history, loading, error, loadHistory, clearError } = useMatchStore();

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (error) {
      showToast(error);
      clearError();
    }
  }, [error]);

  return (
    <div className="flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">
          📜 <span className="text-setpoint-yellow">Historial</span>
        </h1>
        <span className="text-xs text-muted font-semibold">
          {history.length} partido{history.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading && history.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm">Cargando…</div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-3 py-12">
          <Trophy size={48} className="text-muted" />
          <div className="text-sm text-muted max-w-xs">
            Aún no hay partidos finalizados. Completa un partido en la pestaña Partido.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {history.map((m: any) => (
              <Card key={m.id} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold">{formatDate(m.finished_at || m.date)}</div>
                <Pill variant={m.winner === "blue" ? "blue" : "red"}>
                  {m.winner === "blue" ? "Azul gana" : "Rojo gana"}
                </Pill>
              </div>

              <div className="text-[11px] text-muted font-semibold">
                {formatMatchFormatHistory(m)}
              </div>

              {m.match_type !== "exhibition" && m.sets.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div className="text-center text-sm font-black text-setpoint-yellow tabular-nums">
                    Sets {m.blue_sets} – {m.red_sets}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                      {m.sets.map((s: any, i: number) => (
                      <div
                        key={i}
                        className="bg-card2 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums"
                      >
                        <span className="text-muted mr-1">S{i + 1}</span>
                        <span className="text-setpoint-blue-text">{s.blue}</span>
                        <span className="text-muted mx-0.5">-</span>
                        <span className="text-setpoint-red-text">{s.red}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4 py-1">
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-setpoint-blue-text uppercase">
                      Azul
                    </div>
                    <div className="text-3xl font-black text-white tabular-nums">
                      {m.sets[0]?.blue ?? m.blue_score}
                    </div>
                  </div>
                  <div className="text-muted text-xs font-bold">vs</div>
                  <div className="text-center">
                    <div className="text-[10px] font-bold text-setpoint-red-text uppercase">
                      Rojo
                    </div>
                    <div className="text-3xl font-black text-white tabular-nums">
                      {m.sets[0]?.red ?? m.red_score}
                    </div>
                  </div>
                </div>
              )}

              {m.match_type !== "exhibition" && m.sets.length > 0 && (
                <div className="text-center text-[11px] text-muted">
                  {formatSetsSummary(m.sets)}
                </div>
              )}

              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span>
                  {formatTime(m.started_at)} → {formatTime(m.finished_at)}
                </span>
                <span>· {formatDuration(m.duration_secs)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <div className="font-bold text-setpoint-blue-text mb-0.5">Azul</div>
                  <div className="text-muted leading-relaxed">
                    {m.blue_players.join(", ") || "—"}
                  </div>
                </div>
                <div>
                  <div className="font-bold text-setpoint-red-text mb-0.5">Rojo</div>
                  <div className="text-muted leading-relaxed">
                    {m.red_players.join(", ") || "—"}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
