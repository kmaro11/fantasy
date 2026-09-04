/**
 * AI vertinimo paleidimas per visą sąrašą.
 *
 * Trys dalykai, dėl kurių tai ne paprastas ciklas:
 *   1. Kešavimas — vertinama VIENĄ kartą prieš draftą. Drafto metu jokių
 *      užklausų: kai turi 20 sekundžių pikui, laukti modelio neįmanoma.
 *   2. Dalinis išsaugojimas — kiekvienas atsakymas rašomas iš karto, tad
 *      nutrūkus po 150 žaidėjų nereikia pradėti iš naujo.
 *   3. Taupymas — žaidėjams, likusiems toje pačioje komandoje ir vaidmenyje,
 *      AI beveik nieko neprideda; jų pakopa priskiriama pagal slenksčius.
 */

import { tierFromFP } from "./modern-fp";
import { TIER_LABEL } from "./tiers";
import type { Evaluation, Player } from "./types";

/** Kiek rungtynių laikome pakankama imtimi, kad vaidmuo būtų aiškus. */
const STABLE_SAMPLE_GAMES = 15;

function sameClub(player: Player): boolean {
  const now = player.team.toLowerCase().replace(/[^a-z]/g, "");
  const before = (player.lastSeason?.club ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (!before) return false;
  return now.includes(before) || before.includes(now);
}

/**
 * Ar žaidėjui tikrai reikia AI?
 *
 * Reikia: naujokams, komandą pakeitusiems, atėjusiems iš EuroCupo (kitos lygos
 * skaičiai tiesiogiai neperkeliami) ir mažos imties atvejams. Nereikia: tiems,
 * kas liko toje pačioje Eurolygos komandoje su pilnu sezonu už nugaros — jų
 * pernykštis Modern FP jau viską pasako.
 */
export function needsAi(player: Player): boolean {
  const s = player.lastSeason;
  if (!s) return true;
  if (s.league !== "EuroLeague") return true;
  if (!sameClub(player)) return true;
  if (s.gamesPlayed < STABLE_SAMPLE_GAMES) return true;
  return false;
}

/**
 * NCAA žaidėjai nevertinami. Studentų lygos skaičiai Eurolygai nieko nesako —
 * nei tempas, nei gynybos lygis, nei vaidmuo neperkeliami, o tai beveik visada
 * jauni debiutantai be jokios profesionalios imties. Jiems tiesiog paliekama
 * žyma, o pakopa — 3 („neaiškus atvejis"), ne 4.
 */
export function isNcaa(player: Player): boolean {
  return player.lastSeasonOther?.league === "NCAA";
}

export function ncaaEvaluation(player: Player): Evaluation {
  const o = player.lastSeasonOther;
  return {
    tier: "Have potential",
    projectedFP: 0,
    projectedMinutes: 0,
    confidence: "low",
    reasoning: `Pernai žaidė NCAA${o?.club ? ` (${o.club})` : ""} — jaunas žaidėjas be profesionalios Europos imties. Nevertinama: studentų lygos statistika Eurolygai nepalyginama.`,
    availability: player.status === "ready" ? null : `Būklė: ${player.status}.`,
    source: "auto",
    evaluatedAt: new Date().toISOString(),
  };
}

export function autoEvaluation(player: Player): Evaluation {
  const fp = player.lastSeasonModernFP ?? 0;
  return {
    tier: TIER_LABEL[tierFromFP(fp)] as Evaluation["tier"],
    projectedFP: Number(fp.toFixed(1)),
    projectedMinutes: Number(player.min.toFixed(1)),
    confidence: player.gp >= 25 ? "high" : "medium",
    reasoning: `Liko toje pačioje komandoje (${player.team}) tuo pačiu vaidmeniu. Pernai ${player.gp} rungtynės po ${player.min.toFixed(1)} min. ir ${fp.toFixed(1)} Modern taško — prognozė remiasi tiesiogiai šiais skaičiais, be AI korekcijos.`,
    availability: player.status === "ready" ? null : `Būklė: ${player.status}.`,
    source: "auto",
    evaluatedAt: new Date().toISOString(),
  };
}

interface ApiEvaluation {
  tier: Evaluation["tier"];
  projected_fp: number;
  projected_minutes: number;
  confidence: Evaluation["confidence"];
  reasoning: string;
  availability: string | null;
}

function toEvaluation(raw: ApiEvaluation): Evaluation {
  return {
    tier: raw.tier,
    projectedFP: raw.projected_fp,
    projectedMinutes: raw.projected_minutes,
    confidence: raw.confidence,
    reasoning: raw.reasoning,
    availability: raw.availability,
    source: "ai",
    evaluatedAt: new Date().toISOString(),
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function evaluateOne(player: Player, signal?: AbortSignal): Promise<Evaluation> {
  const res = await fetch("/api/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player }),
    signal,
  });

  const body = (await res.json()) as {
    evaluation?: ApiEvaluation;
    error?: string;
    retryable?: boolean;
  };
  if (!res.ok || !body.evaluation) {
    const error = new Error(body.error ?? `Vertinimo klaida (${res.status})`);
    // 503 be rakto kartoti beprasmiška — tai konfigūracijos, ne tinklo problema.
    (error as Error & { retryable?: boolean }).retryable = body.retryable ?? res.status !== 503;
    throw error;
  }
  return toEvaluation(body.evaluation);
}

export interface RunProgress {
  done: number;
  total: number;
  current: string;
  failed: number;
  skipped: number;
}

export interface RunOptions {
  players: Player[];
  /** Jau turimi vertinimai — jie praleidžiami. */
  existing: Record<string, Evaluation>;
  onResult: (sourceId: string, evaluation: Evaluation) => void;
  onProgress?: (progress: RunProgress) => void;
  signal?: AbortSignal;
  /** `true` — vertinti visus, ignoruojant taupymo taisyklę. */
  evaluateAll?: boolean;
  maxAttempts?: number;
}

export interface RunSummary {
  evaluated: number;
  auto: number;
  skipped: number;
  failed: { name: string; error: string }[];
}

/**
 * Nuoseklus paleidimas. Sąmoningai be lygiagretumo: 200 vienalaikių užklausų
 * greitai atsiremtų į limitą, o čia laikas nespaudžia — tai daroma kartą,
 * ramiai, prieš draftą.
 */
export async function runEvaluation(options: RunOptions): Promise<RunSummary> {
  const { players, existing, onResult, onProgress, signal, evaluateAll = false } = options;
  const maxAttempts = options.maxAttempts ?? 3;

  const summary: RunSummary = { evaluated: 0, auto: 0, skipped: 0, failed: [] };
  let done = 0;

  for (const player of players) {
    if (signal?.aborted) break;
    const sourceId = player.sourceId;
    done++;

    if (!sourceId || existing[sourceId]) {
      summary.skipped++;
      onProgress?.({
        done,
        total: players.length,
        current: player.name,
        failed: summary.failed.length,
        skipped: summary.skipped,
      });
      continue;
    }

    // NCAA — niekada nesiunčiam AI, net kai prašoma vertinti visus.
    if (isNcaa(player)) {
      onResult(sourceId, ncaaEvaluation(player));
      summary.auto++;
      onProgress?.({
        done,
        total: players.length,
        current: player.name,
        failed: summary.failed.length,
        skipped: summary.skipped,
      });
      continue;
    }

    if (!evaluateAll && !needsAi(player)) {
      onResult(sourceId, autoEvaluation(player));
      summary.auto++;
      onProgress?.({
        done,
        total: players.length,
        current: player.name,
        failed: summary.failed.length,
        skipped: summary.skipped,
      });
      continue;
    }

    let lastError = "";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        onResult(sourceId, await evaluateOne(player, signal));
        summary.evaluated++;
        lastError = "";
        break;
      } catch (cause) {
        if (signal?.aborted) return summary;
        lastError = cause instanceof Error ? cause.message : String(cause);
        const retryable = (cause as Error & { retryable?: boolean }).retryable !== false;
        if (!retryable || attempt === maxAttempts) break;
        // Eksponentinis atsitraukimas: 1s, 2s, 4s.
        await sleep(1000 * 2 ** (attempt - 1));
      }
    }

    if (lastError) summary.failed.push({ name: player.name, error: lastError });
    onProgress?.({
      done,
      total: players.length,
      current: player.name,
      failed: summary.failed.length,
      skipped: summary.skipped,
    });
  }

  return summary;
}
