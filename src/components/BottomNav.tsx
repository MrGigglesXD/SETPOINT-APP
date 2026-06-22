import { Users, Volleyball, Hourglass, BarChart3, History, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "players" | "match" | "scoreboard" | "queue" | "stats" | "history";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "players", label: "Jugadores", icon: Users },
  { id: "match", label: "Partido", icon: Volleyball },
  { id: "scoreboard", label: "Marcador", icon: Monitor },
  { id: "queue", label: "Cola", icon: Hourglass },
  { id: "stats", label: "Estadísticas", icon: BarChart3 },
  { id: "history", label: "Historial", icon: History },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-card border-t border-border2 flex z-50 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-muted transition-colors",
            active === id && "text-setpoint-yellow"
          )}
        >
          <Icon size={20} strokeWidth={2.2} />
          <span className="text-[9px] font-bold leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}
