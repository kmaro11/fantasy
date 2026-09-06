import { z } from "zod";

/**
 * AI atsakymo schema. Sutampa su `prompts/player-evaluation.md` „Atsakymo
 * formatas" skyriumi — pakeitus vieną, būtina keisti ir kitą.
 *
 * Naudojama kaip structured output, todėl modelis fiziškai negali grąžinti
 * netinkamos formos. Markdown ```json aptvaro problema tokiu būdu dingsta iš
 * viso, bet tekstinis kelias vis tiek paliktas kaip atsarginis (žr. route.ts).
 */
export const EVALUATION_SCHEMA = z.object({
  tier: z.enum(["PICK!", "Worth to pick", "Have potential", "DO NOT PICK!"]),
  projected_fp: z.number(),
  projected_minutes: z.number(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
  availability: z.string().nullable(),
});

export type EvaluationResponse = z.infer<typeof EVALUATION_SCHEMA>;

/**
 * Visos sudėties vertinimo schema. Pora su `prompts/roster-evaluation.md`.
 *
 * Sąmoningai BE bendros taškų sumos. Ji apskaičiuojama iš `projectedFP`
 * kliento pusėje ir modeliui perduodama kaip duotybė — prašyti jos atgal
 * reikštų prašyti modelio sudėti trylika skaičių, o tai vienintelė šios
 * užduoties dalis, kurią kodas atlieka be klaidų.
 */
export const ROSTER_SCHEMA = z.object({
  verdict: z.enum(["Labai stipri", "Stipri", "Vidutinė", "Silpna"]),
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  weak_links: z.array(z.object({ name: z.string(), note: z.string() })),
  balance: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type RosterResponse = z.infer<typeof ROSTER_SCHEMA>;

/** Modelis kartais vis tiek apvynioja JSON į ```json aptvarą — nuimame. */
export function stripFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fenced ? fenced[1] : text).trim();
}
