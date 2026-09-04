"use client";

import { useCallback, useRef, useState } from "react";
import { Card, StatLine } from "@/components/settings/card";
import { NameMatching } from "@/components/settings/name-matching";
import { ROSTER_SIZE, TEAM_COUNT_OPTIONS } from "@/lib/config";
import { useData } from "@/lib/data-store";
import { useDraft } from "@/lib/draft-store";
import { needsAi, type RunProgress, type RunSummary, runEvaluation } from "@/lib/evaluate-runner";
import { type RosterSource, unwrapRosterJson } from "@/lib/roster";
import { snakePicks } from "@/lib/snake";
import { TIER_BG, TIER_LABEL, TIERS } from "@/lib/tiers";

const PHASE_LABEL: Record<string, string> = {
  idle: "nepaleista",
  roster: "skaitomas players.json…",
  stats: "siunčiama Eurolygos statistika…",
  merging: "sujungiama ir skaičiuojami Modern taškai…",
  done: "baigta",
  error: "klaida",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("lt-LT", { dateStyle: "short", timeStyle: "short" });
}

export default function SettingsPage() {
  const { players, meta, phase, error, refresh, evaluations, saveEvaluation, clearEvaluations } =
    useData();
  const { settings, setSettings, reset: resetDraft } = useDraft();

  const [progress, setProgress] = useState<RunProgress | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const withStats = players.filter((p) => p.lastLeague !== "-").length;
  const pending = players.filter((p) => p.sourceId && !evaluations[p.sourceId]);
  const aiNeeded = pending.filter(needsAi).length;
  const busy = phase === "roster" || phase === "stats" || phase === "merging";

  const onFile = useCallback(
    async (file: File) => {
      const parsed = unwrapRosterJson(JSON.parse(await file.text()) as unknown) as RosterSource[];
      await refresh(parsed);
    },
    [refresh],
  );

  const startEvaluation = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setSummary(null);

    const result = await runEvaluation({
      players,
      existing: evaluations,
      onResult: saveEvaluation,
      onProgress: setProgress,
      signal: controller.signal,
    });

    setSummary(result);
    setRunning(false);
    setProgress(null);
  }, [players, evaluations, saveEvaluation]);

  const picks = snakePicks(settings.myPickSlot, settings.teamCount, ROSTER_SIZE);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-[18px]">
      <div className="grid max-w-[1180px] grid-cols-2 gap-4">
        <Card title="DUOMENYS">
          <div className="p-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-[3px] border border-control-line border-dashed p-[18px] text-center text-[12px] text-fg-label hover:border-chip-on-line hover:text-fg-soft"
            >
              Įkelk <span className="font-mono text-fg-soft">players.json</span> — arba naudok
              serveryje esantį failą
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="rounded-[3px] border border-control-line bg-control px-3 py-[7px] font-semibold text-[12px] text-fg hover:bg-control-hover disabled:opacity-50"
              >
                Pasirinkti failą
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={busy}
                className="rounded-[3px] border border-accent-line bg-accent px-3 py-[7px] font-bold text-[12px] text-base hover:bg-accent-hover disabled:opacity-50"
              >
                {busy ? "Atnaujinama…" : "Atnaujinti duomenis"}
              </button>
            </div>

            <div className="mt-2 font-mono text-[11px] text-fg-muted">
              būsena: {PHASE_LABEL[phase] ?? phase}
            </div>
            {error && (
              <div className="mt-2 rounded-[3px] border border-danger-line bg-danger-bg px-2 py-1.5 text-[11px] text-danger-fg leading-[1.4]">
                {error}
              </div>
            )}

            <div className="mt-3 grid gap-[5px]">
              <StatLine label="Paskutinis atnaujinimas" value={formatTime(meta.fetchedAt)} />
              <StatLine label="Žaidėjų įrašų" value={String(players.length)} />
              <StatLine label="Su pernykšte statistika" value={String(withStats)} />
              <StatLine label="Be duomenų" value={String(players.length - withStats)} />
              <StatLine
                label="Šaltinis"
                value={meta.kind === "real" ? "Eurolygos API + players.json" : "demo duomenys"}
              />
            </div>
          </div>
        </Card>

        <Card title="LYGOS NUSTATYMAI">
          <div className="grid gap-3 p-3">
            <div>
              <div className="mb-[5px] text-[11px] text-fg-label">Komandų skaičius</div>
              <div className="flex gap-1">
                {TEAM_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setSettings({ teamCount: n, myPickSlot: Math.min(settings.myPickSlot, n) })
                    }
                    className={`rounded-[3px] border px-3 py-[5px] font-mono text-[12px] ${
                      n === settings.teamCount
                        ? "border-chip-on-line bg-chip-on text-fg-bright"
                        : "border-chip-line bg-chip text-fg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-[5px] text-[11px] text-fg-label">Mano pikas snake eilėje</div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: settings.teamCount }, (_, i) => i + 1).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSettings({ myPickSlot: slot })}
                    className={`rounded-[3px] border px-[9px] py-[5px] font-mono text-[12px] ${
                      slot === settings.myPickSlot
                        ? "border-chip-on-line bg-chip-on text-fg-bright"
                        : "border-chip-line bg-chip text-fg-muted"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-[5px] text-[11px] text-fg-label">
                Tavo pasirinkimų numeriai (snake)
              </div>
              <div className="rounded-[3px] border border-line bg-cell px-2 py-1.5 font-mono text-[12px] text-fg-value leading-[1.6]">
                {picks.join(" · ")}
              </div>
            </div>

            <StatLine
              label="Iš viso pasirinkimų lygoje"
              value={String(settings.teamCount * ROSTER_SIZE)}
            />
            <StatLine label="Žaidėjų vienoje sudėtyje" value={String(ROSTER_SIZE)} />

            <button
              type="button"
              onClick={() => {
                if (confirm("Išvalyti visą draft'o eigą? Vertinimai ir suporavimai liks.")) {
                  resetDraft();
                }
              }}
              className="justify-self-start rounded-[3px] border border-control-line bg-control px-3 py-[7px] font-semibold text-[12px] text-fg-muted hover:bg-control-hover hover:text-fg"
            >
              Išvalyti draft'o eigą
            </button>
          </div>
        </Card>

        <NameMatching />

        <Card title="AI VERTINIMAS">
          <div className="p-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => void startEvaluation()}
                disabled={running || meta.kind === "demo"}
                className="rounded-[3px] border border-accent-line bg-accent px-3.5 py-[7px] font-bold text-[12px] text-base hover:bg-accent-hover disabled:opacity-50"
              >
                {running ? "Vertinama…" : "Paleisti vertinimą"}
              </button>
              {running && (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="rounded-[3px] border border-control-line bg-control px-3 py-[7px] font-semibold text-[12px] text-fg hover:bg-control-hover"
                >
                  Stabdyti
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (confirm("Ištrinti visus AI vertinimus?")) clearEvaluations();
                }}
                disabled={running}
                className="rounded-[3px] border border-control-line bg-control px-3 py-[7px] font-semibold text-[12px] text-fg-muted hover:bg-control-hover disabled:opacity-50"
              >
                Išvalyti vertinimus
              </button>
            </div>

            <div className="mt-2.5 font-mono text-[11px] text-fg-muted">
              {progress
                ? `${progress.done}/${progress.total} · ${progress.current}`
                : `įvertinta ${Object.keys(evaluations).length}/${players.length} · liko ${pending.length} (iš jų AI reikia ${aiNeeded})`}
            </div>

            <div className="mt-2 h-[5px] overflow-hidden rounded-[3px] bg-track">
              <div
                className="h-full bg-accent transition-[width]"
                style={{
                  width: `${
                    players.length
                      ? ((progress?.done ?? Object.keys(evaluations).length) / players.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>

            {summary && (
              <div className="mt-2.5 rounded-[3px] border border-line bg-cell px-2 py-1.5 text-[11px] text-fg-mild leading-[1.5]">
                AI įvertino {summary.evaluated} · automatiškai {summary.auto} · praleista{" "}
                {summary.skipped}
                {summary.stoppedBecause && (
                  <div className="mt-1 text-danger-fg">
                    Paleidimas SUSTABDYTAS — {summary.stoppedBecause.error} Likę{" "}
                    {summary.stoppedBecause.remaining} žaidėjai net nebuvo bandyti; sutvarkius
                    priežastį paleisk dar kartą, jau įvertinti bus praleisti.
                  </div>
                )}
                {summary.failed.length > 0 && (
                  <div className="mt-1 text-danger-fg">
                    nepavyko {summary.failed.length}:{" "}
                    {summary.failed
                      .slice(0, 3)
                      .map((f) => f.name)
                      .join(", ")}
                    {summary.failed.length > 3 ? "…" : ""}. Paleisk dar kartą — jau įvertinti bus
                    praleisti.
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 grid grid-cols-4 gap-px border border-line bg-line">
              {TIERS.map((tier) => (
                <div key={tier} className="bg-cell p-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`size-[7px] rounded-[1px] ${TIER_BG[tier]}`} />
                    <div className="text-[10px] text-fg-label">{TIER_LABEL[tier]}</div>
                  </div>
                  <div className="mt-[3px] font-mono text-[17px] text-fg-strong">
                    {players.filter((p) => p.tier === tier).length}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2.5 text-[11px] text-fg-label leading-[1.45]">
              Vertinama po vieną žaidėją, rezultatai kešuojami — drafto metu užklausų nebus.
              Žaidėjams, likusiems toje pačioje Eurolygos komandoje su pilnu sezonu, pakopa
              priskiriama pagal slenksčius be AI. Vertinimas reikalauja{" "}
              <span className="font-mono text-fg-soft">ANTHROPIC_API_KEY</span>.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
