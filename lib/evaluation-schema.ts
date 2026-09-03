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
  risk_flags: z.array(z.string()),
  availability: z.string().nullable(),
  upside: z.string().nullable(),
});

export type EvaluationResponse = z.infer<typeof EVALUATION_SCHEMA>;

/** Modelis kartais vis tiek apvynioja JSON į ```json aptvarą — nuimame. */
export function stripFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return (fenced ? fenced[1] : text).trim();
}
