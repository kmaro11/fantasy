import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ROSTER_SIZE } from "@/lib/config";
import { ROSTER_SCHEMA, type RosterResponse, stripFence } from "@/lib/evaluation-schema";
import type { Player } from "@/lib/types";

/**
 * Visos surinktos sudėties vertinimas — vienas iškvietimas visiems žaidėjams,
 * priešingai nei `/api/evaluate`, kur kiekvienas vertinamas atskirai. Čia kaip
 * tik ir domina sąveika tarp jų: klubų sutapimai, pozicijų skylės, rizikų
 * susikaupimas. Vertinant po vieną, to pamatyti neįmanoma.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-5";

let cachedPrompt: string | null = null;

async function systemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  cachedPrompt = await readFile(
    path.join(process.cwd(), "prompts", "roster-evaluation.md"),
    "utf8",
  );
  return cachedPrompt;
}

/**
 * Sudėties aprašas modeliui.
 *
 * KRITIŠKA: žaidėjai rikiuojami pagal prognozuojamus taškus, NE pagal pikų eilę,
 * ir pikų numeriai neperduodami iš viso. Naudotojas aiškiai prašė nevertinti jo
 * pasirinkimų eilės — patikimiausias būdas to pasiekti yra ne uždrausti prompte,
 * o tiesiog neduoti tos informacijos. Ko modelis nemato, to ir neįvertins.
 */
function rosterBrief(players: Player[]): string {
  const sorted = [...players].sort((a, b) => b.fp - a.fp);
  const total = sorted.reduce((sum, p) => sum + p.fp, 0);

  const count = (pos: string) => sorted.filter((p) => p.pos === pos).length;
  const clubs = new Map<string, number>();
  for (const p of sorted) clubs.set(p.team, (clubs.get(p.team) ?? 0) + 1);
  const shared = [...clubs.entries()].filter(([, n]) => n > 1);

  const lines: string[] = [
    `SUDĖTIS: užimta ${sorted.length} vietų iš ${ROSTER_SIZE}.`,
    `Pozicijos: ${count("G")} G / ${count("F")} F / ${count("C")} C`,
    `Bendra prognozuojamų taškų suma: ${total.toFixed(1)} už rungtynes (apskaičiuota, nesumuok iš naujo).`,
    shared.length
      ? `Klubų sutapimai: ${shared.map(([club, n]) => `${club} — ${n}`).join(", ")}`
      : "Klubų sutapimų nėra — visi žaidėjai iš skirtingų komandų.",
    "",
    "ŽAIDĖJAI (surikiuoti pagal prognozę, ne pagal pasirinkimo eilę):",
    "",
  ];

  for (const p of sorted) {
    const e = p.evaluation;
    lines.push(
      `${p.name} — ${p.pos}, ${p.team}`,
      `  prognozė: ${p.fp.toFixed(1)} Modern tšk. per ${e ? e.projectedMinutes.toFixed(0) : "?"} min` +
        (e ? `, pasitikėjimas ${e.confidence}, pakopa „${e.tier}"` : ""),
      p.lastSeason
        ? `  pernai: ${p.lastSeason.league}, ${p.lastSeason.club}, ${p.lastSeason.gamesPlayed} rungt., ${p.lastSeason.minutesPerGame.toFixed(1)} min, ${p.lastSeason.modernFP.toFixed(1)} Modern tšk.`
        : p.lastSeasonOther
          ? `  pernai: ${p.lastSeasonOther.league}, ${p.lastSeasonOther.club} — kitos lygos statistika, su Eurolygos nepalyginama`
          : "  pernai: duomenų nėra",
      p.status !== "ready" ? `  būklė: ${p.status}` : "",
      e?.availability ? `  ${e.availability}` : "",
      e ? `  vertinimas: ${e.reasoning}` : "",
      "",
    );
  }

  return lines.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const { players } = (await request.json()) as { players?: Player[] };
  if (!players?.length) {
    return Response.json({ error: "Sudėtis tuščia — nėra ko vertinti." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Nenustatytas ANTHROPIC_API_KEY — vertinimo paleisti negalima." },
      { status: 503 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: await systemPrompt(),
      output_config: { effort: "medium", format: zodOutputFormat(ROSTER_SCHEMA) },
      messages: [{ role: "user", content: rosterBrief(players) }],
    });

    let parsed = response.parsed_output as RosterResponse | null;
    if (!parsed) {
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      parsed = ROSTER_SCHEMA.parse(JSON.parse(stripFence(text)));
    }

    return Response.json({ review: parsed });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: `Claude API klaida ${error.status}: ${error.message}` },
        { status: 502 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
