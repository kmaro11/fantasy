import { readFile } from "node:fs/promises";
import path from "node:path";
import type { OtherLeagueLine } from "@/lib/types";

/**
 * Kitų lygų (NBA, ACB, NCAA…) pernykštė statistika tiems žaidėjams, kurie
 * nežaidė Eurolygoje ar EuroCupe.
 *
 * Failas `data/other-leagues.json` pildomas ranka — automatinio šaltinio nėra:
 * basketball-reference, proballers ir eurobasket blokuoja užklausas, o NBA API
 * reikalauja rakto. Trūkstamas įrašas nėra klaida: žaidėjas tiesiog vertinamas
 * tik iš konteksto.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "other-leagues.json"), "utf8");
    const parsed = JSON.parse(raw) as { players?: Record<string, OtherLeagueLine> };
    return Response.json({ players: parsed.players ?? {} });
  } catch {
    // Failo gali ir nebūti — grąžinam tuščią rinkinį, o ne klaidą.
    return Response.json({ players: {} });
  }
}
