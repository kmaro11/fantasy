import { SEED_PICKS } from "./config";
import { PLAYERS } from "./players";
import type { Pick } from "./types";

/** Mano pasirinkimų eilės numeriai demo draft'e. */
const MINE = [2, 9, 14];

/** Deterministinis pradinis draft'as — kad lenta atrodytų kaip įpusėjus. */
export function seedHistory(): Pick[] {
  if (!SEED_PICKS) return [];

  const byFp = [...PLAYERS].sort((a, b) => b.fp - a.fp);
  const seen: number[] = [];
  for (let i = 0; i < 26; i++) {
    const player = byFp[(i * 5 + 3) % 34];
    if (player && !seen.includes(player.id)) seen.push(player.id);
  }

  return seen.map((playerId, i) => ({ playerId, mine: MINE.includes(i) }));
}
