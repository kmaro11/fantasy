export type Position = "G" | "F" | "C";

/** Kur žaidėjas rungtyniavo pernai. "-" — duomenų nėra. */
export type League = "EL" | "EC" | "kita" | "-";

export type Status = "ready" | "doubtful" | "out";

export type Tier = 1 | 2 | 3 | 4;

export interface Player {
  id: number;
  name: string;
  pos: Position;
  team: string;
  lastTeam: string;
  lastLeague: League;
  /** Pernykštės vidutinės minutės per rungtynes. */
  min: number;
  /** Prognozuojami fantasy taškai per rungtynes. */
  fp: number;
  status: Status;
  tier: Tier;
  /** Sužaistos rungtynės pernai. */
  gp: number;
}

/** Vienas draft'o pasirinkimas: kas paėmė žaidėją. */
export interface Pick {
  playerId: number;
  mine: boolean;
}

export type SortKey = "name" | "min" | "fp";

export type SortDir = 1 | -1;

export interface Filters {
  query: string;
  pos: Position | "ALL";
  tier: Tier | "ALL";
  league: League | "ALL";
  team: string | "ALL";
  showTaken: boolean;
}
