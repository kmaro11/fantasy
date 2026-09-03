# Draft Assist

Eurolygos fantasy draft'o pagalbininkas. Next.js 16 (App Router), TypeScript, Tailwind v4, Biome.

Sukurta pagal `Draft board mockup paruoštas/Draft Assist.dc.html` dizainą — visas mockup'o
`sc-for` / `sc-if` šablonas perrašytas React komponentais, spalvos perkeltos į Tailwind temos
tokenus, o logika (filtrai, rūšiavimas, undo) — į `useReducer` būseną.

## Paleidimas

```bash
pnpm dev        # http://localhost:3000
pnpm build      # produkcinis build
pnpm lint       # biome check .
pnpm format     # biome check --write .
pnpm typecheck  # tsc --noEmit
```

## Struktūra

```
app/
  layout.tsx            šriftai, DraftProvider, viršutinė juosta
  page.tsx              draft board (lentelė + panelė + sudėtis)
  nustatymai/page.tsx   duomenys, lygos nustatymai, vardų suporavimas, AI vertinimas
  globals.css           Tailwind tema — dizaino paletė kaip tokenai
components/
  top-bar.tsx           logotipas, tab'ai, LAISVI / PAIMTI / MANO SUDĖTIS, UNDO
  board/                filter-bar, player-table, player-row, detail-panel, roster-sidebar
  settings/card.tsx     nustatymų kortelės karkasas
lib/
  types.ts              Player, Pick, Filters, Tier ir kt.
  players.ts            žaidėjų duomenys (96 įrašai iš mockup'o)
  draft-store.tsx       React context + reducer: take / undo / select / filtrai / rūšiavimas
  selectors.ts          matomos eilutės, paimtų žemėlapis, sudėties poreikiai
  analysis.ts           statistika, konkurencija, AI pagrindimas, pasitikėjimas
  config.ts             sudėties dydis, lentelės stulpeliai, demo seed'o jungiklis
  settings-data.ts      statiniai nustatymų duomenys (nesuporuoti vardai, laiko žymos)
```

## Kas skiriasi nuo mockup'o

- **Skaičiai tikri.** Mockup'as hardcode'ino „204 žaidėjai" ir netikrus pakopų kiekius; čia viskas
  skaičiuojama iš `PLAYERS` (96 įrašai).
- **Du maršrutai** vietoj vieno komponento su `view` būsena: `/` ir `/nustatymai`. Draft'o būsena
  gyvena `DraftProvider` layout'e, todėl perjungiant tab'us nedingsta.
- **Demo draft'as.** `lib/config.ts` → `SEED_PICKS = false` startuoja nuo tuščios lentos.
- **Tankis** (`density` prop mockup'e) fiksuotas ties `compact`.

## Kas dar nepajungta

`players.json` įkėlimas, „Atnaujinti duomenis", „Suporuoti" ir „Paleisti vertinimą" nustatymų
puslapyje yra UI be logikos — kaip ir mockup'e. Statistika `lib/analysis.ts` išvedama iš FP/G;
atsiradus tikram duomenų šaltiniui keičiama ten vienoje vietoje.
