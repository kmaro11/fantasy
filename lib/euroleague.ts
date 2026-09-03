/**
 * Eurolygos statistikos API klientas.
 *
 * Laukų pavadinimai patikrinti prieš tikrą atsakymą 2026-09-03, ne atspėti.
 * Dėmesio šioms vietoms — jos skiriasi nuo to, ką siūlo senesnė dokumentacija:
 *   assists        (NE assistances)
 *   blocks         (NE blocksFavour)
 *   foulsDrawn     (NE foulsReceived)
 *   foulsCommited  (viena „t")
 *   pir            (NE valuation)
 *
 * CORS: serveris siunčia `Access-Control-Allow-Origin: *`, todėl užklausos
 * daromos tiesiai iš naršyklės. Backendo tarpininko nereikia.
 */

const BASE = "https://api-live.euroleague.net";

export type Competition = "E" | "U";
export type PhaseType = "RS" | "PO";
export type Endpoint = "traditional" | "misc" | "advanced" | "scoring";

/**
 * NAUDOJAME `Accumulated`, NE `PerGame` — ir tai nėra skonio reikalas.
 *
 * `PerGame` yra rikiuotės (leaderboard) režimas: jis taiko kvalifikacinį
 * filtrą `gamesPlayed >= 20` ir tyliai išmeta visus, kas praleido pusę
 * sezono. 2025-26 duomenyse tai reiškia 222 žaidėjus vietoj 335 — be
 * Larkino (12 rungt.), Lessort'o (8), Sedekerskio (13), Grigonio (15),
 * Papagiannio (5). Fantasy drafte tai kaip tik tie žaidėjai, dėl kurių
 * verta galvoti, tad filtras nepriimtinas.
 *
 * `Accumulated` grąžina visus iki `gamesPlayed = 1` sezono sumomis;
 * dalybą į vidurkius daro `toPerGame`.
 */
const STATISTIC_MODE = "Accumulated";

/** Sezono kodas naudoja PRADŽIOS metus: 2025-26 sezonas → E2025. */
export const SEASON_YEAR = 2025;

export const LEAGUE_OF: Record<Competition, "EuroLeague" | "EuroCup"> = {
  E: "EuroLeague",
  U: "EuroCup",
};

interface ApiTeam {
  code: string;
  tvCodes: string;
  name: string;
  imageUrl: string;
}

interface ApiPlayerRef {
  code: string;
  name: string;
  age: number;
  imageUrl: string;
  team: ApiTeam;
}

/** `traditional` eilutė. Visi skaičiai — SEZONO SUMOS (žr. STATISTIC_MODE). */
export interface TraditionalRow {
  playerRanking: number;
  player: ApiPlayerRef;
  gamesPlayed: number;
  gamesStarted: number;
  minutesPlayed: number;
  pointsScored: number;
  twoPointersMade: number;
  twoPointersAttempted: number;
  twoPointersPercentage: string;
  threePointersMade: number;
  threePointersAttempted: number;
  threePointersPercentage: string;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  freeThrowsPercentage: string;
  offensiveRebounds: number;
  defensiveRebounds: number;
  totalRebounds: number;
  assists: number;
  steals: number;
  turnovers: number;
  blocks: number;
  blocksAgainst: number;
  foulsCommited: number;
  foulsDrawn: number;
  pir: number;
}

/**
 * `misc` eilutė. `wins` / `losses` čia duoda komandos pergalių dalį, todėl
 * atskiro `standings` iškvietimo nereikia — ir tai tikslesnė reikšmė, nes
 * skaičiuojamos tik tos rungtynės, kuriose žaidėjas iš tikrųjų žaidė.
 */
export interface MiscRow {
  playerRanking: number;
  player: ApiPlayerRef;
  gamesPlayed: number;
  gamesStarted: number;
  wins: number;
  losses: number;
  minutesPlayed: number;
  doubleDoubles: number;
  tripleDoubles: number;
}

interface Envelope<T> {
  total: number;
  players: T[];
}

export interface StatsQuery {
  competition: Competition;
  endpoint: Endpoint;
  phaseTypeCode: PhaseType;
  seasonYear?: number;
  limit?: number;
}

export function statsUrl({
  competition,
  endpoint,
  phaseTypeCode,
  seasonYear = SEASON_YEAR,
  limit = 400,
}: StatsQuery): string {
  const params = new URLSearchParams({
    SeasonMode: "Single",
    SeasonCode: `${competition}${seasonYear}`,
    statisticMode: STATISTIC_MODE,
    phaseTypeCode,
    limit: String(limit),
  });
  return `${BASE}/v3/competitions/${competition}/statistics/players/${endpoint}?${params}`;
}

/**
 * `Accept: application/json` yra būtinas, o ne dekoratyvinis. Serveris derina
 * turinio tipą, ir be šios antraštės dalis Eurolygos galinių taškų grąžina XML
 * (`<PlayerTraditionalStatsItemModel>…`), kurį `res.json()` sulaužytų su
 * neaiškia „Unexpected token <" klaida. Antraštė yra CORS-safelisted, tad
 * papildomos `OPTIONS` užklausos nesukelia.
 *
 * Šis `v3` galinis taškas praktikoje JSON grąžina visada, bet tikriname turinio
 * tipą — kad perjungus hostą ar versiją klaida būtų suprantama iš karto.
 */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<Envelope<T>> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Eurolygos API ${res.status} ${res.statusText} — ${url}`);

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    const head = (await res.text()).slice(0, 120);
    throw new Error(
      `Eurolygos API grąžino ne JSON (${contentType || "be content-type"}) — ${url}\n${head}`,
    );
  }
  return (await res.json()) as Envelope<T>;
}

/**
 * Vienas statistikos iškvietimas. Jei `total` didesnis už grąžintų įrašų
 * kiekį, užklausa kartojama su `limit = total + 1`.
 */
export async function fetchStats<T>(query: StatsQuery, signal?: AbortSignal): Promise<T[]> {
  const first = await getJson<T>(statsUrl(query), signal);
  if (first.total <= first.players.length) return first.players;

  const full = await getJson<T>(statsUrl({ ...query, limit: first.total + 1 }), signal);
  return full.players;
}

export interface RawStats {
  el: { traditional: TraditionalRow[]; misc: MiscRow[] };
  ec: { traditional: TraditionalRow[]; misc: MiscRow[] };
  playoffs: { traditional: TraditionalRow[]; misc: MiscRow[] };
  fetchedAt: string;
}

/**
 * Visi šeši reikalingi iškvietimai. EuroCupas būtinas — visa Beşiktaş sudėtis
 * pernai žaidė ten, o ne Eurolygoje.
 */
export async function fetchAllStats(signal?: AbortSignal): Promise<RawStats> {
  const [elTrad, elMisc, ecTrad, ecMisc, poTrad, poMisc] = await Promise.all([
    fetchStats<TraditionalRow>(
      { competition: "E", endpoint: "traditional", phaseTypeCode: "RS" },
      signal,
    ),
    fetchStats<MiscRow>({ competition: "E", endpoint: "misc", phaseTypeCode: "RS" }, signal),
    fetchStats<TraditionalRow>(
      { competition: "U", endpoint: "traditional", phaseTypeCode: "RS" },
      signal,
    ),
    fetchStats<MiscRow>({ competition: "U", endpoint: "misc", phaseTypeCode: "RS" }, signal),
    fetchStats<TraditionalRow>(
      { competition: "E", endpoint: "traditional", phaseTypeCode: "PO" },
      signal,
    ),
    fetchStats<MiscRow>({ competition: "E", endpoint: "misc", phaseTypeCode: "PO" }, signal),
  ]);

  return {
    el: { traditional: elTrad, misc: elMisc },
    ec: { traditional: ecTrad, misc: ecMisc },
    playoffs: { traditional: poTrad, misc: poMisc },
    fetchedAt: new Date().toISOString(),
  };
}
