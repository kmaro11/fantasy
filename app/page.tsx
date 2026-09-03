export default function Home() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Fantasy</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Tuščias starteris: Next.js App Router, TypeScript, Tailwind v4 ir Biome.
      </p>
      <p className="text-neutral-600 dark:text-neutral-400">
        Redaguok{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 text-sm dark:bg-neutral-800">
          app/page.tsx
        </code>{" "}
        ir pradėk.
      </p>
    </div>
  );
}
