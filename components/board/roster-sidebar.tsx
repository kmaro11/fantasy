"use client";

import { ROSTER_SIZE } from "@/lib/config";
import { useData } from "@/lib/data-store";
import { useDraft } from "@/lib/draft-store";
import { myRoster, rosterNeeds } from "@/lib/selectors";
import { snakeInfo } from "@/lib/snake";
import { TIER_BG } from "@/lib/tiers";
import type { Position } from "@/lib/types";

const POSITIONS: Position[] = ["G", "F", "C"];

export function RosterSidebar() {
  const { history, settings } = useDraft();
  const { players } = useData();
  const roster = myRoster(history, players);
  const needs = rosterNeeds(roster);
  const totalFp = roster.reduce((a, p) => a + p.fp, 0);
  const snake = snakeInfo(settings.myPickSlot, settings.teamCount, ROSTER_SIZE, history.length);
  const myTurn = snake.untilNext === 0;

  const slots = Array.from({ length: ROSTER_SIZE }, (_, i) => roster[i]);
  const recent = [...history].reverse().slice(0, 7);

  return (
    <aside className="flex w-[min(280px,24vw)] min-w-[220px] flex-none flex-col overflow-y-auto bg-surface">
      <div className="border-line border-b px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] text-fg-label tracking-[0.12em]">MANO SUDĖTIS</div>
          <div className="font-mono text-[12px] text-fg-muted">
            {roster.length}/{ROSTER_SIZE}
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <div className="font-bold font-mono text-[22px] text-fg-strong">{totalFp.toFixed(1)}</div>
          <div className="text-[11px] text-fg-label">prognozuojami FP / rungtynės</div>
        </div>
      </div>

      <div
        className={`border-line border-b px-3 py-2 ${myTurn ? "bg-tint-green" : ""}`}
        title="Snake eiliškumas: 1→8, 8→1, 1→8…"
      >
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] text-fg-label tracking-[0.12em]">
            SNAKE · #{settings.myPickSlot} iš {settings.teamCount}
          </div>
          <div className="font-mono text-[11px] text-fg-dim">
            {snake.currentRound} raundas · {history.length}/{snake.totalPicks}
          </div>
        </div>

        <div className="mt-1 flex items-baseline gap-2">
          {snake.nextPick === null ? (
            <div className="text-[12px] text-fg-muted">Pikų nebeliko.</div>
          ) : myTurn ? (
            <>
              <div className="font-bold font-mono text-[20px] text-tier-1 leading-none">
                TAVO EILĖ
              </div>
              <div className="text-[11px] text-fg-label">pikas #{snake.nextPick}</div>
            </>
          ) : (
            <>
              <div className="font-bold font-mono text-[20px] text-fg-strong leading-none">
                {snake.untilNext}
              </div>
              <div className="text-[11px] text-fg-label">
                {snake.untilNext === 1 ? "pikas" : "pikai"} iki #{snake.nextPick}
              </div>
            </>
          )}
        </div>

        {snake.gapAfterNext !== null && (
          <div className="mt-0.5 text-[10px] text-fg-dim">
            po jo laukti dar {snake.gapAfterNext} — imk du, kurių neatsiimsi vėliau
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-px border-line border-b bg-line">
        {POSITIONS.map((pos) => {
          const filled = needs.counts[pos] > 0;
          const urgent = needs.remaining <= needs.missing.length + 1;
          return (
            <div key={pos} className="bg-cell px-2 py-[7px]">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[11px] text-fg-muted">{pos}</div>
                <div
                  className={`size-1.5 rounded-full ${filled ? "bg-tier-1" : urgent ? "bg-tier-4" : "bg-tier-3"}`}
                />
              </div>
              <div className={`font-mono text-[16px] ${filled ? "text-fg-strong" : "text-tier-3"}`}>
                {needs.counts[pos]}
              </div>
            </div>
          );
        })}
      </div>

      {needs.warn && (
        <div className="mx-3 my-2 rounded-[3px] border border-danger-line bg-danger-bg px-[9px] py-[7px] text-[11px] text-danger-fg leading-[1.4]">
          Liko {needs.remaining} vietos, o dar nėra: {needs.missing.join(", ")}. Rezervuok pikus
          reikalavimui.
        </div>
      )}

      <div className="py-1.5">
        {slots.map((player, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: vieta sudėtyje ir yra jos tapatybė
            key={i}
            className="grid h-[26px] grid-cols-[20px_6px_1fr_34px_46px] items-center gap-1.5 border-line-row border-b px-3"
          >
            <div className="font-mono text-[10px] text-fg-faint">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div
              className={`h-3.5 w-[5px] rounded-[1px] ${player ? TIER_BG[player.tier] : "bg-tier-empty"}`}
            />
            <div
              className={`truncate text-[12px] ${player ? "font-semibold text-fg-strong" : "text-fg-ghost"}`}
            >
              {player ? player.name : "tuščia"}
            </div>
            <div className="font-mono text-[10px] text-fg-label">{player ? player.pos : "—"}</div>
            <div className="text-right font-mono text-[12px] text-fg-value">
              {player ? player.fp.toFixed(1) : "—"}
            </div>
          </div>
        ))}
      </div>

      <div className="border-line border-t px-3 py-2.5">
        <div className="mb-1.5 text-[10px] text-fg-label tracking-[0.12em]">
          PASKUTINIAI PAŽYMĖTI
        </div>
        {recent.map((pick, i) => {
          const player = players.find((p) => p.id === pick.playerId);
          if (!player) return null;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: tas pats žaidėjas gali kartotis istorijoje
              key={`${pick.playerId}-${i}`}
              className="grid h-[22px] grid-cols-[26px_6px_1fr] items-center gap-1.5"
            >
              <div
                className={`font-mono text-[10px] ${pick.mine ? "text-accent" : "text-fg-faint"}`}
              >
                {pick.mine ? "AŠ" : "·"}
              </div>
              <div className={`h-3 w-[5px] rounded-[1px] ${TIER_BG[player.tier]}`} />
              <div className={`truncate text-[12px] ${pick.mine ? "text-accent" : "text-fg-mild"}`}>
                {player.name} · {player.team}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
