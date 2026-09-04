export type Position = "G" | "F" | "C";

/** Kur žaidėjas rungtyniavo pernai. "-" — duomenų nėra. */
export type League = "EL" | "EC" | "kita" | "-";

/**
 * Būklė perimama iš `players.json` kaip yra, be sutraukimo į tris reikšmes.
 * Sąsaja ją rodo NEUTRALIAI: traumuotas žaidėjas nenustumiamas žemyn ir
 * neprislopinamas — draftas yra visam sezonui, tad praleistas mėnuo elitinio
 * žaidėjo neišbraukia. Informuojame, sprendžia naudotojas.
 */
export type Health = "ready" | "expected" | "questionable" | "doubtful" | "uncertain" | "out";

/** Senasis pavadinimas — sąsajos komponentai naudoja būtent jį. */
export type Status = Health;

export type Tier = 1 | 2 | 3 | 4;

/** Vienos lygos pernykštė eilutė, jau perskaičiuota į vidurkius per rungtynes. */
export interface SeasonLine {
  league: "EuroLeague" | "EuroCup";
  club: string;
  gamesPlayed: number;
  minutesPerGame: number;
  points: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  assists: number;
  turnovers: number;
  steals: number;
  blocks: number;
  blocksAgainst: number;
  foulsDrawn: number;
  foulsCommitted: number;
  /** Dvigubų dublių DALIS per rungtynes (0..1), ne sezono suma. */
  doubleDoubles: number;
  tripleDoubles: number;
  winRate: number;
  modernFP: number;
}

/**
 * Pernykštė statistika iš KITOS lygos (NBA, ACB, BBL, NCAA ir pan.).
 *
 * Sąmoningai BE `modernFP`. Modern taškų iš šių duomenų suskaičiuoti neįmanoma:
 * nei NBA, nei NCAA neskelbia dviejų formulės laukų — `foulsDrawn` (+1 už
 * kiekvieną; Eurolygoje tai 2-4 taškai per rungtynes) ir `blocksAgainst`
 * (-0.5). Suskaičiuotas skaičius būtų sistemingai per mažas ir atsidurtų tame
 * pačiame stulpelyje šalia tikrų Eurolygos reikšmių.
 *
 * Todėl tai yra KONTEKSTAS AI vertinimui, o ne FP reikšmė. Promptas to ir
 * prašo: kitų lygų skaičiai Eurolygoje krenta ~15-25 %, o NBA vaidmuo ir
 * minutės neperkeliami tiesiogiai.
 */
export interface OtherLeagueLine {
  /** „NBA", „ACB", „NCAA", „BSL", „BBL"… */
  league: string;
  club: string;
  season: string;
  gamesPlayed: number | null;
  minutesPerGame: number | null;
  points: number | null;
  offensiveRebounds: number | null;
  defensiveRebounds: number | null;
  totalRebounds: number | null;
  assists: number | null;
  steals: number | null;
  blocks: number | null;
  turnovers: number | null;
  fgPct: string | null;
  fg3Pct: string | null;
  ftPct: string | null;
  /** Iš kur paimta — kad skaičių būtų galima atsekti. */
  source: string;
  /**
   * `false`, jei šaltinis pateikė apytikslius ar dalinius duomenis. Tokie
   * skaičiai AI promptui perduodami su aiškiu įspėjimu.
   */
  verified: boolean;
  note: string | null;
}

export interface PlayoffLine {
  gamesPlayed: number;
  minutesPerGame: number;
  points: number;
  modernFP: number;
}

export interface CompetitionRival {
  name: string;
  league: League;
  mpg: number;
  points: number;
  rebounds: number;
  assists: number;
  modernFP: number;
  health: Health;
}

export interface CompetitionBlock {
  rivals: CompetitionRival[];
  rosterComposition: { guards: number; forwards: number; centers: number; total: number };
}

export type EvaluationTier = "PICK!" | "Worth to pick" | "Have potential" | "DO NOT PICK!";

export interface Evaluation {
  tier: EvaluationTier;
  projectedFP: number;
  projectedMinutes: number;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  availability: string | null;
  /** `ai` — modelio atsakymas; `auto` — priskirta pagal slenksčius be užklausos. */
  source: "ai" | "auto";
  evaluatedAt: string;
}

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

  // --- Turtingas sluoksnis; tuščias, kol neįkelti tikri duomenys. ---
  sourceId?: string;
  teamAbbr?: string;
  jerseyNumber?: number | null;
  fantasyPrice?: number | null;
  /** Pernykštis Modern FP iš tikros statistikos — rikiavimo atspirties taškas. */
  lastSeasonModernFP?: number | null;
  lastSeason?: SeasonLine | null;
  /** Kitos lygos statistika tiems, kas pernai nežaidė EL/EC. */
  lastSeasonOther?: OtherLeagueLine | null;
  playoffs?: PlayoffLine | null;
  competition?: CompetitionBlock;
  evaluation?: Evaluation | null;
  /** Kaip buvo rastas atitikmuo Eurolygos API — rankiniam suporavimui. */
  matchLevel?: "exact" | "initial" | "surname" | "fuzzy" | "manual" | "none";
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
