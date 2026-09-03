/** Kiek žaidėjų telpa į vieną sudėtį. */
export const ROSTER_SIZE = 13;

/** Draft'o lentelės stulpeliai — bendri antraštei ir eilutėms. */
export const BOARD_GRID =
  "grid-cols-[6px_minmax(0,1.7fr)_42px_minmax(0,1.15fr)_minmax(0,1.6fr)_54px_62px_76px_156px]";

/**
 * Demo draft'as: 26 jau įvykę pasirinkimai, iš jų 3 mano. Ištrink,
 * kad startuotum nuo tuščios lentos.
 */
export const SEED_PICKS = true;

/** Komandų skaičius lygoje. */
export const LEAGUE_TEAMS = 8;

export const TEAM_COUNT_OPTIONS = [6, 8, 10, 12];
