import { useEffect, useState } from "react";
import { useMatchStore } from "@/stores/useMatchStore";
import { usePlayersStore } from "@/stores/usePlayersStore";

export function useScoreboardController({ loadPlayers = true } = {}) {
  const matchStore = useMatchStore();
  const playersStore = usePlayersStore();
  const [tick, setTick] = useState(0);
  const isLive = matchStore.matchData?.phase === "live";

  useEffect(() => {
    matchStore.loadActive();
    if (loadPlayers) {
      playersStore.loadPlayers();
    }
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  return {
    ...matchStore,
    loadPlayers: playersStore.loadPlayers,
    tick,
    isLive,
  };
}
