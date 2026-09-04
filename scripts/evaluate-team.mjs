/**
 * AI vertinimas po vieną komandą.
 *
 * Kodėl per `next dev` serverį, o ne tiesiai į Anthropic: promptą, schemą ir
 * žaidėjo aprašą sudaro `app/api/evaluate/route.ts`. Skriptas, kuris tai
 * kartotų savo kopijoje, tyliai nueitų į šoną po pirmo prompto pakeitimo.
 *
 * Naudojimas:
 *   node scripts/evaluate-team.mjs --list          — komandos ir jų būsena
 *   node scripts/evaluate-team.mjs 3               — komanda pagal numerį
 *   node scripts/evaluate-team.mjs Zalgiris        — arba pagal pavadinimo dalį
 *   node scripts/evaluate-team.mjs 3 --dry         — parodo, ką siųstų, ir baigia
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = process.env.APP_URL ?? "http://localhost:3000";
const MAPPED = path.join(ROOT, "data", "players2026s.mapped.json");

/**
 * Mapinto failo eilutė → `Player`. Laukų pavadinimai ten kiti (`position`,
 * `team2026`, `health`), o `competition.rivals` — tik SKAIČIUS, ne sąrašas.
 * Todėl konkurencija perskaičiuojama iš naujo; kitaip promptas netektų
 * skyriaus apie kovą dėl minučių.
 */
function toPlayer(row) {
  return {
    id: row.id,
    sourceId: row.sourceId,
    name: row.name,
    pos: row.position,
    team: row.team2026,
    teamAbbr: row.teamAbbr,
    lastTeam: row.lastSeason?.club ?? row.lastSeasonOther?.club ?? "-",
    lastLeague: row.lastLeague,
    min: row.lastSeason?.minutesPerGame ?? 0,
    gp: row.lastSeason?.gamesPlayed ?? 0,
    fp: row.lastSeasonModernFP ?? 0,
    status: row.health,
    tier: row.tier,
    jerseyNumber: row.jerseyNumber,
    lastSeasonModernFP: row.lastSeasonModernFP,
    lastSeason: row.lastSeason ?? null,
    lastSeasonOther: row.lastSeasonOther ?? null,
    playoffs: row.playoffs ?? null,
    matchLevel: row.matchLevel,
  };
}

/** Ta pati taisyklė kaip `buildCompetition`: F ir C konkuruoja tarpusavyje. */
function buildCompetition(player, all) {
  const bigs = ["F", "C"];
  const relevant = (pos) => (bigs.includes(player.pos) ? bigs.includes(pos) : pos === player.pos);
  const roster = all.filter((other) => other.team === player.team);

  return {
    rivals: roster
      .filter((other) => other.id !== player.id && relevant(other.pos))
      .map((other) => ({
        name: other.name,
        league: other.lastLeague,
        mpg: other.min,
        points: other.lastSeason?.points ?? 0,
        rebounds: (other.lastSeason?.oreb ?? 0) + (other.lastSeason?.dreb ?? 0),
        assists: other.lastSeason?.assists ?? 0,
        modernFP: other.lastSeasonModernFP ?? 0,
        health: other.status,
      }))
      .sort((a, b) => b.mpg - a.mpg || b.modernFP - a.modernFP),
    rosterComposition: {
      guards: roster.filter((p) => p.pos === "G").length,
      forwards: roster.filter((p) => p.pos === "F").length,
      centers: roster.filter((p) => p.pos === "C").length,
      total: roster.length,
    },
  };
}

async function api(route, init) {
  const res = await fetch(`${BASE}${route}`, init);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const selector = args.find((a) => a !== "--dry" && a !== "--list");

  const { players: rows } = JSON.parse(await readFile(MAPPED, "utf8"));
  const players = rows.map(toPlayer);
  for (const player of players) player.competition = buildCompetition(player, players);

  const existing = (await api("/api/evaluations")).body?.evaluations ?? {};
  const teams = [...new Set(players.map((p) => p.team))].sort((a, b) => a.localeCompare(b, "lt"));

  const remaining = (team) =>
    players.filter(
      (p) => p.team === team && !existing[p.sourceId] && p.lastSeasonOther?.league !== "NCAA",
    );

  if (args.includes("--list") || !selector) {
    console.log(`Vertinimų faile: ${Object.keys(existing).length} / ${players.length}\n`);
    teams.forEach((team, i) => {
      const left = remaining(team).length;
      const total = players.filter((p) => p.team === team).length;
      console.log(
        `${String(i + 1).padStart(2)}  ${team.padEnd(34)} ${String(total - left).padStart(2)}/${String(total).padEnd(2)}  ${left ? `liko ${left}` : "✓"}`,
      );
    });
    return;
  }

  const team = /^\d+$/.test(selector)
    ? teams[Number(selector) - 1]
    : teams.find((t) => t.toLowerCase().includes(selector.toLowerCase()));
  if (!team) {
    console.error(`Komanda „${selector}" nerasta. Paleisk su --list.`);
    process.exit(1);
  }

  /**
   * NCAA žaidėjai AI nesiunčiami — studentų lygos skaičiai Eurolygai nepalyginami.
   * Bet jie neturi likti ir be jokio įrašo: gauna žymą, kad tai jaunas debiutantas.
   * Ta pati logika kaip `ncaaEvaluation` faile `lib/evaluate-runner.ts`.
   */
  const ncaa = players.filter(
    (p) => p.team === team && !existing[p.sourceId] && p.lastSeasonOther?.league === "NCAA",
  );
  for (const player of ncaa) {
    await api("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: player.sourceId,
        evaluation: {
          tier: "Have potential",
          projectedFP: 0,
          projectedMinutes: 0,
          confidence: "low",
          reasoning: `Pernai žaidė NCAA${player.lastSeasonOther.club ? ` (${player.lastSeasonOther.club})` : ""} — jaunas žaidėjas be profesionalios Europos imties. Nevertinama: studentų lygos statistika Eurolygai nepalyginama.`,
          availability: player.status === "ready" ? null : `Būklė: ${player.status}.`,
          source: "auto",
          evaluatedAt: new Date().toISOString(),
        },
      }),
    });
    console.log(`  ${player.name.padEnd(26)} NCAA — žyma be AI vertinimo`);
  }

  const queue = remaining(team);
  console.log(`${team} — vertinti reikia ${queue.length}\n`);
  if (!queue.length) return;

  if (dry) {
    for (const p of queue) console.log(`  ${p.pos}  ${p.name}`);
    return;
  }

  let ok = 0;
  // Trys vienodos klaidos iš eilės reiškia, kad kliūtis ne žaidėjuje, o paskyroje
  // ar serveryje — tąsyk kiekviena tolesnė užklausa tik gaišina laiką.
  let repeatedError = "";
  let repeats = 0;

  for (const [i, player] of queue.entries()) {
    const label = `${String(i + 1).padStart(2)}/${queue.length}  ${player.name.padEnd(26)}`;
    const res = await api("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player }),
    });

    if (!res.ok || !res.body.evaluation) {
      const message = String(res.body.error ?? res.status);
      console.error(`${label} KLAIDA: ${message}`);

      repeats = message === repeatedError ? repeats + 1 : 1;
      repeatedError = message;

      // Be kreditų ar be rakto kiekvienas tolesnis žaidėjas duotų tą patį.
      if (res.body.fatal || repeats >= 3) {
        console.error(`\nSUSTOTA. Likę ${queue.length - i - 1} žaidėjai nebuvo bandyti.`);
        process.exit(2);
      }
      continue;
    }

    const e = res.body.evaluation;
    await api("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceId: player.sourceId,
        evaluation: {
          tier: e.tier,
          projectedFP: e.projected_fp,
          projectedMinutes: e.projected_minutes,
          confidence: e.confidence,
          reasoning: e.reasoning,
          availability: e.availability,
          source: "ai",
          evaluatedAt: new Date().toISOString(),
        },
      }),
    });
    ok++;
    repeats = 0;
    repeatedError = "";
    console.log(
      `${label} ${e.tier.padEnd(15)} ${String(Math.round(e.projected_fp)).padStart(2)} FP  ${String(Math.round(e.projected_minutes)).padStart(2)} min`,
    );
  }

  console.log(`\n${team}: įvertinta ${ok} / ${queue.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
