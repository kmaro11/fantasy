import { ROSTER_SIZE } from "./config";
import { PLAYERS } from "./players";
import type { Filters, Pick, Player, Position, SortDir, SortKey } from "./types";

export function takenMap(history: Pick[]): Map<number, Pick> {
  return new Map(history.map((h) => [h.playerId, h]));
}

export function myRoster(history: Pick[]): Player[] {
  return history.filter((h) => h.mine).flatMap((h) => PLAYERS[h.playerId] ?? []);
}

function matches(p: Player, f: Filters, taken: Map<number, Pick>): boolean {
  if (taken.has(p.id) && !f.showTaken) return false;
  if (f.query && !p.name.toLowerCase().includes(f.query.toLowerCase())) return false;
  if (f.pos !== "ALL" && p.pos !== f.pos) return false;
  if (f.tier !== "ALL" && p.tier !== f.tier) return false;
  if (f.league !== "ALL" && p.lastLeague !== f.league) return false;
  if (f.team !== "ALL" && p.team !== f.team) return false;
  return true;
}

/** Paimti žaidėjai visada nukeliauja į sąrašo apačią. */
export function visiblePlayers(
  filters: Filters,
  taken: Map<number, Pick>,
  sortKey: SortKey,
  sortDir: SortDir,
): Player[] {
  return PLAYERS.filter((p) => matches(p, filters, taken)).sort((a, b) => {
    const ta = taken.has(a.id) ? 1 : 0;
    const tb = taken.has(b.id) ? 1 : 0;
    if (ta !== tb) return ta - tb;
    if (sortKey === "name") return a.name.localeCompare(b.name) * sortDir * -1;
    return (a[sortKey] - b[sortKey]) * sortDir;
  });
}

export interface RosterNeeds {
  counts: Record<Position, number>;
  missing: Position[];
  remaining: number;
  warn: boolean;
}

export function rosterNeeds(roster: Player[]): RosterNeeds {
  const counts: Record<Position, number> = { G: 0, F: 0, C: 0 };
  for (const p of roster) counts[p.pos]++;
  const missing = (["G", "F", "C"] as Position[]).filter((k) => counts[k] === 0);
  const remaining = ROSTER_SIZE - roster.length;
  return {
    counts,
    missing,
    remaining,
    warn: missing.length > 0 && remaining <= missing.length + 2,
  };
}
