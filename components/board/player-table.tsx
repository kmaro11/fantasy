"use client";

import { BOARD_GRID } from "@/lib/config";
import { useData } from "@/lib/data-store";
import { useDraft } from "@/lib/draft-store";
import { takenMap, visiblePlayers } from "@/lib/selectors";
import type { SortKey } from "@/lib/types";
import { FilterBar } from "./filter-bar";
import { PlayerRow } from "./player-row";

export function PlayerTable() {
  const { history, filters, sortKey, sortDir, toggleSort, watchlist } = useDraft();
  const { players } = useData();
  const taken = takenMap(history);
  const rows = visiblePlayers(players, filters, taken, sortKey, sortDir, watchlist);

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === -1 ? " ↓" : " ↑") : "");

  return (
    <div className="flex min-w-[760px] flex-1 flex-col border-line border-r">
      <FilterBar shown={rows.length} total={players.length} />

      <div
        className={`grid ${BOARD_GRID} h-[26px] flex-none items-center border-line-head border-b bg-head px-3 text-[10px] text-fg-label tracking-[0.1em]`}
      >
        <div />
        <div className="text-center" title="Pasižymėti žaidėjai">
          ★
        </div>
        <button type="button" onClick={() => toggleSort("name")} className="text-left">
          ŽAIDĖJAS{arrow("name")}
        </button>
        <div>POZ</div>
        <div>KOMANDA</div>
        <div>PERNYKŠTĖ KOMANDA</div>
        <button type="button" onClick={() => toggleSort("min")} className="text-right">
          MIN{arrow("min")}
        </button>
        <button
          type="button"
          onClick={() => toggleSort("lastFp")}
          className="text-right"
          title="Pernykštis Modern FP — apskaičiuotas iš tikros statistikos"
        >
          PERNAI{arrow("lastFp")}
        </button>
        <button
          type="button"
          onClick={() => toggleSort("fp")}
          className="text-right"
          title="AI prognozė ateinančiam sezonui"
        >
          PROGN.{arrow("fp")}
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
