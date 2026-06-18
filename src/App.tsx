import { useState } from "react";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { Toast } from "@/components/ui/toast";

import { PlayersPage } from "./pages/PlayersPage";
import { MatchPage } from "@/pages/MatchPage";
import { ScoreboardPage } from "@/pages/ScoreboardPage";
import { QueuePage } from "@/pages/QueuePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { StatsPage } from "@/pages/StatsPage";


export default function App() {
  const [tab, setTab] = useState<Tab>("players");

  return (
    <div className="flex flex-col h-full safe-top">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {tab === "players" && <PlayersPage />}
        {tab === "match" && <MatchPage onGoScoreboard={() => setTab("scoreboard")} />}
        {tab === "scoreboard" && <ScoreboardPage />}
        {tab === "queue" && <QueuePage />}
        {tab === "stats" && <StatsPage />}
        {tab === "history" && <HistoryPage />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
      <Toast />
    </div>
  );
}
