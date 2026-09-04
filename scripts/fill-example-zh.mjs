/**
 * Fill exampleZh only. Does not touch meaningZh or other fields.
 *
 *   node scripts/fill-example-zh.mjs --level N5
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = join(ROOT, "src", "data", "jlpt");
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const GAP_MS = 350;
const SAVE_EVERY = 10;

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function looksChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function firstExample(word) {
  const examples = Array.isArray(word.examples) ? word.examples : [];
  const first = examples[0] && typeof examples[0] === "object" ? examples[0] : {};
  return first;
}

function exampleJpOf(word) {
  return text(word.exampleJp) || text(firstExample(word).ja);
}

function exampleEnOf(word) {
  return text(word.exampleEn) || text(firstExample(word).en);
}

function exampleZhOf(word) {
  return text(word.exampleZh) || text(firstExample(word).zh);
}

function parseLevelArg(argv) {
  const idx = argv.indexOf("--level");
  if (idx < 0) {
    return LEVELS;
  }
  const raw = String(argv[idx + 1] ?? "")
    .trim()
    .toUpperCase();
  if (!LEVELS.includes(raw)) {
    throw new Error(`unknown --level ${raw}`);
  }
  return [raw];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${body.slice(0, 180)}`);
    }
    return body ? JSON.parse(body) : {};
  } finally {
    clearTimeout(timer);
  }
}

let skipMyMemory = false;

async function translateMyMemory(q, langpair) {
  if (skipMyMemory) {
    throw new Error("mymemory skipped");
  }
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${langpair}`;
  const json = await fetchJson(url);
  const translated = text(json?.responseData?.translatedText);
  if (!translated || /MYMEMORY WARNING|QUERY LENGTH LIMIT|USED ALL AVAILABLE/i.test(translated)) {
    skipMyMemory = true;
    throw new Error(translated.slice(0, 80) || "mymemory quota");
  }
  if (!looksChinese(translated)) {
    throw new Error("mymemory not chinese");
  }
  return translated;
}

function saveLevel(file, words) {
  writeFileSync(file, JSON.stringify(words), "utf8");
}

async function fillLevel(level) {
  const file = join(DATA_DIR, `${level.toLowerCase()}.json`);
  if (!existsSync(file)) {
    throw new Error(`missing ${file}`);
  }
  const words = JSON.parse(readFileSync(file, "utf8"));
  let filled = 0;
  let skipped = 0;
  let failed = 0;
  let sinceSave = 0;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (looksChinese(exampleZhOf(word))) {
      skipped += 1;
      continue;
    }
    const exampleEn = exampleEnOf(word);
    const exampleJp = exampleJpOf(word);
    const q = exampleEn || exampleJp;
    if (!q) {
      skipped += 1;
      continue;
    }
    const langpair = exampleEn ? "en|zh-CN" : "ja|zh-CN";
    try {
      const zh = await translateMyMemory(q, langpair);
      word.exampleZh = zh;
      filled += 1;
      sinceSave += 1;
      console.log(`  ${level} ${filled} ${word.kanji || word.kana || word.id} → ${zh}`);
      if (sinceSave >= SAVE_EVERY) {
        saveLevel(file, words);
        sinceSave = 0;
        console.log(`  saved ${file}`);
      }
    } catch (error) {
      failed += 1;
      console.warn(`  fail ${word.id}: ${error instanceof Error ? error.message : error}`);
      if (skipMyMemory) {
        break;
      }
    }
    await sleep(GAP_MS);
  }

  if (sinceSave > 0 || filled > 0) {
    saveLevel(file, words);
  }
  console.log(`${level} filled ${filled} skipped ${skipped} failed ${failed}`);
}

const levels = parseLevelArg(process.argv.slice(2));
console.log(`fill exampleZh: ${levels.join(", ")}`);
for (const level of levels) {
  await fillLevel(level);
}
