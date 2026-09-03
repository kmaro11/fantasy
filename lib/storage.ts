/**
 * Būsenos išsaugojimas tarp naršyklės perkrovimų.
 *
 * Raktai atskiri pagal paskirtį, o ne vienas didelis objektas — kad naujas
 * duomenų importas neištrintų AI vertinimų ar rankinių suporavimų. Būtent dėl
 * to `evaluations` ir `pairings` rakinami pagal `sourceId`, o ne pagal indeksą
 * sąraše: indeksai po naujo importo pasislenka, `sourceId` — ne.
 */

import type { Evaluation, Pick } from "./types";

const PREFIX = "draft-assist:v1";

export const KEYS = {
  players: `${PREFIX}:players`,
  pairings: `${PREFIX}:pairings`,
  evaluations: `${PREFIX}:evaluations`,
  history: `${PREFIX}:history`,
  settings: `${PREFIX}:settings`,
} as const;

/** Serverio pusėje `localStorage` neegzistuoja, o privačiame režime gali mesti. */
function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function read<T>(key: string, fallback: T): T {
  const store = safeStorage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function write(key: string, value: unknown): boolean {
  const store = safeStorage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Greičiausiai kvotos riba — sąsaja lieka veikti, tik neišsaugo.
    return false;
  }
}

export function remove(key: string): void {
  safeStorage()?.removeItem(key);
}

export interface StoredSettings {
  teamCount: number;
  /** Naudotojo pikas snake eilėje, 1..teamCount. */
  myPickSlot: number;
}

export const DEFAULT_SETTINGS: StoredSettings = { teamCount: 8, myPickSlot: 1 };

export const loadHistory = () => read<Pick[]>(KEYS.history, []);
export const saveHistory = (history: Pick[]) => write(KEYS.history, history);

export const loadPairings = () => read<Record<string, string>>(KEYS.pairings, {});
export const savePairings = (pairings: Record<string, string>) => write(KEYS.pairings, pairings);

export const loadEvaluations = () => read<Record<string, Evaluation>>(KEYS.evaluations, {});
export const saveEvaluations = (evaluations: Record<string, Evaluation>) =>
  write(KEYS.evaluations, evaluations);

export const loadSettings = () => read<StoredSettings>(KEYS.settings, DEFAULT_SETTINGS);
export const saveSettings = (settings: StoredSettings) => write(KEYS.settings, settings);
