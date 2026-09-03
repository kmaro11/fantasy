# Draft Assist

Eurolygos fantasy snake draft'o pagalbininkas. Next.js 16 (App Router), TypeScript, Tailwind v4, Biome.

8 komandos × 13 žaidėjų = 104 pasirinkimai. Biudžeto nėra — taškų sistema **Modern**, ne PIR.

## Paleidimas

```bash
pnpm dev        # http://localhost:3000
pnpm build      # produkcinis build
pnpm lint       # biome check .
pnpm typecheck  # tsc --noEmit

# AI vertinimui (nebūtina — be jo veikia viskas, išskyrus 7 žingsnį):
export ANTHROPIC_API_KEY=sk-ant-...
```

Pirmas žingsnis sąsajoje: **Nustatymai → „Atnaujinti duomenis"**. Iki tol rodomi demo duomenys.

## Duomenų kelias

```
data/players.json ──► /api/roster ──┐
  (BasketNews, 328 žaidėjai)        │
                                    ├──► merge.ts ──► Player[] ──► localStorage
api-live.euroleague.net ────────────┘        │
  (6 iškvietimai, tiesiai iš naršyklės)      └──► competition, modernFP, tier
```

## Ką pavyko išsiaiškinti apie Eurolygos API

Trys dalykai, kurių iš dokumentacijos nematyti ir kurie keičia rezultatą:

**1. `statisticMode=PerGame` tyliai išmeta pusę žaidėjų.** Tai rikiuotės režimas su
kvalifikaciniu filtru `gamesPlayed >= 20`: 222 žaidėjai vietoj 335. Dingsta Larkinas
(12 rungt.), Lessort'as (8), Sedekerskis (13), Grigonis (15), Papagiannis (5) — būtent
tie, dėl kurių drafte ir galvoji. Todėl naudojamas **`Accumulated`**, o vidurkius
skaičiuoja `merge.ts`.

**2. Laukų pavadinimai ne tokie, kokių tikiesi.** Patikrinta prieš tikrą atsakymą:
`assists` (ne `assistances`), `blocks` (ne `blocksFavour`), `foulsDrawn` (ne
`foulsReceived`), `foulsCommited` (viena „t"), `pir` (ne `valuation`).

**3. `misc` duoda `wins`/`losses` kiekvienam žaidėjui** — atskiro `standings`
iškvietimo nereikia, ir tai tikslesnė pergalių dalis, nes skaičiuoja tik tas rungtynes,
kuriose žaidėjas žaidė.

CORS atviras (`Access-Control-Allow-Origin: *`), tad backendo tarpininko nereikia.
`Accept: application/json` yra būtinas — be jo dalis galinių taškų grąžina XML.

## Struktūra

```
app/
  page.tsx                draft board
  nustatymai/page.tsx     importas, lygos nustatymai, suporavimas, AI vertinimas
  api/roster/route.ts     players.json → nuskusti laukai (1.1 MB → ~50 kB)
  api/evaluate/route.ts   vieno žaidėjo AI vertinimas
lib/
  euroleague.ts     API klientas, 6 iškvietimai, total/limit patikra
  modern-fp.ts      Modern taškų formulė + pakopų slenksčiai (VIENOJE vietoje)
  name-match.ts     vardų sulyginimas: tikslus → inicialas → pavardė → fuzzy
  roster.ts         players.json parsinimas
  merge.ts          sujungimas, competition blokas, atkrintamosios
  data-store.tsx    įkelti duomenys, suporavimai, vertinimai (+ localStorage)
  draft-store.tsx   draft'o eiga, undo, filtrai, rūšiavimas (+ localStorage)
  evaluate-runner.ts AI paleidimas: kešavimas, pakartojimai, taupymo taisyklė
  snake.ts          snake eiliškumo skaičiuoklė
```

## Skaičiai iš tikrų 2025-26 duomenų

| | |
|---|---|
| Sulyginta automatiškai | 245 / 328 (75 %) |
| Be pernykštės statistikos | 83 — pernai žaidė NBA, ACB, BBL ir kt. |
| Klaidingų sutapimų | 0 (patikrinta abiem kryptimis) |
| AI užklausų reikia | 216; 112 gauna pakopą pagal slenksčius (34 % pigiau) |

Pakopų slenksčiai (`modern-fp.ts` → `TIER_THRESHOLDS`) patikrinti prieš realų
pasiskirstymą: Eurolygoje `PICK!` gauna 10 žaidėjų (4.5 %), mediana 11.4 — proporcijos
104 pasirinkimų draftui tinkamos, tad slenksčiai palikti kaip buvo.

## Sprendimai, kurie skiriasi nuo pirminės užduoties

**Temperatūra nenustatoma.** Prašyta ~0.3, bet `temperature` Claude Opus 5 modelyje
pašalinta — atsiuntus grįžta 400. Nuoseklumą duoda structured output (forma garantuota
schemos) ir `output_config.effort`.

**Be duomenų → 3 pakopa, ne 4.** 0 taškų mechaniškai kristų į „DO NOT PICK!" ir
palaidotų Valančiūną. Nežinomybė nėra tas pats, kas prastas žaidėjas.

**Būklė nieko neprislopina.** Traumuotas žaidėjas rodomas įprastai, tik su būklės žyme —
draftas yra visam sezonui.

**Bacotas, Faried, Akobundu-Ehiogu ir Kai Jonesas duomenų TURI** (užduotyje spėta
priešingai) — jie pernai žaidė Eurolygoje ar EuroCupe. Iš išvardytų be duomenų liko
Valančiūnas ir Blaževičius.

## Kas dar nepatikrinta

AI vertinimo kelias parašytas ir tipais patikrintas, bet realiai nepaleistas — šioje
aplinkoje nebuvo `ANTHROPIC_API_KEY`. Be rakto maršrutas grąžina aiškų 503.
