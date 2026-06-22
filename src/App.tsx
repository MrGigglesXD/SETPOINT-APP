import { useEffect, useState } from "react";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { Toast } from "@/components/ui/toast";

import { PlayersPage } from "./pages/PlayersPage";
import { MatchPage } from "@/pages/MatchPage";
import { ScoreboardPage } from "@/pages/ScoreboardPage";
import { QueuePage } from "@/pages/QueuePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { StatsPage } from "@/pages/StatsPage";
import { SoloScoreboardPage } from "@/pages/SoloScoreboardPage";


export default function App() {
  const [tab, setTab] = useState<Tab>("players");
  const [tvMode, setTvMode] = useState(() => window.location.hash.includes("marcador-solo"));

  useEffect(() => {
    const onHashChange = () => setTvMode(window.location.hash.includes("marcador-solo"));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function openTvMode() {
    window.location.hash = "marcador-solo";
    setTvMode(true);
  }

  function closeTvMode() {
    history.replaceState(null, "", window.location.pathname + window.location.search);
    setTvMode(false);
    setTab("scoreboard");
  }

  if (tvMode) {
    return (
      <>
        <SoloScoreboardPage onBack={closeTvMode} />
        <Toast />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {tab === "players" && <PlayersPage />}
        {tab === "match" && <MatchPage onGoScoreboard={() => setTab("scoreboard")} />}
        {tab === "scoreboard" && (
          <ScoreboardPage
            onGoTv={openTvMode}
            onNoActive={() => setTab("match")}
            onGoMatch={() => setTab("match")}
            onGoHistory={() => setTab("history")}
          />
        )}
        {tab === "queue" && <QueuePage />}
        {tab === "stats" && <StatsPage />}
        {tab === "history" && <HistoryPage />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
      <Toast />
    </div>
  );
}
