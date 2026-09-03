/**
 * Modern fantasy taškų skaičiavimas.
 *
 * Skaičiuoja kodas, ne AI — formulė žinoma, tad modelis čia tik įneštų klaidų.
 * Visi įėjimai yra VIDURKIAI PER RUNGTYNES, išskyrus `doubleDoubles` /
 * `tripleDoubles`, kurie API atsakyme ateina sezono sumomis (žr. `normalize`).
 */

export interface ModernInput {
  points: number;
  defensiveRebounds: number;
  offensiveRebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  foulsDrawn: number;
  /** Dalis per rungtynes, 0..1 */
  doubleDoubles: number;
  tripleDoubles: number;
  /** (2PA-2PM) + (3PA-3PM) */
  missedFieldGoals: number;
  /** FTA - FTM */
  missedFreeThrows: number;
  turnovers: number;
  blocksAgainst: number;
  /**
   * Dalis rungtynių su 5 pražangomis. API tokio lauko neduoda nė viename
   * endpointe, o skaičiuoti iš boxscore'ų brangu — todėl praktiškai visada 0.
   * Įtaka nedidelė: net 2.7 pražangos per rungtynes retai duoda daugiau nei
   * ~0.3 FP skirtumo. Laukas paliktas, kad formulė liktų pilna.
   */
  fiveFoulGames: number;
  /** Komandos pergalių dalis 0..1 — iš `misc` wins/(wins+losses). */
  winRate: number;
}

export function modernFP(s: ModernInput): number {
  return (
    s.points * 1 +
    s.defensiveRebounds * 1 +
    s.offensiveRebounds * 1.5 +
    s.assists * 1.5 +
    s.steals * 1.5 +
    s.blocks * 1 +
    s.foulsDrawn * 1 +
    s.doubleDoubles * 10 +
    s.tripleDoubles * 30 -
    s.missedFieldGoals * 1 -
    s.missedFreeThrows * 1 -
    s.turnovers * 1.5 -
    s.blocksAgainst * 0.5 -
    s.fiveFoulGames * 5 +
    s.winRate * 1.5 -
    (1 - s.winRate) * 1.5
  );
}

/** Pakopų slenksčiai — prognozuojami Modern taškai per rungtynes. */
export const TIER_THRESHOLDS = {
  /** >= 22 → PICK! */
  pick: 22,
  /** >= 15 → Worth to pick */
  worth: 15,
  /** >= 9 → Have potential; žemiau → DO NOT PICK! */
  potential: 9,
} as const;

export type Tier = 1 | 2 | 3 | 4;

export function tierFromFP(fp: number): Tier {
  if (fp >= TIER_THRESHOLDS.pick) return 1;
  if (fp >= TIER_THRESHOLDS.worth) return 2;
  if (fp >= TIER_THRESHOLDS.potential) return 3;
  return 4;
}
