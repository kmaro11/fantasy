"use client";

import { useDraft } from "@/lib/draft-store";
import { TEAMS } from "@/lib/players";
import { TIER_BG, TIER_LABEL, TIERS } from "@/lib/tiers";
import type { League, Position, Tier } from "@/lib/types";

function chip(active: boolean): string {
  return active
    ? "border-chip-on-line bg-chip-on text-fg-bright"
    : "border-chip-line bg-chip text-fg-muted";
}

const POSITIONS: [Position | "ALL", string][] = [
  ["ALL", "VISI"],
  ["G", "G"],
  ["F", "F"],
  ["C", "C"],
];

const LEAGUES: [League | "ALL", string][] = [
  ["ALL", "Bet kur"],
  ["EL", "Eurolyga"],
  ["EC", "EuroCup"],
  ["kita", "Kita lyga"],
  ["-", "Nėra duomenų"],
];

export function FilterBar({ shown, total }: { shown: number; total: number }) {
  const { filters, setFilter } = useDraft();

  return (
    <div className="flex flex-none flex-wrap items-center gap-x-3.5 gap-y-1.5 border-line border-b bg-surface px-3 py-2">
      <input
        value={filters.query}
        onChange={(e) => setFilter({ query: e.target.value })}
        placeholder="Paieška…"
        className="w-[180px] rounded-[3px] border border-line-strong bg-control px-2 py-[5px] text-[13px] text-fg-strong outline-none placeholder:text-fg-dim focus:border-chip-on-line"
      />

      <div className="flex gap-[3px]">
        {POSITIONS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter({ pos: value })}
            className={`rounded-[3px] border px-[9px] py-1 font-mono font-semibold text-[12px] ${chip(filters.pos === value)}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-[3px]">
        <button
          type="button"
          onClick={() => setFilter({ tier: "ALL" })}
          className={`flex items-center gap-1.5 rounded-[3px] border px-[9px] py-1 font-semibold text-[12px] ${chip(filters.tier === "ALL")}`}
        >
          <span className="size-[7px] rounded-[1px] bg-fg-dim" />
          Visos pakopos
        </button>
        {TIERS.map((tier: Tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setFilter({ tier })}
            className={`flex items-center gap-1.5 rounded-[3px] border px-[9px] py-1 font-semibold text-[12px] ${chip(filters.tier === tier)}`}
          >
            <span className={`size-[7px] rounded-[1px] ${TIER_BG[tier]}`} />
            {TIER_LABEL[tier]}
          </button>
        ))}
      </div>

      <div className="flex gap-[3px]">
        {LEAGUES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter({ league: value })}
            className={`rounded-[3px] border px-[9px] py-1 font-medium text-[12px] ${chip(filters.league === value)}`}
          >
            {label}
          </button>
        ))}
      </div>

      <select
        value={filters.team}
        onChange={(e) => setFilter({ team: e.target.value })}
        className="rounded-[3px] border border-line-strong bg-control px-1.5 py-[5px] text-[12px] text-fg-value outline-none"
      >
        <option value="ALL">Visos komandos</option>
        {TEAMS.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setFilter({ showTaken: !filters.showTaken })}
        className="flex items-center gap-[7px] text-[12px] text-fg-soft"
      >
        <span
          className={`relative h-[15px] w-[26px] rounded-lg transition-colors ${filters.showTaken ? "bg-accent" : "bg-line-strong"}`}
        >
          <span
            className={`absolute top-0.5 size-[11px] rounded-full bg-base transition-[left] ${filters.showTaken ? "left-[13px]" : "left-0.5"}`}
          />
        </span>
        Rodyti paimtus
      </button>

      <div className="font-mono text-[12px] text-fg-dim">
        {shown} / {total} žaidėjų
      </div>
    </div>
  );
}
