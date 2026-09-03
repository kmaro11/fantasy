"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchAllStats } from "./euroleague";
import { buildStatsIndex, mergePlayers, type UnmatchedEntry } from "./merge";
import { PLAYERS as DEMO_PLAYERS } from "./players";
import { parseRoster, type RosterPlayer, type RosterSource } from "./roster";
import * as storage from "./storage";
import { TIER_FROM_LABEL } from "./tiers";
import type { Evaluation, Player } from "./types";

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
  const [dataset, setDataset] = useState<StoredDataset>({
    players: DEMO_PLAYERS,
    unmatched: [],
    meta: DEMO_META,
  });
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
      }
    },
    [pairings, runMerge],
  );

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
