import type { Tier } from "./types";

export const TIER_LABEL: Record<Tier, string> = {
  1: "PICK!",
  2: "Worth to pick",
  3: "Have potential",
  4: "DO NOT PICK!",
};

/** Tailwind klasės, o ne hex — kad pakopos spalva liktų temos dalis. */
export const TIER_BG: Record<Tier, string> = {
  1: "bg-tier-1",
  2: "bg-tier-2",
  3: "bg-tier-3",
  4: "bg-tier-4",
};

export const TIERS: Tier[] = [1, 2, 3, 4];
