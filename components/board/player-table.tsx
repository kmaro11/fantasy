"use client";

import { BOARD_GRID } from "@/lib/config";
import { useDraft } from "@/lib/draft-store";
import { PLAYERS } from "@/lib/players";
import { takenMap, visiblePlayers } from "@/lib/selectors";
import type { SortKey } from "@/lib/types";
import { FilterBar } from "./filter-bar";
import { PlayerRow } from "./player-row";

export function PlayerTable() {
  const { history, filters, sortKey, sortDir, toggleSort } = useDraft();
  const taken = takenMap(history);
  const rows = visiblePlayers(filters, taken, sortKey, sortDir);

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === -1 ? " ↓" : " ↑") : "");

  return (
    <div className="flex min-w-[760px] flex-1 flex-col border-line border-r">
      <FilterBar shown={rows.length} total={PLAYERS.length} />

      <div
        className={`grid ${BOARD_GRID} h-[26px] flex-none items-center border-line-head border-b bg-head px-3 text-[10px] text-fg-label tracking-[0.1em]`}
      >
        <div />
        <button type="button" onClick={() => toggleSort("name")} className="text-left">
          ŽAIDĖJAS{arrow("name")}
        </button>
        <div>POZ</div>
        <div>KOMANDA</div>
        <div>PERNAI</div>
        <button type="button" onClick={() => toggleSort("min")} className="text-right">
          MIN{arrow("min")}
        </button>
        <button type="button" onClick={() => toggleSort("fp")} className="text-right">
          FP/G{arrow("fp")}
        </button>
        <div className="text-center">BŪKLĖ</div>
        <div />
      </div>

      <div className="flex-1 overflow-y-auto">
        {rows.map((player) => (
          <PlayerRow key={player.id} player={player} taken={taken.get(player.id)} />
        ))}
      </div>
    </div>
  );
}
