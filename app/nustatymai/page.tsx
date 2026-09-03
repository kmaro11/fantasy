import { Card, StatLine } from "@/components/settings/card";
import { LEAGUE_TEAMS, ROSTER_SIZE, TEAM_COUNT_OPTIONS } from "@/lib/config";
import { PLAYERS } from "@/lib/players";
import { LAST_EVALUATION, LAST_IMPORT, MATCH_LEVEL_CLASS, UNMATCHED } from "@/lib/settings-data";
import { TIER_BG, TIER_LABEL, TIERS } from "@/lib/tiers";

const withStats = PLAYERS.filter((p) => p.lastLeague !== "-").length;

export default function SettingsPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-[18px]">
      <div className="grid max-w-[1180px] grid-cols-2 gap-4">
        <Card title="DUOMENYS">
          <div className="p-3">
            <div className="rounded-[3px] border border-control-line border-dashed p-[18px] text-center text-[12px] text-fg-label">
              Įkelk <span className="font-mono text-fg-soft">players.json</span> — arba nutempk
              failą čia
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                className="rounded-[3px] border border-control-line bg-control px-3 py-[7px] font-semibold text-[12px] text-fg hover:bg-control-hover"
              >
                Pasirinkti failą
              </button>
              <button
                type="button"
                className="rounded-[3px] border border-control-line bg-control px-3 py-[7px] font-semibold text-[12px] text-fg hover:bg-control-hover"
              >
                Atnaujinti duomenis
              </button>
            </div>
            <div className="mt-3 grid gap-[5px]">
              <StatLine label="Paskutinis atnaujinimas" value={LAST_IMPORT} />
              <StatLine label="Žaidėjų įrašų" value={String(PLAYERS.length)} />
              <StatLine label="Su pernykšte statistika" value={String(withStats)} />
            </div>
          </div>
        </Card>

        <Card title="LYGOS NUSTATYMAI">
          <div className="grid gap-3 p-3">
            <div>
              <div className="mb-[5px] text-[11px] text-fg-label">Komandų skaičius</div>
              <div className="flex gap-1">
                {TEAM_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`rounded-[3px] border px-3 py-[5px] font-mono text-[12px] ${
                      n === LEAGUE_TEAMS
                        ? "border-chip-on-line bg-chip-on text-fg-bright"
                        : "border-chip-line bg-chip text-fg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <StatLine
              label="Iš viso pasirinkimų lygoje"
              value={String(LEAGUE_TEAMS * ROSTER_SIZE)}
            />
            <StatLine label="Žaidėjų vienoje sudėtyje" value={String(ROSTER_SIZE)} />
          </div>
        </Card>

        <Card
          title="VARDŲ SUPORAVIMAS"
          aside={
            <div className="font-mono text-[11px] text-warn-fg">{UNMATCHED.length} nesuporuoti</div>
          }
        >
          <div>
            {UNMATCHED.map((u) => (
              <div
                key={u.src}
                className="grid grid-cols-[1fr_14px_1fr_76px] items-center gap-2 border-line-soft border-b px-3 py-[7px]"
              >
                <div>
                  <div className="text-[12px] text-fg-strong">{u.src}</div>
                  <div className="text-[10px] text-fg-dim">BasketNews</div>
                </div>
                <div className="text-center text-fg-ghost">→</div>
                <div>
                  <div className={`text-[12px] ${MATCH_LEVEL_CLASS[u.level]}`}>{u.guess}</div>
                  <div className="text-[10px] text-fg-dim">{u.conf}</div>
                </div>
                <button
                  type="button"
                  className="rounded-[3px] border border-control-line bg-control px-2 py-1 text-center font-semibold text-[11px] text-fg hover:bg-control-hover"
                >
                  Suporuoti
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="AI VERTINIMAS">
          <div className="p-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="rounded-[3px] border border-accent-line bg-accent px-3.5 py-[7px] font-bold text-[12px] text-base hover:bg-accent-hover"
              >
                Paleisti vertinimą
              </button>
              <div className="font-mono text-[11px] text-fg-muted">
                būsena: baigta · {LAST_EVALUATION}
              </div>
            </div>

            <div className="mt-3 h-[5px] overflow-hidden rounded-[3px] bg-track">
              <div className="h-full w-full bg-accent" />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-px border border-line bg-line">
              {TIERS.map((tier) => (
                <div key={tier} className="bg-cell p-2">
                  <div className="flex items-center gap-1.5">
                    <div className={`size-[7px] rounded-[1px] ${TIER_BG[tier]}`} />
                    <div className="text-[10px] text-fg-label">{TIER_LABEL[tier]}</div>
                  </div>
                  <div className="mt-[3px] font-mono text-[17px] text-fg-strong">
                    {PLAYERS.filter((p) => p.tier === tier).length}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2.5 text-[11px] text-fg-label leading-[1.45]">
              Vertinimas naudoja pernykštę Eurolygos / EuroCup statistiką, prognozuojamas minutes ir
              konkurenciją pozicijoje. Žaidėjai be duomenų vertinami tik pagal kontekstą ir niekada
              negauna <span className="text-accent">PICK!</span> pakopos.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
