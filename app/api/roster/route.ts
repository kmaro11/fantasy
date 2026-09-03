import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseRoster, type RosterSource, unwrapRosterJson } from "@/lib/roster";

/**
 * Atiduoda `data/players.json` jau nuskustą iki reikalingų laukų.
 *
 * Failas sveria ~1.1 MB daugiausia dėl `games` masyvų, kurių vertinimui
 * nereikia — importuoti jį tiesiai į klientą reikštų tiek pat nešti į naršyklę.
 * Čia jis perskaitomas serveryje ir grąžinamas ~50 kB.
 *
 * Naudotojas gali įkelti failą ir rankomis (žr. nustatymų puslapį) — tada šis
 * maršrutas apeinamas, o parsinimas vyksta naršyklėje tuo pačiu `parseRoster`.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const file = path.join(process.cwd(), "data", "players.json");

  try {
    const raw = await readFile(file, "utf8");
    const players = parseRoster(unwrapRosterJson(JSON.parse(raw) as unknown) as RosterSource[]);
    return Response.json({ players, source: "data/players.json" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = (error as NodeJS.ErrnoException)?.code === "ENOENT";
    return Response.json(
      {
        error: missing
          ? "data/players.json nerastas — įkelk failą nustatymų puslapyje."
          : `Nepavyko perskaityti players.json: ${message}`,
      },
      { status: missing ? 404 : 500 },
    );
  }
}
