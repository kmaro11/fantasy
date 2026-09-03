/** Statiniai duomenys nustatymų vaizdui, kol nėra tikro importo pipeline. */

export const LAST_IMPORT = "2026-09-03 18:42";

export const LAST_EVALUATION = "2026-09-03 18:44";

export interface UnmatchedName {
  src: string;
  guess: string;
  conf: string;
  /** Sutapimo patikimumas — nuo jo priklauso spalva. */
  level: "high" | "medium" | "none";
}

export const UNMATCHED: UnmatchedName[] = [
  { src: "Vezenkov, S.", guess: "Sasha Vezenkov", conf: "sutapimas 0.94", level: "high" },
  { src: "Micić Vasilije", guess: "Vasilije Micic", conf: "sutapimas 0.91", level: "high" },
  { src: "Hifi N.", guess: "Nadir Hifi", conf: "sutapimas 0.88", level: "medium" },
  { src: "Jokubaitis R.", guess: "Rokas Jokubaitis", conf: "sutapimas 0.86", level: "medium" },
  {
    src: "A. Tubelis",
    guess: "— nerasta atitikmens",
    conf: "reikia rankinio pasirinkimo",
    level: "none",
  },
];

export const MATCH_LEVEL_CLASS: Record<UnmatchedName["level"], string> = {
  high: "text-tier-1",
  medium: "text-tier-3",
  none: "text-tier-4",
};
