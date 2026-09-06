/**
 * Convert local English word lists into src/data/en/{cet4,cet6,kaoyan}.json
 *
 * Usage:
 *   npm run import:en
 *
 * Inputs:
 *   scripts/raw/en/cet4.json   KyleBing: { word, translations: [{ translation, type }] }
 *   scripts/raw/en/cet6.txt    word<TAB>中文释义
 *   scripts/raw/en/kaoyan.txt  word<TAB>中文释义
 *
 * meaningZh is built from translations (type + translation) or the txt second column.
 * Empty lines are skipped. Same word in one level is kept once.
 *   node scripts/build-en-wordlists.mjs --only=cet4
 *
 * id = en-{cet4|cet6|kaoyan}-{lowercase word, non-letters/digits stripped}
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "scripts", "raw", "en");
const OUT_DIR = join(ROOT, "src", "data", "en");

const LEVELS = [
  { level: "CET4", prefix: "cet4", stems: ["cet4", "cet-4"] },
  { level: "CET6", prefix: "cet6", stems: ["cet6", "cet-6"] },
  { level: "KAOYAN", prefix: "kaoyan", stems: ["kaoyan"] },
];

function hasChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function slugWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function meaningFromTranslations(translations) {
  if (!Array.isArray(translations)) {
    return "";
  }
  const parts = [];
  for (const item of translations) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const text = String(item.translation ?? "").trim().replace(/[；;]+$/g, "");
    if (!text) {
      continue;
    }
    const type = String(item.type ?? "").trim();
    parts.push(type ? `${type}. ${text}` : text);
  }
  return parts.join("；");
}

function meaningFromRecord(record) {
  const direct = String(record.meaningZh ?? "").trim();
  if (direct) {
    return direct;
  }
  return meaningFromTranslations(record.translations);
}

function asRecordList(raw) {
  if (Array.isArray(raw)) {
    return raw.filter((item) => item && typeof item === "object");
  }
  if (raw && typeof raw === "object") {
    for (const key of ["words", "vocab", "items", "data"]) {
      if (Array.isArray(raw[key])) {
        return raw[key].filter((item) => item && typeof item === "object");
      }
    }
  }
  return [];
}

function findSourceFile(stems) {
  if (!existsSync(RAW_DIR)) {
    return null;
  }
  const files = readdirSync(RAW_DIR);
  const exts = [".json", ".txt", ".tsv", ".csv"];
  for (const stem of stems) {
    for (const ext of exts) {
      const exact = files.find((name) => name.toLowerCase() === `${stem}${ext}`);
      if (exact) {
        return join(RAW_DIR, exact);
      }
    }
  }
  return null;
}

function loadTxtRecords(text) {
  const records = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }
    const tab = line.indexOf("\t");
    if (tab === -1) {
      continue;
    }
    const word = line.slice(0, tab).trim();
    const meaningZh = line.slice(tab + 1).trim();
    if (!word || !meaningZh) {
      continue;
    }
    records.push({ word, meaningZh });
  }
  return records;
}

function loadRecords(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (filePath.toLowerCase().endsWith(".json")) {
    return asRecordList(JSON.parse(text));
  }
  return loadTxtRecords(text);
}

function convertLevel(level, prefix, records) {
  const seen = new Set();
  const words = [];
  let skippedNoWord = 0;
  let skippedNoZh = 0;
  let skippedDup = 0;

  for (const record of records) {
    const word = String(record.word ?? "").trim();
    const slug = slugWord(word);
    if (!slug) {
      skippedNoWord += 1;
      continue;
    }
    if (seen.has(slug)) {
      skippedDup += 1;
      continue;
    }
    const meaningZh = meaningFromRecord(record);
    if (!hasChinese(meaningZh)) {
      skippedNoZh += 1;
      continue;
    }

    seen.add(slug);
    words.push({
      id: `en-${prefix}-${slug}`,
      lang: "en",
      word,
      meaningZh,
      level,
    });
  }

  return { words, skippedNoWord, skippedNoZh, skippedDup };
}

function writeCounts(counts) {
  const lines = [
    "export const EN_LEVEL_COUNTS = {",
    `  CET4: ${counts.CET4},`,
    `  CET6: ${counts.CET6},`,
    `  KAOYAN: ${counts.KAOYAN},`,
    "} as const;",
    "",
  ];
  writeFileSync(join(OUT_DIR, "counts.ts"), lines.join("\n"));
}

function printHelp() {
  console.log(`
未找到 scripts/raw/en/ 下的词表。请放入：
  scripts/raw/en/cet4.txt
  scripts/raw/en/cet6.txt
  scripts/raw/en/kaoyan.txt

每行格式：word<TAB>中文释义（可含词性）
空行跳过。然后运行 npm run import:en
`);
}

const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
const onlyPrefix = onlyArg ? onlyArg.slice("--only=".length).toLowerCase() : "";

const counts = { CET4: 0, CET6: 0, KAOYAN: 0 };
let converted = 0;

mkdirSync(OUT_DIR, { recursive: true });

for (const item of LEVELS) {
  if (onlyPrefix && item.prefix !== onlyPrefix) {
    continue;
  }
  const source = findSourceFile(item.stems);
  if (!source) {
    continue;
  }
  const records = loadRecords(source);
  const result = convertLevel(item.level, item.prefix, records);
  writeFileSync(join(OUT_DIR, `${item.prefix}.json`), `${JSON.stringify(result.words)}\n`);
  counts[item.level] = result.words.length;
  converted += 1;
  console.log(
    `${item.level}: ${result.words.length} 词 ← ${source}` +
      `  (跳过无词 ${result.skippedNoWord}，无中文 ${result.skippedNoZh}，重复 ${result.skippedDup})`,
  );
}

if (converted === 0) {
  printHelp();
  process.exit(1);
}

for (const item of LEVELS) {
  if (counts[item.level] > 0) {
    continue;
  }
  const existing = join(OUT_DIR, `${item.prefix}.json`);
  if (existsSync(existing)) {
    const list = JSON.parse(readFileSync(existing, "utf8"));
    counts[item.level] = Array.isArray(list) ? list.length : 0;
  }
}

writeCounts(counts);
console.log(`已更新 src/data/en/counts.ts → CET4 ${counts.CET4} / CET6 ${counts.CET6} / 考研 ${counts.KAOYAN}`);

for (const item of LEVELS) {
  const out = join(OUT_DIR, `${item.prefix}.json`);
  const list = JSON.parse(readFileSync(out, "utf8"));
  console.log(`${item.prefix}.json length ${Array.isArray(list) ? list.length : "NOT_ARRAY"}`);
}
