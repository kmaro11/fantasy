"use client";

import { lastSeasonLine } from "@/lib/analysis";
import { BOARD_GRID } from "@/lib/config";
import { useDraft } from "@/lib/draft-store";
import { TIER_BG } from "@/lib/tiers";
import type { Pick, Player, Status } from "@/lib/types";

const STATUS_CLASS: Record<Status, string> = {
  out: "text-tier-4 bg-tint-red",
  doubtful: "text-tier-3 bg-tint-amber",
  ready: "text-status-ready bg-tint-neutral",
};

export function PlayerRow({ player, taken }: { player: Player; taken: Pick | undefined }) {
  const { select, take } = useDraft();
  const isOut = player.status === "out";

  return (
    <div
      className={`grid ${BOARD_GRID} h-7 items-center border-line-soft border-b px-3 hover:bg-row-hover ${
        taken ? "bg-row-taken opacity-40" : isOut ? "bg-row-out opacity-55" : ""
      }`}
    >
      <div className={`h-5 w-1.5 rounded-[1px] ${TIER_BG[player.tier]}`} />

      <button
        type="button"
        onClick={() => select(player.id)}
        className="flex min-w-0 items-center gap-2 text-left"
      >
        <span
          className={`truncate font-semibold text-[13px] ${
            taken ? "text-fg-label line-through" : "text-fg-strong"
          }`}
        >
          {player.name}
        </span>
        <span className="flex-none font-mono text-[10px] text-fg-dim">
          {taken ? (taken.mine ? "AŠ" : "paimtas") : ""}
        </span>
      </button>

      <div className="font-mono text-[11px] text-fg-muted">{player.pos}</div>
      <div className="truncate text-[12px] text-fg-soft">{player.team}</div>
      <div className="truncate text-[12px] text-fg-muted">
        {player.lastLeague === "-" ? "— nėra duomenų" : lastSeasonLine(player)}
      </div>
      <div className="text-right font-mono text-[12px] text-fg-soft">
        {player.lastLeague === "-" ? "—" : player.min.toFixed(1)}
      </div>
      <div className="text-right font-medium font-mono text-[13px] text-fg-strong">
        {player.fp.toFixed(1)}
      </div>
      <div className="text-center">
        <span
          className={`rounded-[2px] px-[5px] py-0.5 font-mono text-[10px] tracking-[0.04em] ${STATUS_CLASS[player.status]}`}
        >
          {player.status}
        </span>
      </div>

      <div className={`flex justify-end gap-1 ${taken ? "invisible" : ""}`}>
        <button
          type="button"
          onClick={() => take(player.id, false)}
          className="rounded-[3px] border border-control-line bg-control px-[7px] py-[3px] font-semibold text-[11px] text-fg-muted hover:bg-control-hover hover:text-fg"
        >
          Paėmė kitas
        </button>
        <button
          type="button"
          onClick={() => take(player.id, true)}
          className="rounded-[3px] border border-accent-line bg-accent px-2 py-[3px] font-bold text-[11px] text-base hover:bg-accent-hover"
        >
          Imu aš
        </button>
      </div>
    </div>
  );
}
