import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { selectPoolPlayers } from "./playerSelectors";
import { TeamPanel } from "@/components/match/TeamPanel";
import { parseImportText } from "@/lib/playersApi";
import { selectWaitingQueue } from "@/stores/usePlayersStore";
import type { Player } from "@/types/player";

const players: Player[] = [
  {
    id: "p1",
    name: "José",
    level: 3,
    elo: 1300,
    arrival_time: "2026-06-24T18:00:00Z",
    waiting_since: "",
    queue_position: 0,
    matches_played: 10,
    wins: 4,
    losses: 6,
    status: "blue",
    court_since: "",
    last_match_at: "",
    created_at: "",
    updated_at: "",
  },
  {
    id: "p2",
    name: "Ángel",
    level: 4,
    elo: 1450,
    arrival_time: "2026-06-24T18:05:00Z",
    waiting_since: "2026-06-24T18:05:00Z",
    queue_position: 1,
    matches_played: 12,
    wins: 7,
    losses: 5,
    status: "waiting",
    court_since: "",
    last_match_at: "",
    created_at: "",
    updated_at: "",
  },
  {
    id: "p3",
    name: "Luis",
    level: 2,
    elo: 1180,
    arrival_time: "2026-06-24T18:10:00Z",
    waiting_since: "",
    queue_position: 0,
    matches_played: 8,
    wins: 2,
    losses: 6,
    status: "red",
    court_since: "",
    last_match_at: "",
    created_at: "",
    updated_at: "",
  },
  {
    id: "p4",
    name: "Miguel",
    level: 5,
    elo: 1580,
    arrival_time: "2026-06-24T18:15:00Z",
    waiting_since: "2026-06-24T18:15:00Z",
    queue_position: 2,
    matches_played: 20,
    wins: 15,
    losses: 5,
    status: "waiting",
    court_since: "",
    last_match_at: "",
    created_at: "",
    updated_at: "",
  },
];

describe("playerSelectors", () => {
  it("returns only waiting players in the pool", () => {
    const pool = selectPoolPlayers({ players });
    expect(pool.map((p) => p.id)).toEqual(["p2", "p4"]);
  });

  it("excludes already assigned players from the candidate pool", () => {
    const blueTeam = [players[0]];
    const redTeam = [players[2]];
    const assignedIds = new Set([...blueTeam, ...redTeam].map((p) => p.id));
    const pool = selectPoolPlayers({ players }).filter((p) => !assignedIds.has(p.id));

    expect(pool.map((p) => p.id)).toEqual(["p2", "p4"]);
  });

  it("parses imported players in order and preserves levels", () => {
    const text = `José 4
Luis 2
Miguel 5
Ángel 3
Pedro 4
María 1
Carla 2
Sofía 5
Pablo 3
Ale 4`;
    const rows = parseImportText(text);
    expect(rows.map((r) => r.name)).toEqual([
      "José",
      "Luis",
      "Miguel",
      "Ángel",
      "Pedro",
      "María",
      "Carla",
      "Sofía",
      "Pablo",
      "Ale",
    ]);
    expect(rows.map((r) => r.level)).toEqual([4, 2, 5, 3, 4, 1, 2, 5, 3, 4]);
  });

  it("returns waiting queue in arrival order", () => {
    const qPlayers: Player[] = [
      { ...players[0], status: "waiting", waiting_since: "2026-06-24T18:00:00Z", queue_position: 2 },
      { ...players[1], status: "waiting", waiting_since: "2026-06-24T17:55:00Z", queue_position: 1 },
      { ...players[2], status: "waiting", waiting_since: "2026-06-24T18:10:00Z", queue_position: 3 },
      { ...players[3], status: "waiting", waiting_since: "2026-06-24T17:50:00Z", queue_position: 0 },
    ];
    const queue = selectWaitingQueue({ players: qPlayers });
    expect(queue.map((p) => p.id)).toEqual(["p4", "p2", "p1", "p3"]);
  });

  it("renders team members with level stars and no trailing dash", () => {
    const markup = renderToStaticMarkup(
      <TeamPanel
        team="blue"
        label="Equipo Azul"
        players={[players[0]]}
        pool={[]}
        teamSize={4}
        onAssign={() => undefined}
      />
    );

    expect(markup).toContain("José");
    expect(markup).toContain("•");
    expect(markup).toContain("★★★☆☆");
    expect(markup).not.toContain("José -");
  });
});
