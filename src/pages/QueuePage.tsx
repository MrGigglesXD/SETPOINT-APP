import { useEffect, useState } from "react";
import { RefreshCw, Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Avatar } from "@/components/ui/card";
import { showToast } from "@/components/ui/toast";
import { queueApi, type QueuePlayer } from "@/lib/queueApi";
import { initials, levelStars } from "@/types/player";

export function QueuePage() {
  const [queue, setQueue] = useState<QueuePlayer[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await queueApi.list();
      setQueue(data);
    } catch (e) {
      showToast(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  async function handleResetOrder() {
    try {
      const n = await queueApi.resetOrder();
      showToast(`✓ Orden actualizado (${n} jugadores)`);
      await load();
    } catch (e) {
      showToast(String(e));
    }
  }

  return (
    <div className="flex flex-col gap-3.5 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">
          ⏳ <span className="text-setpoint-yellow">Cola</span>
        </h1>
        <span className="text-xs text-muted font-semibold">{queue.length} en espera</span>
      </div>

      <Button variant="yellow" fullWidth onClick={handleResetOrder}>
        <RefreshCw size={18} /> Actualizar Orden
      </Button>

      <div className="text-xs text-muted">
        Orden automático por llegada. Se actualiza al cambiar equipos.
      </div>

      {loading && queue.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm">Cargando…</div>
      ) : queue.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Hourglass size={48} className="text-muted" />
          <div className="text-sm text-muted">Cola vacía — todos están en cancha o pool.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {queue.map((p, i) => (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="text-lg font-black text-setpoint-yellow w-6 text-center">{i + 1}</div>
              <Avatar initials={initials(p.name)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{p.name}</div>
                <div className="text-[11px] text-muted">
                  {levelStars(p.level)} · {p.wait_minutes}m esperando
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
