import type { ReactNode } from "react";

export function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded border border-line bg-panel">
      <div className="flex items-center justify-between border-line border-b px-3 py-[9px]">
        <h2 className="text-[10px] text-fg-label tracking-[0.12em]">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[12px] text-fg-muted">
      <span>{label}</span>
      <span className="font-mono text-fg-value">{value}</span>
    </div>
  );
}
