import { useEffect, useState } from "react";
import { useMatchStore } from "@/stores/useMatchStore";
import { usePlayersStore } from "@/stores/usePlayersStore";

type Options = {
  loadPlayers?: boolean;
};

export function useScoreboardController({
  loadPlayers = true,
}: Options = {}) {
  const matchStore = useMatchStore();
  const playersStore = usePlayersStore();

  const [tick, setTick] = useState(0);

  const isLive = matchStore.matchData?.phase === "live";

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        await matchStore.loadActive();

        if (loadPlayers) {
          await playersStore.loadPlayers();
        }
      } finally {
        // Ensure mounted before updating state
        if (!mounted) return;
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLive) return;

    const interval = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isLive]);

  // Derive blue/red players from canonical players store (enforce invariant)
  const bluePlayers = playersStore.players.filter((p) => p.status === "blue");
  const redPlayers = playersStore.players.filter((p) => p.status === "red");

  return {
    ...matchStore,

    // Computed team players from canonical store
    bluePlayers,
    redPlayers,
    players: playersStore.players,

    loadPlayers: playersStore.loadPlayers,

    tick,
    isLive,
  };
}