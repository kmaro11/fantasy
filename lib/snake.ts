/**
 * Snake eiliškumo skaičiuoklė.
 *
 * 8 komandos × 13 žaidėjų = 104 pasirinkimai. Eiliškumas apsisuka kas raundą:
 * 1→8, 8→1, 1→8… Ketvirtas pikas gauna #4, #13, #20, #29 ir t. t.
 */

export interface SnakeInfo {
  /** Visi naudotojo pikų numeriai, 1-based. */
  picks: number[];
  /** Artimiausias dar neįvykęs pikas. */
  nextPick: number | null;
  /** Kiek pasirinkimų liko iki jo. `0` — eilė dabar. */
  untilNext: number | null;
  /** Kiek pikų po `nextPick` iki dar kito — kad matytum, ar verta laukti. */
  gapAfterNext: number | null;
  currentRound: number;
  totalPicks: number;
}

export function snakePicks(slot: number, teams: number, rounds: number): number[] {
  const picks: number[] = [];
  for (let round = 0; round < rounds; round++) {
    // Lyginiai raundai (0, 2, 4…) eina pirmyn, nelyginiai — atgal.
    const inRound = round % 2 === 0 ? slot : teams - slot + 1;
    picks.push(round * teams + inRound);
  }
  return picks;
}

export function snakeInfo(
  slot: number,
  teams: number,
  rounds: number,
  picksMade: number,
): SnakeInfo {
  const picks = snakePicks(slot, teams, rounds);
  const upcoming = picks.filter((pick) => pick > picksMade);
  const nextPick = upcoming[0] ?? null;

  return {
    picks,
    nextPick,
    untilNext: nextPick === null ? null : nextPick - picksMade - 1,
    gapAfterNext: upcoming[1] !== undefined && nextPick !== null ? upcoming[1] - nextPick : null,
    currentRound: Math.floor(picksMade / teams) + 1,
    totalPicks: teams * rounds,
  };
}
