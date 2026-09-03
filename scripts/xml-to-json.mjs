#!/usr/bin/env node
/**
 * Eurolygos statistikos XML → JSON.
 *
 * Naršyklėje išsaugotas atsakymas ateina XML formatu (`<PlayersTraditionalStatsModel>`),
 * net jei failo plėtinys .json. Šis skriptas paverčia jį tokios pat formos JSON,
 * kokį grąžina API — `{ total, players: [...] }` su camelCase laukais — todėl
 * rezultatą galima paduoti tiesiai `lib/euroleague.ts` tipams ir `merge.ts`.
 *
 * Naudojimas:
 *   node scripts/xml-to-json.mjs data/players2026s.json
 *   node scripts/xml-to-json.mjs data/*.xml -o data/converted/
 *   node scripts/xml-to-json.mjs data/players2026s.json --stdout | jq .total
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/* ------------------------------ XML skaitymas ----------------------------- */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, code) => {
    if (code[0] === "#") {
      const value =
        code[1] === "x" || code[1] === "X"
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isNaN(value) ? whole : String.fromCodePoint(value);
    }
    return ENTITIES[code] ?? whole;
  });
}

/**
 * Minimalus XML parseris. Užtenka, nes Eurolygos atsakymas yra paprastas:
 * be atributų (išskyrus šaknies xmlns), be CDATA, be maišyto turinio.
 * Grąžina medį, kuriame lapas yra tekstas, o šaka — objektas.
 */
function parseXml(source) {
  // Naršyklės XML peržiūra failo pradžioje palieka savo pastabą — ji ne XML.
  const start = source.indexOf("<");
  let xml = start > 0 ? source.slice(start) : source;
  xml = xml
    .replace(/<\?[\s\S]*?\?>/g, "") // deklaracija
    .replace(/<!--[\s\S]*?-->/g, "") // komentarai
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");

  const tag = /<\s*(\/?)\s*([A-Za-z_][\w.:-]*)([^>]*?)(\/?)\s*>/g;
  const root = { children: {}, text: "" };
  const stack = [root];
  let cursor = 0;
  let match = tag.exec(xml);

  while (match) {
    const [whole, closing, name, , selfClosing] = match;
    const node = stack[stack.length - 1];
    node.text += xml.slice(cursor, match.index);
    cursor = match.index + whole.length;

    if (closing) {
      if (stack.length > 1) stack.pop();
    } else {
      const child = { children: {}, text: "" };
      node.children[name] ??= [];
      node.children[name].push(child);
      // Savaime užsidarantis elementas vaikų neturi, tad į dėklą nededamas.
      if (!selfClosing) stack.push(child);
    }
    match = tag.exec(xml);
  }

  stack[stack.length - 1].text += xml.slice(cursor);
  return root;
}

/* --------------------------- Laukų normalizavimas -------------------------- */

/** `PlayerRanking` → `playerRanking`, `PIR` → `pir`, `TvCodes` → `tvCodes`. */
function toCamel(name) {
  if (/^[A-Z0-9]+$/.test(name)) return name.toLowerCase();
  return name[0].toLowerCase() + name.slice(1);
}

/** Laukai, kurie privalo likti tekstu, kad ir kaip atrodytų. */
const STRING_FIELDS = new Set(["code", "name", "imageUrl", "tvCodes"]);

function coerce(key, raw) {
  const value = decodeEntities(raw).trim();
  if (value === "") return null;
  if (STRING_FIELDS.has(key)) return value;
  // "66.7%" lieka tekstu — taip pat, kaip grąžina API.
  if (value.endsWith("%")) return value;
  // "010035" yra kodas, ne skaičius: pradžios nulio prarasti negalima.
  if (/^0\d/.test(value)) return value;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function toValue(node, key) {
  const keys = Object.keys(node.children);
  if (keys.length === 0) return coerce(key, node.text);

  const out = {};
  for (const childName of keys) {
    const camel = toCamel(childName);
    const list = node.children[childName];
    // Pasikartojantis vaikas reiškia masyvą (pvz. <Players> viduje).
    out[camel] = list.length > 1 ? list.map((n) => toValue(n, camel)) : toValue(list[0], camel);
  }
  return out;
}

/* -------------------------------- Konversija ------------------------------- */

/** Randa šakninį modelį ir ištraukia `{ total, players }`. */
export function xmlToStats(source) {
  const root = parseXml(source);
  const rootName = Object.keys(root.children)[0];
  if (!rootName) throw new Error("Nerastas šakninis XML elementas.");

  const model = toValue(root.children[rootName][0], toCamel(rootName));
  const playersNode = model.players;

  // <Players> su vienu vaiku duoda objektą, su keliais — masyvą.
  let players = [];
  if (Array.isArray(playersNode)) players = playersNode;
  else if (playersNode && typeof playersNode === "object") {
    const inner = Object.values(playersNode);
    players = Array.isArray(inner[0]) ? inner[0] : [playersNode];
  }

  const total = typeof model.total === "number" ? model.total : players.length;
  return { rootName, total, players };
}

/* ---------------------------------- CLI ----------------------------------- */

function parseArgs(argv) {
  const files = [];
  let out = null;
  let stdout = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-o" || arg === "--out") out = argv[++i];
    else if (arg === "--stdout") stdout = true;
    else if (arg.startsWith("-")) throw new Error(`Nežinomas parametras: ${arg}`);
    else files.push(arg);
  }
  return { files, out, stdout };
}

async function main() {
  const { files, out, stdout } = parseArgs(process.argv.slice(2));

  if (files.length === 0) {
    console.error(
      "Naudojimas: node scripts/xml-to-json.mjs <failas.xml…> [-o katalogas|failas] [--stdout]",
    );
    process.exit(1);
  }

  if (out && !stdout && (files.length > 1 || !path.extname(out))) {
    await mkdir(out, { recursive: true });
  }

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const { rootName, total, players } = xmlToStats(source);
    const json = JSON.stringify({ total, players }, null, stdout ? 0 : 2);

    if (stdout) {
      process.stdout.write(`${json}\n`);
      continue;
    }

    const single = files.length === 1 && out && path.extname(out);
    const target = single
      ? out
      : path.join(out ?? path.dirname(file), `${path.basename(file, path.extname(file))}.json`);

    // Neperrašom šaltinio, jei jis jau vadinasi .json (kaip players2026s.json).
    const safe =
      path.resolve(target) === path.resolve(file)
        ? `${target.replace(/\.json$/, "")}.converted.json`
        : target;

    await writeFile(safe, `${json}\n`);
    console.log(
      `${file} → ${safe}\n  ${rootName}: ${players.length} įrašai (Total=${total})${
        players.length !== total ? "  ⚠ nesutampa su Total" : ""
      }`,
    );
  }
}

main().catch((error) => {
  console.error(`Klaida: ${error.message}`);
  process.exit(1);
});
