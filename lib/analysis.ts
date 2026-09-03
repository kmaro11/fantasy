import { LEAGUE_LABEL } from "./players";
import type { CompetitionRival, Player } from "./types";

export interface StatCell {
  k: string;
  v: string;
}

/** Pernykštė statistika iš tikros Eurolygos/EuroCup eilutės. */
export function seasonStats(p: Player): StatCell[] {
  const s = p.lastSeason;
  if (!s) return [];

  const fga = s.fg2a + s.fg3a;
  const fgm = s.fg2m + s.fg3m;
  const fgPct = fga > 0 ? `${Math.round((fgm / fga) * 100)}%` : "—";

  return [
    { k: "TŠK", v: s.points.toFixed(1) },
    { k: "PUOL.ATK", v: s.oreb.toFixed(1) },
    { k: "GYN.ATK", v: s.dreb.toFixed(1) },
    { k: "REZ.PERD", v: s.assists.toFixed(1) },
    { k: "PERIMTI", v: s.steals.toFixed(1) },
    { k: "BLOKAI", v: s.blocks.toFixed(1) },
    { k: "KLAIDOS", v: s.turnovers.toFixed(1) },
    { k: "MET %", v: fgPct },
    { k: "IŠPROV.PR", v: s.foulsDrawn.toFixed(1) },
    // Sezono suma, o ne dalis — taip skaitomiau nei „0.16".
    { k: "DVIG.DUBL", v: String(Math.round(s.doubleDoubles * s.gamesPlayed)) },
  ];
}

export interface CompetitionRow {
  name: string;
  min: string;
  pts: string;
  fp: string;
  gp: string;
  highlight: boolean;
}

const dash = (value: number, digits = 1) => (value > 0 ? value.toFixed(digits) : "—");

/**
 * Konkurentų lentelė. Eilutes paruošia `merge.ts` (`player.competition`) —
 * čia tik formatavimas. Demo duomenims paliktas atsarginis kelias.
 */
export function competition(p: Player, players: Player[]): CompetitionRow[] {
  const rivals: CompetitionRival[] =
    p.competition?.rivals ??
    players
      .filter((x) => x.team === p.team && x.pos === p.pos && x.id !== p.id)
      .map((x) => ({
        name: x.name,
        league: x.lastLeague,
        mpg: x.min,
        points: 0,
        rebounds: 0,
        assists: 0,
        modernFP: x.fp,
        health: x.status,
      }));

  const rows = rivals.slice(0, 5).map((r) => ({
    name: r.name,
    min: dash(r.mpg),
    pts: dash(r.points),
    fp: dash(r.modernFP),
    gp: r.league === "-" ? "—" : "",
    highlight: false,
  }));

  return [
    {
      name: `${p.name} (vertinamas)`,
      min: dash(p.min),
      pts: dash(p.lastSeason?.points ?? 0),
      fp: dash(p.fp),
      gp: p.gp ? String(p.gp) : "—",
      highlight: true,
    },
    ...rows,
  ];
}

export function competitionNote(p: Player, rows: CompetitionRow[]): string {
  const rivals = rows.length - 1;
  const composition = p.competition?.rosterComposition;
  const bigMan = p.pos !== "G";

  if (rivals === 0) return "Aiškių konkurentų pozicijoje nėra — minutės turėtų būti stabilios.";

  const pool = bigMan
    ? "Aukštaūgiams skaičiuojami ir puolėjai, ir centrai — jie dalijasi tomis pačiomis minutėmis."
    : "";
  const size = composition ? ` Sudėtyje ${composition.total} žaidėjai.` : "";

  return `Toje pačioje pozicijoje ${p.team} turi ${rivals} konkurentą(-us). ${pool}${size}`;
}

export type Confidence = "high" | "medium" | "low";

export function confidence(p: Player): Confidence {
  if (p.evaluation) return p.evaluation.confidence;
  if (!p.lastSeason) return "low";
  // Maža imtis vidurkius daro triukšmingus — 10 rungtynių dar ne vaidmuo.
  if (p.gp < 10) return "low";
  return p.gp >= 25 ? "high" : "medium";
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "pasitikėjimas: aukštas",
  medium: "pasitikėjimas: vidutinis",
  low: "pasitikėjimas: žemas",
};

export const CONFIDENCE_CLASS: Record<Confidence, string> = {
  high: "text-tier-1 bg-tint-green",
  medium: "text-tier-3 bg-tint-amber",
  low: "text-tier-4 bg-tint-red",
};

/** AI pagrindimas, jei yra. Kitu atveju — sąžininga santrauka iš skaičių. */
export function aiSummary(p: Player): string {
  if (p.evaluation) return p.evaluation.reasoning;

  if (!p.lastSeason) {
    return `${p.name} pernai nežaidė nei Eurolygoje, nei EuroCupe, todėl lyginamų duomenų nėra. Vertinimas galimas tik iš konteksto — kol nepaleistas AI vertinimas, pakopa yra sąlyginė.`;
  }

  const s = p.lastSeason;
  const league = s.league === "EuroLeague" ? "Eurolygoje" : "EuroCupe";
  const playoffs = p.playoffs
    ? ` Atkrintamosiose vaidmuo ${p.playoffs.minutesPerGame > s.minutesPerGame ? "išaugo" : "sumažėjo"} iki ${p.playoffs.minutesPerGame.toFixed(1)} min.`
    : "";

  return `${p.name} pernai ${league} sužaidė ${s.gamesPlayed} rungtynes po ${s.minutesPerGame.toFixed(1)} min. ir rinko ${s.modernFP.toFixed(1)} Modern taško.${playoffs} Skaičiai yra pernykščiai — AI vertinimas dar nepaleistas, tad vaidmens pokytis neįvertintas.`;
}

/** Kol nėra AI prognozės, artimiausias sąžiningas spėjimas — pernykštės minutės. */
export function projectedMinutes(p: Player): string {
  if (p.evaluation) return p.evaluation.projectedMinutes.toFixed(1);
  if (!p.lastSeason) return "—";
  return p.min.toFixed(1);
}

export function lastSeasonLine(p: Player): string {
  return `${p.lastTeam} · ${LEAGUE_LABEL[p.lastLeague]}`;
}
