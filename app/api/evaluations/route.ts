import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Evaluation } from "@/lib/types";

/**
 * Vertinimų saugykla `data/evaluations.json`, raktas — `sourceId`.
 *
 * Kodėl ne vien `localStorage`: vertinimas kainuoja pinigus ir apie valandą
 * laiko, o naršyklės saugykla dingsta išvalius duomenis, atidarius inkognito
 * langą ar persėdus prie kito kompiuterio. Faile jie išlieka, juos galima
 * peržiūrėti ir prireikus pataisyti ranka.
 */
export const dynamic = "force-dynamic";

const FILE = () => path.join(process.cwd(), "data", "evaluations.json");

type Store = Record<string, Evaluation>;

async function load(): Promise<Store> {
  try {
    return JSON.parse(await readFile(FILE(), "utf8")) as Store;
  } catch {
    return {};
  }
}

export async function GET() {
  return Response.json({ evaluations: await load() });
}

/** Priima vieną `{ sourceId, evaluation }` arba `{ evaluations: {…} }` iš karto. */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    sourceId?: string;
    evaluation?: Evaluation;
    evaluations?: Store;
  };

  const incoming: Store =
    body.evaluations ??
    (body.sourceId && body.evaluation ? { [body.sourceId]: body.evaluation } : {});

  if (Object.keys(incoming).length === 0) {
    return Response.json({ error: "Nėra ką išsaugoti." }, { status: 400 });
  }

  // Sujungiam su tuo, kas jau yra — kad lygiagretūs rašymai vienas kito netrintų.
  const merged = { ...(await load()), ...incoming };
  await writeFile(FILE(), `${JSON.stringify(merged, null, 2)}\n`);
  return Response.json({ saved: Object.keys(incoming).length, total: Object.keys(merged).length });
}

/** Ištrina visus vertinimus. Kitaip „Išvalyti vertinimus" valytų tik naršyklę,
 *  o failas juos grąžintų per kitą įkėlimą. */
export async function DELETE() {
  await writeFile(FILE(), "{}\n");
  return Response.json({ cleared: true });
}
