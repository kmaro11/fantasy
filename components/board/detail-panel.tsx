"use client";

import {
  aiSummary,
  CONFIDENCE_CLASS,
  CONFIDENCE_LABEL,
  competition,
  competitionNote,
  confidence,
  lastSeasonLine,
  projectedMinutes,
  seasonStats,
} from "@/lib/analysis";
import { useData } from "@/lib/data-store";
import { useDraft } from "@/lib/draft-store";
import { LEAGUE_LABEL } from "@/lib/players";
import { takenMap } from "@/lib/selectors";
import { TIER_BG, TIER_LABEL } from "@/lib/tiers";

const COMP_GRID = "grid-cols-[1.5fr_46px_46px_46px_46px]";

function SectionLabel({ children }: { children: string }) {
  return <div className="mb-[7px] text-[10px] text-fg-dim tracking-[0.12em]">{children}</div>;
}

export function DetailPanel() {
  const { selectedId, select, history, take, toggleWatch, isWatched } = useDraft();
  const { players } = useData();
  if (selectedId === null) return null;

  const player = players.find((p) => p.id === selectedId);
  if (!player) return null;

  const taken = takenMap(history).get(player.id);
  const other = player.lastSeasonOther ?? null;
  const noData = player.lastLeague === "-" && !other;
  const comp = competition(player, players);
  const conf = confidence(player);
  const evaluation = player.evaluation;

  const state = taken ? (taken.mine ? "mano sudėtyje" : "paimtas") : "laisvas";
  const watched = isWatched(player.sourceId);

  return (
    <aside className="flex w-[min(400px,34vw)] min-w-[320px] flex-none flex-col overflow-y-auto border-line border-r bg-panel">
      <div className="sticky top-0 flex items-start gap-2.5 border-line border-b bg-panel px-3.5 py-3">
        <div className={`w-1.5 self-stretch rounded-[1px] ${TIER_BG[player.tier]}`} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[19px] text-fg-bright leading-[1.1]">{player.name}</div>
          <div className="mt-[3px] font-mono text-[11px] text-fg-muted">
            {player.pos} · {player.team} · {state}
          </div>
          <div
            className={`mt-[7px] inline-block rounded-[2px] px-[7px] py-0.5 font-bold text-[11px] text-base tracking-[0.06em] ${TIER_BG[player.tier]}`}
          >
            {TIER_LABEL[player.tier]}
          </div>
        </div>
        {/* Žymėti patogiausia čia pat — sprendimas gimsta perskaičius vertinimą. */}
        <button
          type="button"
          disabled={!player.sourceId}
          onClick={() => player.sourceId && toggleWatch(player.sourceId)}
          title={watched ? "Pašalinti iš pasižymėtų" : "Pasižymėti"}
          className={`flex-none rounded-[3px] border px-[7px] py-[3px] text-[13px] leading-none disabled:opacity-30 ${
            watched
              ? "border-accent-star-line bg-accent-star-bg text-accent-star"
              : "border-control-line bg-control text-fg-dim hover:text-fg-soft"
          }`}
        >
          {watched ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={() => select(null)}
          className="px-0.5 text-[16px] text-fg-dim hover:text-fg"
        >
          ✕
        </button>
      </div>

      {other ? (
        <div className="px-3.5 pt-3 pb-1.5">
          <SectionLabel>{`PERNYKŠTĖ STATISTIKA · ${other.league} · ${other.club}`}</SectionLabel>
          <div className="grid grid-cols-4 gap-px border border-line bg-line">
            {[
              { k: "RUNG", v: other.gamesPlayed },
              { k: "MIN", v: other.minutesPerGame },
              { k: "TŠK", v: other.points },
              { k: "ATK", v: other.totalRebounds },
              { k: "REZ.PERD", v: other.assists },
              { k: "PERIMTI", v: other.steals },
              { k: "BLOKAI", v: other.blocks },
              { k: "KLAIDOS", v: other.turnovers },
            ].map((o) => (
              <div key={o.k} className="bg-cell px-1.5 py-[7px]">
                <div className="text-[9px] text-fg-dim tracking-[0.06em]">{o.k}</div>
                <div className="mt-0.5 font-medium font-mono text-[15px] text-fg-strong">
                  {o.v === null || o.v === undefined ? "—" : o.v}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 rounded-[3px] border border-warn-line bg-warn-bg px-[11px] py-[9px] text-[11px] text-warn-fg leading-[1.45]">
            Tai <b>{other.league}</b>, ne Eurolyga — Modern taškai neskaičiuojami, nes ši lyga
            neskelbia išprovokuotų pražangų ir gautų blokų. Skaičiai rodomi kaip kontekstas apie
            vaidmenį, ne kaip prognozė.
            {!other.verified && (
              <>
                {" "}
                <b>Duomenys apytiksliai</b>
                {other.note ? ` (${other.note})` : "."}
              </>
            )}
          </div>
        </div>
      ) : noData ? (
        <div className="mx-3.5 my-3 rounded-[3px] border border-warn-line bg-warn-bg px-[11px] py-[9px] text-[12px] text-warn-fg leading-[1.45]">
          Pernai nežaidė nei Eurolygoje, nei EuroCupe — <b>statistikos nėra</b>. Vertinimas paremtas
          tik kontekstu (rolė, konkurencija, treniruočių informacija).
        </div>
      ) : (
        <div className="px-3.5 pt-3 pb-1.5">
          <SectionLabel>{`PERNYKŠTĖ STATISTIKA · ${lastSeasonLine(player)}`}</SectionLabel>
          <div className="grid grid-cols-5 gap-px border border-line bg-line">
            {seasonStats(player).map((s) => (
              <div key={s.k} className="bg-cell px-1.5 py-[7px]">
                <div className="text-[9px] text-fg-dim tracking-[0.06em]">{s.k}</div>
                <div className="mt-0.5 font-medium font-mono text-[15px] text-fg-strong">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-3.5 pt-3 pb-1.5">
        <SectionLabel>IŠ KUR ATĖJO</SectionLabel>
        <div className="grid grid-cols-2 gap-px border border-line bg-line">
          {[
            { k: "Klubas", v: player.lastTeam },
            { k: "Lyga", v: LEAGUE_LABEL[player.lastLeague] },
            { k: "Rungtynės", v: player.gp ? String(player.gp) : "—" },
            { k: "Vid. minutės", v: noData ? "—" : player.min.toFixed(1) },
            ...(player.playoffs
              ? [
                  {
                    k: "Atkrintamosios",
                    v: `${player.playoffs.minutesPerGame.toFixed(1)} min · ${player.playoffs.gamesPlayed} rungt.`,
                  },
                  {
                    k: "Vaidmuo PO",
                    v: `${player.playoffs.minutesPerGame - player.min >= 0 ? "+" : ""}${(player.playoffs.minutesPerGame - player.min).toFixed(1)} min`,
                  },
                ]
              : []),
          ].map((o) => (
            <div key={o.k} className="flex justify-between gap-2 bg-cell px-2 py-[7px]">
              <div className="text-[11px] text-fg-label">{o.k}</div>
              <div className="font-mono text-[12px] text-fg-value">{o.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-1.5">
        <div className="mb-[7px] flex items-center gap-2">
          <div className="font-bold text-[11px] text-fg-strong tracking-[0.1em]">
            KONKURENCIJA DĖL MINUČIŲ
          </div>
          <div className="h-px flex-1 bg-line-strong" />
        </div>
        <div className="overflow-hidden rounded-[3px] border border-line-strong">
          <div
            className={`grid ${COMP_GRID} bg-comp-head px-2 py-[5px] text-[9px] text-fg-label tracking-[0.08em]`}
          >
            <div>
              {player.team.toUpperCase()} · {player.pos}
            </div>
            <div className="text-right">MIN</div>
            <div className="text-right">TŠK</div>
            <div className="text-right">FP</div>
            <div className="text-right">RUNG</div>
          </div>
          {comp.map((c) => (
            <div
              key={c.name}
              className={`grid ${COMP_GRID} border-line border-t px-2 py-1.5 ${c.highlight ? "bg-comp-row" : ""}`}
            >
              <div
                className={`truncate text-[12px] ${c.highlight ? "font-bold text-white" : "font-medium text-fg"}`}
              >
                {c.name}
              </div>
              <div className="text-right font-mono text-[12px] text-fg-value">{c.min}</div>
              <div className="text-right font-mono text-[12px] text-fg-value">{c.pts}</div>
              <div className="text-right font-mono text-[12px] text-fg-value">{c.fp}</div>
              <div className="text-right font-mono text-[12px] text-fg-muted">{c.gp}</div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 text-[11px] text-fg-label leading-[1.4]">
          {competitionNote(player, comp)}
        </div>
      </div>

      <div className="px-3.5 pt-3 pb-[18px]">
        <div className="mb-[7px] flex items-center justify-between">
          <div className="text-[10px] text-fg-dim tracking-[0.12em]">AI PAGRINDIMAS</div>
          <div
            className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] ${CONFIDENCE_CLASS[conf]}`}
          >
            {CONFIDENCE_LABEL[conf]}
          </div>
        </div>
        <p className="text-pretty text-[13px] text-fg-mild leading-[1.5]">{aiSummary(player)}</p>

        {evaluation?.availability ? (
          <div className="mt-2 rounded-[3px] border border-line-strong bg-cell px-2 py-1.5 text-[11px] text-fg-mild leading-[1.4]">
            <span className="text-fg-dim">Būklė: </span>
            {evaluation.availability}
          </div>
        ) : null}

        <div className="mt-2.5 flex gap-4 border-line border-t pt-2.5">
          <div>
            <div className="text-[9px] text-fg-dim tracking-[0.08em]">PROGN. MINUTĖS</div>
            <div className="font-mono text-[15px] text-fg-strong">{projectedMinutes(player)}</div>
          </div>
          <div>
            <div className="text-[9px] text-fg-dim tracking-[0.08em]">PROGN. FP/G</div>
            <div className="font-mono text-[15px] text-fg-strong">{player.fp.toFixed(1)}</div>
          </div>
          {player.lastSeasonModernFP != null && (
            <div>
              <div className="text-[9px] text-fg-dim tracking-[0.08em]">PERNAI FP/G</div>
              <div className="font-mono text-[15px] text-fg-value">
                {player.lastSeasonModernFP.toFixed(1)}
              </div>
            </div>
          )}
          <div>
            <div className="text-[9px] text-fg-dim tracking-[0.08em]">ŠALTINIS</div>
            <div className="font-mono text-[15px] text-fg-value">
              {evaluation ? (evaluation.source === "ai" ? "AI" : "auto") : "—"}
            </div>
          </div>
        </div>

        <div className={`mt-3.5 flex gap-1.5 ${taken ? "invisible" : ""}`}>
          <button
            type="button"
            onClick={() => take(player.id, false)}
            className="flex-1 rounded-[3px] border border-control-line bg-control p-2 font-semibold text-[12px] text-fg-muted hover:bg-control-hover hover:text-fg"
          >
            Paėmė kitas
          </button>
          <button
            type="button"
            onClick={() => take(player.id, true)}
            className="flex-1 rounded-[3px] border border-accent-line bg-accent p-2 font-bold text-[12px] text-base hover:bg-accent-hover"
          >
            Imu aš
          </button>
        </div>
      </div>
    </aside>
  );
}
