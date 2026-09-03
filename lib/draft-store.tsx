"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import * as storage from "./storage";
import type { Filters, Pick, SortDir, SortKey } from "./types";

interface DraftState {
  history: Pick[];
  selectedId: number | null;
  filters: Filters;
  sortKey: SortKey;
  sortDir: SortDir;
}

type Action =
  | { type: "take"; playerId: number; mine: boolean }
  | { type: "undo" }
  | { type: "reset" }
  | { type: "restore"; history: Pick[] }
  | { type: "select"; playerId: number | null }
  | { type: "filter"; patch: Partial<Filters> }
  | { type: "sort"; key: SortKey };

const INITIAL: DraftState = {
  history: [],
  selectedId: null,
  filters: { query: "", pos: "ALL", tier: "ALL", league: "ALL", team: "ALL", showTaken: false },
  sortKey: "fp",
  sortDir: -1,
};

function reducer(state: DraftState, action: Action): DraftState {
  switch (action.type) {
    case "take":
      // Tas pats žaidėjas negali būti paimtas du kartus.
      if (state.history.some((h) => h.playerId === action.playerId)) return state;
      return {
        ...state,
        history: [...state.history, { playerId: action.playerId, mine: action.mine }],
      };
    case "undo":
      return state.history.length ? { ...state, history: state.history.slice(0, -1) } : state;
    case "reset":
      return { ...state, history: [] };
    case "restore":
      return { ...state, history: action.history };
    case "select":
      return { ...state, selectedId: action.playerId };
    case "filter":
      return { ...state, filters: { ...state.filters, ...action.patch } };
    case "sort":
      return {
        ...state,
        sortKey: action.key,
        sortDir: state.sortKey === action.key ? ((state.sortDir * -1) as SortDir) : -1,
      };
  }
}

interface DraftContextValue extends DraftState {
  take: (playerId: number, mine: boolean) => void;
  undo: () => void;
  reset: () => void;
  select: (playerId: number | null) => void;
  setFilter: (patch: Partial<Filters>) => void;
  toggleSort: (key: SortKey) => void;
  canUndo: boolean;
  settings: storage.StoredSettings;
  setSettings: (patch: Partial<storage.StoredSettings>) => void;
}

const DraftContext = createContext<DraftContextValue | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [settings, setSettingsState] = useState<storage.StoredSettings>(storage.DEFAULT_SETTINGS);
  const [restored, setRestored] = useState(false);

  // Draft'o eiga turi išlikti perkrovus naršyklę — vidury drafto tai kritinė savybė.
  useEffect(() => {
    dispatch({ type: "restore", history: storage.loadHistory() });
    setSettingsState(storage.loadSettings());
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) storage.saveHistory(state.history);
  }, [state.history, restored]);

  const value = useMemo<DraftContextValue>(
    () => ({
      ...state,
      take: (playerId, mine) => dispatch({ type: "take", playerId, mine }),
      undo: () => dispatch({ type: "undo" }),
      reset: () => dispatch({ type: "reset" }),
      select: (playerId) => dispatch({ type: "select", playerId }),
      setFilter: (patch) => dispatch({ type: "filter", patch }),
      toggleSort: (key) => dispatch({ type: "sort", key }),
      canUndo: state.history.length > 0,
      settings,
      setSettings: (patch) =>
        setSettingsState((prev) => {
          const next = { ...prev, ...patch };
          storage.saveSettings(next);
          return next;
        }),
    }),
    [state, settings],
  );

  return <DraftContext.Provider value={value}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftContextValue {
  const value = useContext(DraftContext);
  if (!value) throw new Error("useDraft turi būti naudojamas DraftProvider viduje");
  return value;
}
