"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/settings/card";
import { useData } from "@/lib/data-store";

/**
 * Rankinio suporavimo ekranas.
 *
 * Automatinis sulyginimas tikruose duomenyse pagauna ~75 % — likusieji
 * daugiausia yra žaidėjai, pernai iš viso nežaidę Eurolygoje ar EuroCupe
 * (NBA, ACB, BBL). Jiems suporuoti NĖRA su kuo, ir tai teisingas rezultatas,
 * o ne klaida. Todėl sąrašas rodo ir pasiūlymus, ir aiškų kelią pažymėti
 * „duomenų nėra".
 *
 * Suporavimai saugomi pagal `sourceId` ir pritaikomi automatiškai kitą kartą.
 */
export function NameMatching() {
  const { unmatched, pairings, pair, unpair, refresh, meta } = useData();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? unmatched.filter((u) => u.name.toLowerCase().includes(needle)) : unmatched;
  }, [unmatched, query]);

  const pairedCount = Object.keys(pairings).length;

  if (meta.kind === "demo") {
    return (
      <Card title="VARDŲ SUPORAVIMAS">
        <div className="p-3 text-[12px] text-fg-label leading-[1.5]">
          Rodomi demo duomenys. Paspausk „Atnaujinti duomenis", kad būtų atsiųsta Eurolygos
          statistika — tada čia atsiras nesuporuoti vardai.
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="VARDŲ SUPORAVIMAS"
      aside={
        <div className="flex items-center gap-2">
          {pairedCount > 0 && (
            <div className="font-mono text-[11px] text-tier-1">{pairedCount} suporuota</div>
          )}
          <div className="font-mono text-[11px] text-warn-fg">{unmatched.length} nesuporuoti</div>
        </div>
      }
    >
      <div className="border-line-soft border-b p-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtruoti pagal vardą…"
          className="w-full rounded-[3px] border border-line-strong bg-control px-2 py-[5px] text-[12px] text-fg-strong outline-none placeholder:text-fg-dim focus:border-chip-on-line"
        />
        <p className="mt-2 text-[11px] text-fg-label leading-[1.45]">
          Dauguma šių žaidėjų pernai žaidė NBA, ACB ar kitose lygose — jiems atitikmens Eurolygos
          duomenyse tiesiog nėra. Suporuok tik tuos, kuriuos atpažįsti sąraše, ir paspausk
          „Atnaujinti duomenis", kad pakeitimai būtų pritaikyti.
        </p>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {rows.length === 0 && (
          <div className="p-3 text-[12px] text-fg-label">
            {unmatched.length === 0 ? "Visi vardai suporuoti." : "Pagal filtrą nieko nerasta."}
          </div>
        )}

        {rows.map((entry) => {
          const pinned = pairings[entry.sourceId];
          return (
            <div key={entry.sourceId} className="border-line-soft border-b px-3 py-[9px]">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-[12px] text-fg-strong">{entry.name}</div>
                <div className="font-mono text-[10px] text-fg-dim">
                  {entry.position} · {entry.team}
                </div>
              </div>

              {pinned ? (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="font-mono text-[11px] text-tier-1">→ {pinned}</div>
                  <button
                    type="button"
                    onClick={() => unpair(entry.sourceId)}
                    className="rounded-[3px] border border-control-line bg-control px-2 py-1 font-semibold text-[11px] text-fg-muted hover:bg-control-hover hover:text-fg"
                  >
                    Atšaukti
                  </button>
                </div>
              ) : (
                <div className="mt-1.5 grid gap-1">
                  {entry.suggestions.length === 0 && (
                    <div className="text-[11px] text-fg-dim">Pasiūlymų nėra.</div>
                  )}
                  {entry.suggestions.map((s) => (
                    <div
                      key={`${s.apiName}-${s.league}`}
                      className="grid grid-cols-[1fr_46px_76px] items-center gap-2"
                    >
                      <div className="truncate font-mono text-[11px] text-fg-soft">{s.apiName}</div>
                      <div className="font-mono text-[10px] text-fg-dim">
                        {s.league} {s.score.toFixed(2)}
                      </div>
                      <button
                        type="button"
                        onClick={() => pair(entry.sourceId, s.apiName)}
                        className="rounded-[3px] border border-control-line bg-control px-2 py-1 font-semibold text-[11px] text-fg hover:bg-control-hover"
                      >
                        Suporuoti
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pairedCount > 0 && (
        <div className="border-line border-t p-2.5">
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-[3px] border border-accent-line bg-accent px-3 py-[7px] font-bold text-[12px] text-base hover:bg-accent-hover"
          >
            Pritaikyti suporavimus
          </button>
        </div>
      )}
    </Card>
  );
}
