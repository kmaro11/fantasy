"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fetchAllStats } from "./euroleague";
import { buildStatsIndex, mergePlayers, type UnmatchedEntry } from "./merge";
import { PLAYERS as DEMO_PLAYERS } from "./players";
import { parseRoster, type RosterPlayer, type RosterSource } from "./roster";
import * as storage from "./storage";
import { TIER_FROM_LABEL } from "./tiers";
import type { Evaluation, OtherLeagueLine, Player } from "./types";

export type LoadPhase = "idle" | "roster" | "stats" | "merging" | "done" | "error";

export interface DataMeta {
  fetchedAt: string | null;
  matchedCount: number;
  total: number;
  /** `demo` — mockup'o duomenys, `real` — tikras importas. */
  kind: "demo" | "real";
}

interface DataContextValue {
  players: Player[];
  teams: string[];
  unmatched: UnmatchedEntry[];
  pairings: Record<string, string>;
  evaluations: Record<string, Evaluation>;
  meta: DataMeta;
  phase: LoadPhase;
  error: string | null;
  refresh: (roster?: RosterSource[]) => Promise<void>;
  pair: (sourceId: string, apiName: string) => void;
  unpair: (sourceId: string) => void;
  saveEvaluation: (sourceId: string, evaluation: Evaluation) => void;
  clearEvaluations: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

interface StoredDataset {
  players: Player[];
  unmatched: UnmatchedEntry[];
  meta: DataMeta;
}

const EMPTY_META: DataMeta = { fetchedAt: null, matchedCount: 0, total: 0, kind: "demo" };

const DEMO_META: DataMeta = {
  fetchedAt: null,
  matchedCount: 0,
  total: DEMO_PLAYERS.length,
  kind: "demo",
};

/** AI vertinimas nusveria automatinį — jis mato konkurenciją ir vaidmens pokytį. */
function applyEvaluations(players: Player[], evaluations: Record<string, Evaluation>): Player[] {
  if (!Object.keys(evaluations).length) return players;

  return players.map((player) => {
    const evaluation = player.sourceId ? evaluations[player.sourceId] : undefined;
    if (!evaluation) return player;
    return {
      ...player,
      evaluation,
      fp: evaluation.projectedFP,
      tier: TIER_FROM_LABEL[evaluation.tier],
    };
  });
}

export function DataProvider({ children }: { children: ReactNode }) {
  /**
   * Startuojam TUŠČIU sąrašu, o ne demo duomenimis. Mockup'o žaidėjai lentoje
   * atrodo kaip tikri, ir vidury drafto pagal juos galima nusirinkti ne tą
   * žmogų. Geriau trumpai tuščia lenta, nei greitai — melaginga.
   */
  const [dataset, setDataset] = useState<StoredDataset>({
    players: [],
    unmatched: [],
    meta: EMPTY_META,
  });
  const [restored, setRestored] = useState(false);
  const bootstrapped = useRef(false);
  const [pairings, setPairings] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, Evaluation>>({});
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Perkrovus naršyklę atkuriame paskutinį importą, suporavimus ir vertinimus.
  useEffect(() => {
    const stored = storage.read<StoredDataset | null>(storage.KEYS.players, null);
    if (stored?.players?.length) setDataset(stored);
    setPairings(storage.loadPairings());
    setEvaluations(storage.loadEvaluations());
    setRestored(true);
  }, []);

  const runMerge = useCallback(async (roster: RosterPlayer[], manual: Record<string, string>) => {
    setPhase("stats");
    const raw = await fetchAllStats();

    setPhase("merging");
    const index = buildStatsIndex(raw);
    const merged = mergePlayers(roster, index, manual);

    const next: StoredDataset = {
      players: merged.players,
      unmatched: merged.unmatched,
      meta: {
        fetchedAt: raw.fetchedAt,
        matchedCount: merged.matchedCount,
        total: merged.players.length,
        kind: "real",
      },
    };
    setDataset(next);
    storage.write(storage.KEYS.players, next);
    setPhase("done");
  }, []);

  const refresh = useCallback(
    async (rosterSource?: RosterSource[]) => {
      setError(null);
      try {
        let roster: RosterPlayer[];
        if (rosterSource) {
          roster = parseRoster(rosterSource);
        } else {
          setPhase("roster");
          const res = await fetch("/api/roster");
          const body = (await res.json()) as { players?: RosterPlayer[]; error?: string };
          if (!res.ok) throw new Error(body.error ?? `players.json klaida (${res.status})`);
          roster = body.players ?? [];
        }
        await runMerge(roster, pairings);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setPhase("error");
        // Nepavykus — bent demo sąrašas, kad sąsaja būtų naudojama.
        setDataset((prev) =>
          prev.players.length ? prev : { players: DEMO_PLAYERS, unmatched: [], meta: DEMO_META },
        );
      }
    },
    [pairings, runMerge],
  );

  /**
   * Pirmą kartą atidarius duomenys užsikrauna patys — mygtuko spausti nereikia.
   * Jei `localStorage` jau turi tikrą importą, jis naudojamas ir tinklo
   * neliečiam. Nepavykus (nėra players.json, nėra interneto) krentam į demo
   * sąrašą, kad sąsaja neliktų tuščia.
   */
  useEffect(() => {
    if (!restored || bootstrapped.current) return;
    bootstrapped.current = true;
    if (dataset.meta.kind === "real") return;

    void refresh().catch(() => {
      setDataset({ players: DEMO_PLAYERS, unmatched: [], meta: DEMO_META });
    });
  }, [restored, dataset.meta.kind, refresh]);

  const pair = useCallback((sourceId: string, apiName: string) => {
    setPairings((prev) => {
      const next = { ...prev, [sourceId]: apiName };
      storage.savePairings(next);
      return next;
    });
  }, []);

  const unpair = useCallback((sourceId: string) => {
    setPairings((prev) => {
      const { [sourceId]: _removed, ...rest } = prev;
      storage.savePairings(rest);
      return rest;
    });
  }, []);

  /** Saugoma po kiekvieno žaidėjo — nutrūkus 200 užklausų nereikia pradėti iš naujo. */
  const saveEvaluation = useCallback((sourceId: string, evaluation: Evaluation) => {
    setEvaluations((prev) => {
      const next = { ...prev, [sourceId]: evaluation };
      storage.saveEvaluations(next);
      return next;
    });
  }, []);

  const clearEvaluations = useCallback(() => {
    setEvaluations({});
    storage.saveEvaluations({});
  }, []);

  const players = useMemo(
    () => applyEvaluations(dataset.players, evaluations),
    [dataset.players, evaluations],
  );

  const teams = useMemo(
    () => [...new Set(players.map((p) => p.team))].sort((a, b) => a.localeCompare(b, "lt")),
    [players],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      players,
      teams,
      unmatched: dataset.unmatched,
      pairings,
      evaluations,
      meta: dataset.meta,
      phase,
      error,
      refresh,
      pair,
      unpair,
      saveEvaluation,
      clearEvaluations,
    }),
    [
      players,
      teams,
      dataset.unmatched,
      dataset.meta,
      pairings,
      evaluations,
      phase,
      error,
      refresh,
      pair,
      unpair,
      saveEvaluation,
      clearEvaluations,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const value = useContext(DataContext);
  if (!value) throw new Error("useData turi būti naudojamas DataProvider viduje");
  return value;
}
