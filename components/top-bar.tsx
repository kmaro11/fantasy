"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROSTER_SIZE } from "@/lib/config";
import { useData } from "@/lib/data-store";
import { useDraft } from "@/lib/draft-store";
import { myRoster } from "@/lib/selectors";

const TABS = [
  { href: "/", label: "Draft board" },
  { href: "/nustatymai", label: "Nustatymai" },
] as const;

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="text-right">
      <div className="text-[10px] tracking-[0.12em] text-fg-dim">{label}</div>
      <div className={`font-mono text-[15px] font-medium ${className}`}>{value}</div>
    </div>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const { history, undo, canUndo } = useDraft();
  const { players } = useData();
  const roster = myRoster(history, players);
  const full = roster.length >= ROSTER_SIZE;

  return (
    <header className="flex flex-none items-stretch border-line border-b bg-bar">
      <div className="flex items-center gap-2.5 border-line border-r px-4">
        <div className="size-[9px] rounded-[2px] bg-accent" />
        <div className="font-bold text-[12px] text-fg-muted tracking-[0.14em]">DRAFT ASSIST</div>
      </div>

      <nav className="flex items-stretch">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center px-[18px] font-semibold text-[13px] tracking-[0.04em] transition-colors hover:text-fg-bright ${
                active
                  ? "bg-tab-active text-fg-bright shadow-[inset_0_-2px_0_var(--color-accent)]"
                  : "text-fg-label"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-[22px] border-line border-l py-2 pr-3.5 pl-5">
        <Metric
          label="LAISVI"
          value={String(players.length - history.length)}
          className="text-fg-value"
        />
        <Metric label="PAIMTI" value={String(history.length)} className="text-fg-muted" />

        <div className="border-line border-l pl-[22px] text-right">
          <div className="text-[10px] tracking-[0.12em] text-fg-dim">MANO SUDĖTIS</div>
          <div className="flex items-baseline justify-end gap-2">
            <div
              className={`font-bold font-mono text-[30px] leading-none ${full ? "text-accent" : "text-fg-strong"}`}
            >
              {roster.length}
            </div>
            <div className="text-[12px] text-fg-muted">/ {ROSTER_SIZE}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          className={`flex flex-col items-center gap-0.5 rounded border border-line-strong bg-control px-3 py-[7px] transition-colors enabled:hover:bg-row-hover ${
            canUndo ? "text-fg-strong" : "cursor-default text-fg-ghost"
          }`}
        >
          <span className="font-bold text-[13px]">UNDO</span>
          <span className="text-[10px] text-fg-dim tracking-[0.06em]">
            {canUndo ? "atšaukti paskutinį" : "nėra ką atšaukti"}
          </span>
        </button>
      </div>
    </header>
  );
}
