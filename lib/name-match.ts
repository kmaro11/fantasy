/**
 * Vardų sulyginimas tarp BasketNews sąrašo ir Eurolygos API.
 *
 * Formatai skiriasi iš esmės:
 *   BasketNews  { firstName: "Ąžuolas", lastName: "Tubelis" }
 *   API         "TUBELIS, AZUOLAS"  — pavardė pirma, viskas didžiosiomis
 *
 * Tikri duomenys turi ir bjauresnių atvejų (visi patikrinti prieš 2025-26 rinkinį):
 *   "ALSTON JR. , DERRICK"   — tarpas prieš kablelį
 *   "BRISSETT, O'SHAE J"     — pridėtinė vardo raidė gale
 *   "WRIGHT IV, MCKINLEY"    — sufiksas prilipęs prie pavardės
 *   "M'BAYE, AMATH"          — apostrofas
 *   "DOS SANTOS, YAGO"       — dviejų dalių pavardė
 */

/** Sufiksai, kurie nėra pavardės dalis ir turi būti atskirti prieš lyginant. */
const SUFFIXES = new Set(["JR", "SR", "II", "III", "IV", "V", "VI"]);

/** Raidės, kurių NFD dekompozicija nesutvarko. */
const CHAR_MAP: Record<string, string> = {
  Ø: "O",
  Đ: "D",
  Ð: "D",
  Ł: "L",
  Þ: "T",
  ß: "SS",
  Æ: "AE",
  Œ: "OE",
  Ħ: "H",
  Ŋ: "N",
};

/** Didžiosios raidės, be diakritikų, be skyrybos, be dvigubų tarpų. */
export function normalize(input: string): string {
  return input
    .toUpperCase()
    .replace(
      /[\u00d8\u0110\u00d0\u0141\u00de\u00df\u00c6\u0152\u0126\u014a]/g,
      (c) => CHAR_MAP[c] ?? c,
    )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,'\u2019`\-\u2013\u2014_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface NameParts {
  last: string;
  first: string;
  suffix: string;
  /** Rikiavimui ir raktams: "PAVARDE|VARDAS" be sufikso. */
  key: string;
  initialKey: string;
}

function splitSuffix(tokens: string[]): { core: string[]; suffix: string } {
  const core = [...tokens];
  const suffix: string[] = [];
  while (core.length > 1 && SUFFIXES.has(core[core.length - 1])) {
    suffix.unshift(core.pop() as string);
  }
  return { core, suffix: suffix.join(" ") };
}

function parts(lastRaw: string, firstRaw: string): NameParts {
  const lastSplit = splitSuffix(normalize(lastRaw).split(" ").filter(Boolean));
  const firstSplit = splitSuffix(normalize(firstRaw).split(" ").filter(Boolean));

  const last = lastSplit.core.join(" ");
  // "O'SHAE J" → "OSHAE": pavienė raidė gale yra antro vardo inicialas, ne vardas.
  const firstTokens = firstSplit.core;
  if (firstTokens.length > 1 && firstTokens[firstTokens.length - 1].length === 1) {
    firstTokens.pop();
  }
  const first = firstTokens.join(" ");
  const suffix = lastSplit.suffix || firstSplit.suffix;

  return {
    last,
    first,
    suffix,
    key: `${last}|${first}`,
    initialKey: `${last}|${first.slice(0, 1)}`,
  };
}

/** "TUBELIS, AZUOLAS" → dalys. Be kablelio laikoma, kad paskutinis žodis — pavardė. */
export function parseApiName(apiName: string): NameParts {
  const comma = apiName.indexOf(",");
  if (comma === -1) {
    const tokens = apiName.trim().split(/\s+/);
    return parts(tokens[tokens.length - 1] ?? apiName, tokens.slice(0, -1).join(" "));
  }
  return parts(apiName.slice(0, comma), apiName.slice(comma + 1));
}

export function parseRosterName(firstName: string, lastName: string): NameParts {
  return parts(lastName, firstName);
}

/** Levenshtein atstumas, iteratyvinis su dviem eilutėmis. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** 0..1 panašumas. */
export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - levenshtein(a, b) / max;
}

export const FUZZY_THRESHOLD = 0.85;

export type MatchLevel = "exact" | "initial" | "surname" | "fuzzy" | "manual" | "none";

export interface MatchCandidate<T> {
  row: T;
  score: number;
  level: MatchLevel;
}

export interface MatchResult<T> {
  row: T | null;
  level: MatchLevel;
  score: number;
  /** Pasiūlymai rankinio suporavimo ekranui, geriausias pirmas. */
  candidates: MatchCandidate<T>[];
}

export interface Indexed<T> {
  row: T;
  name: NameParts;
}

/** Iš anksto suindeksuota API pusė — kad 200 paieškų nekainuotų 200×400 palyginimų. */
export interface NameIndex<T> {
  items: Indexed<T>[];
  byKey: Map<string, Indexed<T>[]>;
  byInitial: Map<string, Indexed<T>[]>;
  bySurname: Map<string, Indexed<T>[]>;
}

function push<T>(map: Map<string, Indexed<T>[]>, key: string, value: Indexed<T>) {
  const bucket = map.get(key);
  if (bucket) bucket.push(value);
  else map.set(key, [value]);
}

export function buildIndex<T>(rows: T[], nameOf: (row: T) => string): NameIndex<T> {
  const index: NameIndex<T> = {
    items: [],
    byKey: new Map(),
    byInitial: new Map(),
    bySurname: new Map(),
  };

  for (const row of rows) {
    const item: Indexed<T> = { row, name: parseApiName(nameOf(row)) };
    index.items.push(item);
    push(index.byKey, item.name.key, item);
    push(index.byInitial, item.name.initialKey, item);
    push(index.bySurname, item.name.last, item);
  }
  return index;
}

/**
 * Sulygina vieną žaidėją. Eiliškumas: tikslus → pavardė + inicialas →
 * unikali pavardė → fuzzy. Kai lieka keli kandidatai, sprendžia komanda.
 */
export function matchPlayer<T>(
  target: NameParts,
  index: NameIndex<T>,
  options: { team?: string; teamOf?: (row: T) => string } = {},
): MatchResult<T> {
  const { team, teamOf } = options;

  const sameTeam = (item: Indexed<T>) =>
    Boolean(team && teamOf && normalize(teamOf(item.row)) === normalize(team));

  /** Iš kelių kandidatų renkamės tos pačios komandos, kitaip — panašiausią vardą. */
  const pickBest = (bucket: Indexed<T>[]): Indexed<T> => {
    if (bucket.length === 1) return bucket[0];
    const onTeam = bucket.filter(sameTeam);
    const pool = onTeam.length === 1 ? onTeam : bucket;
    return pool.reduce((best, item) =>
      similarity(item.name.key, target.key) > similarity(best.name.key, target.key) ? item : best,
    );
  };

  /**
   * Pavardė sveria daugiau nei vardas, bet vardas turi turėti balsą — antraip
   * „Ethan Thompson" sutaptų su „THOMPSON, DARIUS" (grynos pavardės svoris
   * 0.9 peržengia 0.85 slenkstį, nors tai skirtingi žmonės).
   */
  const score = (item: Indexed<T>) =>
    0.65 * similarity(item.name.last, target.last) +
    0.35 * similarity(item.name.first, target.first);

  const candidates = (): MatchCandidate<T>[] =>
    index.items
      .map((item) => ({ row: item.row, score: score(item), level: "fuzzy" as MatchLevel }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

  /**
   * Vien pavardė ar pavardė + inicialas dar nėra įrodymas:
   *   „Damian Jones" ≠ „JONES, DEVANTE"  (ta pati pavardė IR ta pati „D")
   *   „Jabari Parker" ≠ „PARKER, TONY"
   * Todėl reikalaujame arba tos pačios komandos, arba panašaus vardo.
   * Riba 0.4 palieka vietos trumpiniams („MICHAEL" ↔ „MIKE" = 0.43), o
   * visiškai skirtingus vardus atmeta („DEVANTE" ↔ „DAMIAN" = 0.29).
   */
  const firstNamePlausible = (item: Indexed<T>) =>
    sameTeam(item) || similarity(item.name.first, target.first) >= 0.4;

  const exact = index.byKey.get(target.key);
  if (exact?.length) return { row: pickBest(exact).row, level: "exact", score: 1, candidates: [] };

  const initial = index.byInitial.get(target.initialKey);
  if (initial?.length) {
    const best = pickBest(initial);
    if (firstNamePlausible(best))
      return { row: best.row, level: "initial", score: 0.95, candidates: [] };
  }

  const surname = index.bySurname.get(target.last);

  if (surname?.length === 1 && firstNamePlausible(surname[0]))
    return { row: surname[0].row, level: "surname", score: 0.9, candidates: [] };
  if (surname && surname.length > 1) {
    const onTeam = surname.filter(sameTeam);
    if (onTeam.length === 1)
      return { row: onTeam[0].row, level: "surname", score: 0.88, candidates: [] };
  }

  const ranked = candidates();
  const best = ranked[0];
  if (best && best.score >= FUZZY_THRESHOLD)
    return { row: best.row, level: "fuzzy", score: best.score, candidates: ranked };

  return { row: null, level: "none", score: best?.score ?? 0, candidates: ranked };
}
