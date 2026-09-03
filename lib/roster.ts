/**
 * BasketNews žaidėjų sąrašo (`players.json`) skaitymas.
 *
 * Tai priešsezoninė 2026-27 nuotrauka: `stats`, `fantasy_pts` ir
 * `average_fantasy_pts` visada `null`. Statistika ateina iš Eurolygos API.
 *
 * `fantasyPrice` čia perskaitoma, bet į vertinimą NEPATENKA — snake drafte
 * biudžeto nėra, tad kaina yra tik informacija sąsajai.
 */

import type { Health, Position } from "./types";

/** Tik tie `players.json` laukai, kuriuos iš tikrųjų naudojame. */
export interface RosterSource {
  id: string;
  basketnewsApiPlayerId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  health: string;
  fantasyPrice: number | null;
  team: {
    number: number | null;
    positions: string[] | null;
    team: {
      abbreviation: string;
      translation: { name: string; shortName?: string } | null;
    } | null;
  } | null;
}

export interface RosterPlayer {
  /** Stabilus indeksas — naudojamas kaip `Player.id` visoje sąsajoje. */
  id: number;
  sourceId: string;
  firstName: string;
  lastName: string;
  name: string;
  position: Position;
  currentTeam: string;
  teamAbbr: string;
  jerseyNumber: number | null;
  health: Health;
  fantasyPrice: number | null;
}

const POSITION_MAP: Record<string, Position> = {
  guard: "G",
  forward: "F",
  center: "C",
};

const HEALTH_VALUES: Health[] = [
  "ready",
  "expected",
  "questionable",
  "doubtful",
  "uncertain",
  "out",
];

function toHealth(raw: string): Health {
  const value = raw?.toLowerCase() as Health;
  return HEALTH_VALUES.includes(value) ? value : "ready";
}

export function parseRoster(raw: RosterSource[]): RosterPlayer[] {
  return raw.map((entry, i) => {
    const teamEntry = entry.team;
    const club = teamEntry?.team;
    const position = POSITION_MAP[(teamEntry?.positions?.[0] ?? "").toLowerCase()] ?? "F";

    return {
      id: i,
      sourceId: entry.id,
      firstName: entry.firstName,
      lastName: entry.lastName,
      name: `${entry.firstName} ${entry.lastName}`.replace(/\s+/g, " ").trim(),
      position,
      currentTeam: club?.translation?.name ?? club?.abbreviation ?? "—",
      teamAbbr: club?.abbreviation ?? "—",
      // `number` dažnai `null` — priešsezoniu numeriai dar nepaskirti.
      jerseyNumber: teamEntry?.number ?? null,
      health: toHealth(entry.health),
      fantasyPrice: entry.fantasyPrice ?? null,
    };
  });
}

/** Naudotojo įkeltas failas gali būti apvyniotas — priimame abu variantus. */
export function unwrapRosterJson(parsed: unknown): RosterSource[] {
  if (Array.isArray(parsed)) return parsed as RosterSource[];
  if (parsed && typeof parsed === "object") {
    for (const key of ["players", "data", "items"]) {
      const value = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as RosterSource[];
    }
  }
  throw new Error("Nepavyko rasti žaidėjų masyvo — tikimasi players.json struktūros.");
}
