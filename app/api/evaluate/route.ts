import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EVALUATION_SCHEMA, type EvaluationResponse, stripFence } from "@/lib/evaluation-schema";
import type { Player } from "@/lib/types";

/**
 * Vieno žaidėjo vertinimas. Viena užklausa — vienas žaidėjas, kaip reikalauja
 * techninė užduotis: taip modelis nelygina žaidėjų tarpusavyje ir netaiko
 * pasiskirstymo kvotų.
 *
 * DĖL TEMPERATŪROS. Užduotyje prašyta ~0.3, bet `temperature` (kaip ir `top_p`
 * bei `top_k`) Claude Opus 5 modelyje PAŠALINTA — atsiuntus grįžta 400.
 * Nuoseklumą, dėl kurio žema temperatūra ir buvo prašoma, čia duoda du kiti
 * dalykai: structured output (forma garantuota schemos, ne modelio drausmės)
 * ir `effort`, valdantis samprotavimo gylį. Norint palyginti du to paties
 * žaidėjo paleidimus, tai tinka net geriau — svyruoja tik turinys, ne formatas.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-5";

let cachedPrompt: string | null = null;

async function systemPrompt(): Promise<string> {
  if (cachedPrompt) return cachedPrompt;
  cachedPrompt = await readFile(
    path.join(process.cwd(), "prompts", "player-evaluation.md"),
    "utf8",
  );
  return cachedPrompt;
}

/** Kaina į promptą nepatenka sąmoningai — snake drafte biudžeto nėra. */
function playerBrief(player: Player): string {
  const s = player.lastSeason;
  const lines: string[] = [
    `Žaidėjas: ${player.name}`,
    `Pozicija: ${player.pos}`,
    `Komanda 2026-27: ${player.team}`,
    `Būklė: ${player.status}`,
    player.jerseyNumber != null ? `Numeris: ${player.jerseyNumber}` : "",
    "",
  ];

  if (s) {
    const fga = s.fg2a + s.fg3a;
    const fgm = s.fg2m + s.fg3m;
    lines.push(
      `PERNYKŠTIS SEZONAS (${s.league}, ${s.club}) — vidurkiai per rungtynes:`,
      `  rungtynės ${s.gamesPlayed}, minutės ${s.minutesPerGame.toFixed(1)}`,
      `  taškai ${s.points.toFixed(1)}`,
      `  dvitaškiai ${s.fg2m.toFixed(1)}/${s.fg2a.toFixed(1)}, tritaškiai ${s.fg3m.toFixed(1)}/${s.fg3a.toFixed(1)}, baudos ${s.ftm.toFixed(1)}/${s.fta.toFixed(1)}`,
      `  bendras metimų taiklumas ${fga > 0 ? Math.round((fgm / fga) * 100) : 0}%`,
      `  atkovoti puol./gyn. ${s.oreb.toFixed(1)}/${s.dreb.toFixed(1)}`,
      `  perdavimai ${s.assists.toFixed(1)}, klaidos ${s.turnovers.toFixed(1)}`,
      `  perimti ${s.steals.toFixed(1)}, blokai ${s.blocks.toFixed(1)}, gauti blokai ${s.blocksAgainst.toFixed(1)}`,
      `  išprovokuotos pražangos ${s.foulsDrawn.toFixed(1)}, savos pražangos ${s.foulsCommitted.toFixed(1)}`,
      `  dvigubi dubliai per sezoną ${Math.round(s.doubleDoubles * s.gamesPlayed)}`,
      `  komandos pergalių dalis ${(s.winRate * 100).toFixed(0)}%`,
      `  APSKAIČIUOTI Modern taškai: ${s.modernFP.toFixed(1)} už rungtynes`,
      "",
    );
  } else if (player.lastSeasonOther) {
    const o = player.lastSeasonOther;
    const num = (value: number | null, unit = "") =>
      value === null ? "nežinoma" : `${value}${unit}`;

    lines.push(
      `PERNYKŠTIS SEZONAS KITOJE LYGOJE (${o.league}, ${o.club}, ${o.season}):`,
      `  rungtynės ${num(o.gamesPlayed)}, minutės ${num(o.minutesPerGame)}`,
      `  taškai ${num(o.points)}, atkovoti ${num(o.totalRebounds)}` +
        (o.offensiveRebounds !== null
          ? ` (puol. ${o.offensiveRebounds} / gyn. ${o.defensiveRebounds})`
          : ""),
      `  perdavimai ${num(o.assists)}, perimti ${num(o.steals)}, blokai ${num(o.blocks)}, klaidos ${num(o.turnovers)}`,
      `  taiklumas: dvitaškiai+tritaškiai ${o.fgPct ?? "nežinoma"}, tritaškiai ${o.fg3Pct ?? "nežinoma"}, baudos ${o.ftPct ?? "nežinoma"}`,
      "",
      "SVARBU dėl šių skaičių:",
      "  - Tai NE Eurolygos statistika ir NE Modern taškai. Modern taškų iš jos suskaičiuoti",
      "    neįmanoma, nes ši lyga neskelbia išprovokuotų pražangų ir gautų blokų.",
      "  - Kitų lygų skaičiai tiesiogiai neperkeliami. NBA vaidmuo ir minutės Eurolygoje",
      "    dažnai visai kitokie; ACB, NCAA ar kitų lygų rezultatyvumas paprastai krenta.",
      "  - Naudok tai kaip kontekstą apie vaidmenį ir formą, ne kaip prognozės pagrindą.",
      o.verified
        ? ""
        : `  - DĖMESIO: šaltinis pateikė apytikslius ar dalinius duomenis${o.note ? ` (${o.note})` : ""}. Pasitikėjimą nustatyk žemesnį.`,
      o.verified && o.note ? `  - Pastaba: ${o.note}` : "",
      "",
    );
  } else {
    lines.push(
      "PERNYKŠTIS SEZONAS: duomenų NĖRA — pernai nežaidė nei Eurolygoje, nei EuroCupe,",
      "o kitų lygų statistikos taip pat neturime.",
      "Statistikos neišgalvok. Vertink tik iš konteksto ir pasitikėjimą nustatyk žemesnį.",
      "",
    );
  }

  if (player.playoffs) {
    const delta = player.playoffs.minutesPerGame - player.min;
    lines.push(
      `ATKRINTAMOSIOS: ${player.playoffs.gamesPlayed} rungt., ${player.playoffs.minutesPerGame.toFixed(1)} min (${delta >= 0 ? "+" : ""}${delta.toFixed(1)} min prieš reguliarųjį sezoną), ${player.playoffs.modernFP.toFixed(1)} Modern tšk.`,
      "Vaidmens pokytis atkrintamosiose rodo, kiek treneris žaidėju pasitiki.",
      "",
    );
  }

  const rivals = player.competition?.rivals ?? [];
  if (rivals.length) {
    lines.push(`KONKURENCIJA DĖL MINUČIŲ (${player.team}, ta pati pozicijų grupė):`);
    for (const r of rivals.slice(0, 8)) {
      lines.push(
        r.league === "-"
          ? `  ${r.name} — pernykščių duomenų nėra (būklė: ${r.health})`
          : `  ${r.name} — ${r.mpg.toFixed(1)} min, ${r.points.toFixed(1)} tšk, ${r.rebounds.toFixed(1)} atk, ${r.assists.toFixed(1)} rez.perd, ${r.modernFP.toFixed(1)} Modern (būklė: ${r.health})`,
      );
    }
    const c = player.competition?.rosterComposition;
    if (c)
      lines.push(`  Sudėtis: ${c.guards} G / ${c.forwards} F / ${c.centers} C, iš viso ${c.total}`);
  } else {
    lines.push("KONKURENCIJA: tos pačios pozicijos konkurentų sudėtyje nerasta.");
  }

  return lines.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  const { player } = (await request.json()) as { player?: Player };
  if (!player) return Response.json({ error: "Trūksta `player` lauko." }, { status: 400 });

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
      output_config: {
        effort: "medium",
        format: zodOutputFormat(EVALUATION_SCHEMA),
      },
      messages: [{ role: "user", content: playerBrief(player) }],
    });

    let parsed = response.parsed_output as EvaluationResponse | null;

    // Atsarginis kelias: jei structured output neišsiparsino, imame tekstą.
    if (!parsed) {
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
      parsed = EVALUATION_SCHEMA.parse(JSON.parse(stripFence(text)));
    }

    return Response.json({ evaluation: parsed });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json(
        { error: "Pasiektas užklausų limitas.", retryable: true },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        {
          error: `Claude API klaida ${error.status}: ${error.message}`,
          retryable: error.status >= 500,
        },
        { status: 502 },
      );
    }
    return Response.json(
      { error: error instanceof Error ? error.message : String(error), retryable: true },
      { status: 500 },
    );
  }
}
