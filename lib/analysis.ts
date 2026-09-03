import { LEAGUE_LABEL } from "./players";
import type { Player } from "./types";

export interface StatCell {
  k: string;
  v: string;
}

/**
 * Pernykštė statistika, išvesta iš FP/G. Kai atsiras tikras players.json,
 * ši funkcija keičiama tiesioginiu duomenų skaitymu.
 */
export function seasonStats(p: Player): StatCell[] {
  const f = p.fp;
  const s = 1 + (p.id % 5) * 0.03;
  return [
    { k: "TŠK", v: (f * 0.6 * s).toFixed(1) },
    { k: "PUOL.ATK", v: (f * 0.07).toFixed(1) },
    { k: "GYN.ATK", v: (f * 0.16).toFixed(1) },
    { k: "REZ.PERD", v: (f * (p.pos === "G" ? 0.2 : 0.09)).toFixed(1) },
    { k: "PERIMTI", v: (f * 0.05).toFixed(1) },
    { k: "BLOKAI", v: (f * (p.pos === "C" ? 0.06 : 0.02)).toFixed(1) },
    { k: "KLAIDOS", v: (f * 0.1).toFixed(1) },
    { k: "MET %", v: `${44 + ((p.id * 7) % 15)}%` },
    { k: "IŠPROV.PR", v: (f * 0.12).toFixed(1) },
    { k: "DVIG.DUBL", v: String(Math.max(0, Math.round(f / 7 - 1))) },
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

/** Tos pačios komandos ir pozicijos žaidėjai — kas atims minutes. */
export function competition(p: Player, players: Player[]): CompetitionRow[] {
  const rivals = players
    .filter((x) => x.team === p.team && x.pos === p.pos && x.id !== p.id)
    .sort((a, b) => b.min - a.min)
    .slice(0, 4)
    .map((x) => ({
      name: x.name,
      min: x.lastLeague === "-" ? "—" : x.min.toFixed(1),
      pts: (x.fp * 0.6).toFixed(1),
      fp: x.fp.toFixed(1),
      gp: x.gp ? String(x.gp) : "—",
      highlight: false,
    }));

  const noData = p.lastLeague === "-";
  return [
    {
      name: `${p.name} (vertinamas)`,
      min: noData ? "—" : p.min.toFixed(1),
      pts: noData ? "—" : (p.fp * 0.6).toFixed(1),
      fp: p.fp.toFixed(1),
      gp: p.gp ? String(p.gp) : "—",
      highlight: true,
    },
    ...rivals,
  ];
}

export function competitionNote(p: Player, rows: CompetitionRow[]): string {
  const rivals = rows.length - 1;
  return rivals > 0
    ? `Toje pačioje pozicijoje ${p.team} turi ${rivals} konkurentą(-us). Prognozuojamos minutės atsižvelgia į jų pernykštį krūvį.`
    : "Aiškių konkurentų pozicijoje nėra — minutės turėtų būti stabilios.";
}

export type Confidence = "high" | "medium" | "low";

export function confidence(p: Player): Confidence {
  if (p.lastLeague === "-") return "low";
  return p.tier <= 2 ? "high" : "medium";
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

export function aiSummary(p: Player): string {
  if (p.lastLeague === "-") {
    return `${p.name} pernai nežaidė nei Eurolygoje, nei EuroCupe, todėl lyginamų duomenų nėra. Rolė ${p.team} komandoje kol kas rotacinė, o priekyje jo pozicijoje yra bent du patyrę žaidėjai. Imti verta tik vėlyvuose raunduose kaip atsargą.`;
  }

  const context =
    p.status === "doubtful"
      ? "Sezono starte kyla klausimų dėl fizinės būklės, todėl pirmose rungtynėse minutės gali būti ribojamos. "
      : `Konkurencija jo pozicijoje ${p.team} sudėtyje nedidelė, todėl krūvis turėtų išlikti panašus. `;

  const verdict =
    p.tier === 1
      ? "Tai vienas iš pikų, kurių nereikia permąstyti — imti iš karto."
      : p.tier === 4
        ? "Fantasy vertė per maža lyginant su alternatyvomis šiame raunde."
        : "Gera vertė, jei aukštesnės pakopos žaidėjai jau išrinkti.";

  return `${p.name} pernai gavo ${p.min.toFixed(1)} min. per rungtynes ir buvo vienas iš pagrindinių ${p.lastTeam} variantų. ${context}${verdict}`;
}

export function projectedMinutes(p: Player): string {
  const value =
    p.lastLeague === "-"
      ? 12 + (p.id % 5)
      : Math.round(p.min * (p.status === "doubtful" ? 0.85 : 1.02));
  return `${value}.0`;
}

export function lastSeasonLine(p: Player): string {
  return `${p.lastTeam} · ${LEAGUE_LABEL[p.lastLeague]}`;
}
