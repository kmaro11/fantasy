"use client";

import { useCallback, useEffect, useState } from "react";
import { ROSTER_SIZE } from "@/lib/config";
import { useData } from "@/lib/data-store";
import { useDraft } from "@/lib/draft-store";
import type { RosterResponse } from "@/lib/evaluation-schema";
import { myRoster } from "@/lib/selectors";

const VERDICT_CLASS: Record<RosterResponse["verdict"], string> = {
  "Labai stipri": "bg-tier-1",
  Stipri: "bg-tier-2",
  Vidutinė: "bg-tier-3",
  Silpna: "bg-tier-4",
};

const CONFIDENCE_LABEL: Record<RosterResponse["confidence"], string> = {
  high: "aukštas",
  medium: "vidutinis",
  low: "žemas",
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-[7px] text-[10px] text-fg-dim tracking-[0.12em]">{label}</div>
      {children}
    </div>
  );
}

function Bullets({ items, marker }: { items: string[]; marker: string }) {
  return (
    <ul className="grid gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-[12px] text-fg-mild leading-[1.5]">
          <span className="flex-none text-fg-dim">{marker}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function RosterReview({ onClose }: { onClose: () => void }) {
  const { history } = useDraft();
  const { players } = useData();
  const roster = myRoster(history, players);

  const [review, setReview] = useState<RosterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const total = roster.reduce((sum, p) => sum + p.fp, 0);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: roster }),
      });
      const body = (await res.json()) as { review?: RosterResponse; error?: string };
      if (!res.ok || !body.review) throw new Error(body.error ?? `Klaida (${res.status})`);
      setReview(body.review);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRunning(false);
    }
  }, [roster]);

  // Esc uždaro — modalas perdengia visą lentą, ir pelė ne visada po ranka.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Fonas yra mygtukas, o ne div su onClick — taip uždarymas pasiekiamas
          ir klaviatūra, be dirbtinių rolių ar lint išimčių. */}
      <button
        type="button"
        aria-label="Uždaryti"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />

      <div className="relative flex max-h-full w-[min(640px,92vw)] flex-col overflow-hidden rounded-[4px] border border-line-strong bg-panel">
        <div className="flex flex-none items-start gap-3 border-line border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[16px] text-fg-bright">Sudėties vertinimas</div>
            <div className="mt-0.5 font-mono text-[11px] text-fg-muted">
              {roster.length}/{ROSTER_SIZE} žaidėjų · {total.toFixed(1)} prognozuojamų FP
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-none rounded-[3px] border border-control-line bg-control px-2 py-1 text-[12px] text-fg-muted hover:text-fg"
          >
            Uždaryti
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
          {!roster.length ? (
            <div className="text-[12px] text-fg-muted leading-[1.5]">
              Sudėtis tuščia. Pažymėk bent vieną žaidėją mygtuku „Imu aš“.
            </div>
          ) : !review ? (
            <div className="grid gap-3">
              <div className="text-[12px] text-fg-mild leading-[1.55]">
                Vertinami patys žaidėjai — ar tai geras rinkinys. Pasirinkimų eilė nevertinama:
                modeliui ji net nesiunčiama, sudėtis paduodama surikiuota pagal prognozę.
              </div>
              <button
                type="button"
                onClick={() => void run()}
                disabled={running}
                className="justify-self-start rounded-[3px] border border-accent-line bg-accent px-3 py-[7px] font-bold text-[12px] text-base hover:bg-accent-hover disabled:opacity-50"
              >
                {running ? "Vertinama…" : "Įvertinti sudėtį"}
              </button>
              {error && (
                <div className="rounded-[3px] border border-danger-line bg-danger-bg px-2 py-1.5 text-[11px] text-danger-fg leading-[1.4]">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`rounded-[2px] px-[9px] py-1 font-bold text-[13px] text-base tracking-[0.04em] ${VERDICT_CLASS[review.verdict]}`}
                >
                  {review.verdict}
                </div>
                <div className="font-mono text-[11px] text-fg-dim">
                  pasitikėjimas: {CONFIDENCE_LABEL[review.confidence]}
                </div>
              </div>

              <div className="text-[13px] text-fg-mild leading-[1.6]">{review.summary}</div>

              {review.strengths.length > 0 && (
                <Section label="STIPRYBĖS">
                  <Bullets items={review.strengths} marker="+" />
                </Section>
              )}

              {review.weaknesses.length > 0 && (
                <Section label="TRŪKUMAI">
                  <Bullets items={review.weaknesses} marker="−" />
                </Section>
              )}

              {review.weak_links.length > 0 && (
                <Section label="SILPNIAUSIOS GRANDYS">
                  <div className="grid gap-1.5">
                    {review.weak_links.map((link) => (
                      <div
                        key={link.name}
                        className="rounded-[3px] border border-line bg-cell px-2 py-1.5"
                      >
                        <div className="font-semibold text-[12px] text-fg-strong">{link.name}</div>
                        <div className="mt-0.5 text-[12px] text-fg-muted leading-[1.45]">
                          {link.note}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <Section label="PASISKIRSTYMAS">
                <div className="text-[12px] text-fg-mild leading-[1.5]">{review.balance}</div>
              </Section>

              <button
                type="button"
                onClick={() => void run()}
                disabled={running}
                className="justify-self-start rounded-[3px] border border-control-line bg-control px-3 py-[6px] font-semibold text-[12px] text-fg-muted hover:bg-control-hover hover:text-fg disabled:opacity-50"
              >
                {running ? "Vertinama…" : "Vertinti iš naujo"}
              </button>
              {error && (
                <div className="rounded-[3px] border border-danger-line bg-danger-bg px-2 py-1.5 text-[11px] text-danger-fg leading-[1.4]">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
