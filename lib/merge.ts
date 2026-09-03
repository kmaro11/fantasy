/**
 * Eurolygos statistikos ir BasketNews sąrašo sujungimas į vieną žaidėjo objektą.
 *
 * Eiliškumas:
 *   1. `traditional` + `misc` sujungiami pagal API žaidėjo KODĄ, ne vardą
 *   2. sezono sumos verčiamos vidurkiais per rungtynes
 *   3. skaičiuojamas Modern FP
 *   4. vardai sulyginami su BasketNews sąrašu (žr. `name-match.ts`)
 *   5. sudedamas `competition` blokas — gryna duomenų operacija, ne AI
 */

import type { MiscRow, RawStats, TraditionalRow } from "./euroleague";
import { modernFP, tierFromFP } from "./modern-fp";
import {
  buildIndex,
  type MatchLevel,
  matchPlayer,
  type NameIndex,
  parseRosterName,
} from "./name-match";
import type { RosterPlayer } from "./roster";
import type {
  CompetitionBlock,
  CompetitionRival,
  League,
  OtherLeagueLine,
  Player,
  PlayoffLine,
  Position,
  SeasonLine,
} from "./types";

/** `traditional` ir `misc` toje pačioje eilutėje. */
interface StatPair {
  traditional: TraditionalRow;
  misc: MiscRow | null;
}

/** Sujungimas pagal `player.code` — vardų lyginimas čia būtų klaida. */
function pairByCode(traditional: TraditionalRow[], misc: MiscRow[]): StatPair[] {
  const miscByCode = new Map(misc.map((row) => [row.player.code, row]));
  return traditional.map((row) => ({
    traditional: row,
    misc: miscByCode.get(row.player.code) ?? null,
  }));
}

/**
 * Sezono sumos → vidurkiai per rungtynes ir Modern FP.
 *
 * `doubleDoubles` ir `tripleDoubles` sumos dalinamos iš rungtynių — po dalybos
 * tai dalis 0..1, kaip formulė ir tikisi.
 */
function toSeasonLine(pair: StatPair, league: SeasonLine["league"]): SeasonLine | null {
  const t = pair.traditional;
  const games = t.gamesPlayed;
  if (!games) return null;

  const per = (total: number) => total / games;
  const wins = pair.misc?.wins ?? 0;
  const losses = pair.misc?.losses ?? 0;
  // Be `misc` eilutės pergalių dalies nežinome — 0.5 yra neutralus spėjimas.
  const winRate = wins + losses > 0 ? wins / (wins + losses) : 0.5;

  const line: SeasonLine = {
    league,
    club: t.player.team.name,
    gamesPlayed: games,
    minutesPerGame: per(t.minutesPlayed),
    points: per(t.pointsScored),
    fg2m: per(t.twoPointersMade),
    fg2a: per(t.twoPointersAttempted),
    fg3m: per(t.threePointersMade),
    fg3a: per(t.threePointersAttempted),
    ftm: per(t.freeThrowsMade),
    fta: per(t.freeThrowsAttempted),
    oreb: per(t.offensiveRebounds),
    dreb: per(t.defensiveRebounds),
    assists: per(t.assists),
    turnovers: per(t.turnovers),
    steals: per(t.steals),
    blocks: per(t.blocks),
    blocksAgainst: per(t.blocksAgainst),
    foulsDrawn: per(t.foulsDrawn),
    foulsCommitted: per(t.foulsCommited),
    doubleDoubles: per(pair.misc?.doubleDoubles ?? 0),
    tripleDoubles: per(pair.misc?.tripleDoubles ?? 0),
    winRate,
    modernFP: 0,
  };

  line.modernFP = modernFP({
    points: line.points,
    defensiveRebounds: line.dreb,
    offensiveRebounds: line.oreb,
    assists: line.assists,
    steals: line.steals,
    blocks: line.blocks,
    foulsDrawn: line.foulsDrawn,
    doubleDoubles: line.doubleDoubles,
    tripleDoubles: line.tripleDoubles,
    missedFieldGoals: line.fg2a - line.fg2m + (line.fg3a - line.fg3m),
    missedFreeThrows: line.fta - line.ftm,
    turnovers: line.turnovers,
    blocksAgainst: line.blocksAgainst,
    // API neduoda penkių pražangų rungtynių jokiame endpointe — žr. modern-fp.ts.
    fiveFoulGames: 0,
    winRate: line.winRate,
  });

  return line;
}

/** API eilutė kartu su savo vardu — vardas reikalingas atkrintamųjų paieškai. */
export interface StatEntry {
  name: string;
  line: SeasonLine;
}

export interface StatsIndex {
  el: NameIndex<StatEntry>;
  ec: NameIndex<StatEntry>;
  playoffsByName: Map<string, PlayoffLine>;
  elLines: StatEntry[];
  ecLines: StatEntry[];
}

/** Vieną kartą paruošia visas API eilutes paieškai. */
export function buildStatsIndex(raw: RawStats): StatsIndex {
  const toLines = (traditional: TraditionalRow[], misc: MiscRow[], league: SeasonLine["league"]) =>
    pairByCode(traditional, misc)
      .map((pair) => ({ name: pair.traditional.player.name, line: toSeasonLine(pair, league) }))
      .filter((entry): entry is StatEntry => entry.line !== null);

  const elLines = toLines(raw.el.traditional, raw.el.misc, "EuroLeague");
  const ecLines = toLines(raw.ec.traditional, raw.ec.misc, "EuroCup");

  const playoffsByName = new Map<string, PlayoffLine>();
  for (const pair of pairByCode(raw.playoffs.traditional, raw.playoffs.misc)) {
    const line = toSeasonLine(pair, "EuroLeague");
    if (!line) continue;
    playoffsByName.set(pair.traditional.player.name, {
      gamesPlayed: line.gamesPlayed,
      minutesPerGame: line.minutesPerGame,
      points: line.points,
      modernFP: line.modernFP,
    });
  }

  return {
    el: buildIndex(elLines, (entry) => entry.name),
    ec: buildIndex(ecLines, (entry) => entry.name),
    playoffsByName,
    elLines,
    ecLines,
  };
}

export interface ManualPairing {
  /** BasketNews `sourceId` → API vardas, kaip jis atrodo atsakyme. */
  [sourceId: string]: string;
}

export interface MergeResult {
  players: Player[];
  unmatched: UnmatchedEntry[];
  matchedCount: number;
}

export interface UnmatchedEntry {
  sourceId: string;
  name: string;
  team: string;
  position: Position;
  suggestions: { apiName: string; league: League; score: number }[];
}

const LEAGUE_CODE: Record<SeasonLine["league"], League> = {
  EuroLeague: "EL",
  EuroCup: "EC",
};

/**
 * Sujungia viską. Eurolyga viršesnė už EuroCupą — tas pats žaidėjas gali būti
 * abiejuose rinkiniuose, jei per sezoną persikėlė.
 */
export function mergePlayers(
  roster: RosterPlayer[],
  stats: StatsIndex,
  manual: ManualPairing = {},
  otherLeagues: Record<string, OtherLeagueLine> = {},
): MergeResult {
  const manualLookup = new Map<string, { line: SeasonLine; name: string }>();
  for (const entry of [...stats.elLines, ...stats.ecLines]) {
    manualLookup.set(entry.name, { line: entry.line, name: entry.name });
  }

  const unmatched: UnmatchedEntry[] = [];
  let matchedCount = 0;

  const players: Player[] = roster.map((person) => {
    const target = parseRosterName(person.firstName, person.lastName);
    const teamOf = (entry: StatEntry) => entry.line.club;

    let line: SeasonLine | null = null;
    let apiName: string | null = null;
    let matchLevel: MatchLevel = "none";

    // Rankinis suporavimas visada viršesnis už automatinį.
    const pinned = manual[person.sourceId];
    if (pinned && manualLookup.has(pinned)) {
      const hit = manualLookup.get(pinned) as { line: SeasonLine; name: string };
      line = hit.line;
      apiName = hit.name;
      matchLevel = "manual";
    } else {
      const elHit = matchPlayer(target, stats.el, { team: person.currentTeam, teamOf });
      const ecHit = elHit.row
        ? null
        : matchPlayer(target, stats.ec, { team: person.currentTeam, teamOf });
      const hit = elHit.row ? elHit : ecHit;

      if (hit?.row) {
        line = hit.row.line;
        apiName = hit.row.name;
        matchLevel = hit.level;
      } else {
        const suggestions = [
          ...(elHit.candidates ?? []).map((c) => ({
            apiName: c.row.name,
            league: "EL" as League,
            score: c.score,
          })),
          ...(ecHit?.candidates ?? []).map((c) => ({
            apiName: c.row.name,
            league: "EC" as League,
            score: c.score,
          })),
        ]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        unmatched.push({
          sourceId: person.sourceId,
          name: person.name,
          team: person.currentTeam,
          position: person.position,
          suggestions,
        });
      }
    }

    if (line) matchedCount++;

    const playoffs = apiName ? (stats.playoffsByName.get(apiName) ?? null) : null;
    const other = line ? null : (otherLeagues[person.name] ?? null);
    // „kita" — filtrų juostoje toks variantas jau yra, tik iki šiol niekas jo negavo.
    const lastLeague: League = line ? LEAGUE_CODE[line.league] : other ? "kita" : "-";

    return {
      id: person.id,
      name: person.name,
      pos: person.position,
      team: person.currentTeam,
      lastTeam: line?.club ?? other?.club ?? "—",
      lastLeague,
      min: line?.minutesPerGame ?? other?.minutesPerGame ?? 0,
      // Kol nėra AI vertinimo, pernykštis Modern FP yra prognozė.
      fp: line?.modernFP ?? 0,
      status: person.health,
      /**
       * Be duomenų — 3 pakopa („Have potential"), NE 4.
       *
       * 0 FP mechaniškai kristų į „DO NOT PICK!" ir palaidotų Valančiūną,
       * Bacotą ar Kai Jonesą vien todėl, kad jie pernai žaidė ne Eurolygoje.
       * Nežinomybė nėra tas pats, kas prastas žaidėjas: promptas 3 pakopą ir
       * apibrėžia kaip „neaiškų atvejį". Tikrą pakopą priskiria AI vertinimas.
       */
      tier: line ? tierFromFP(line.modernFP) : 3,
      gp: line?.gamesPlayed ?? 0,
      sourceId: person.sourceId,
      teamAbbr: person.teamAbbr,
      jerseyNumber: person.jerseyNumber,
      fantasyPrice: person.fantasyPrice,
      lastSeasonModernFP: line?.modernFP ?? null,
      lastSeason: line,
      // Kitos lygos statistika aktuali tik tada, kai EL/EC duomenų nėra.
      lastSeasonOther: other,
      playoffs,
      evaluation: null,
      matchLevel,
    };
  });

  for (const player of players) {
    player.competition = buildCompetition(player, players);
  }

  return { players, unmatched, matchedCount };
}

/**
 * Konkurencija dėl minučių — tos pačios komandos žaidėjai toje pačioje pozicijoje.
 *
 * Aukštaūgiams (`F` ir `C`) imamos ABI pozicijos: pozicijų sąraše jų tik trys,
 * o realiai jie konkuruoja tarpusavyje. Antraip Tubelis atrodytų neturintis
 * konkurencijos, nors Valančiūnas tiesiogiai atima jo minutes.
 */
export function buildCompetition(player: Player, all: Player[]): CompetitionBlock {
  const bigs: Position[] = ["F", "C"];
  const relevant = (pos: Position) =>
    bigs.includes(player.pos) ? bigs.includes(pos) : pos === player.pos;

  const teammates = all.filter((other) => other.team === player.team && other.id !== player.id);

  const rivals: CompetitionRival[] = teammates
    .filter((other) => relevant(other.pos))
    .map((other) => ({
      name: other.name,
      league: other.lastLeague,
      mpg: other.min,
      points: other.lastSeason?.points ?? 0,
      rebounds: (other.lastSeason?.oreb ?? 0) + (other.lastSeason?.dreb ?? 0),
      assists: other.lastSeason?.assists ?? 0,
      modernFP: other.lastSeasonModernFP ?? 0,
      health: other.status,
    }))
    .sort((a, b) => b.mpg - a.mpg || b.modernFP - a.modernFP);

  const roster = all.filter((other) => other.team === player.team);
  return {
    rivals,
    rosterComposition: {
      guards: roster.filter((p) => p.pos === "G").length,
      forwards: roster.filter((p) => p.pos === "F").length,
      centers: roster.filter((p) => p.pos === "C").length,
      total: roster.length,
    },
  };
}
