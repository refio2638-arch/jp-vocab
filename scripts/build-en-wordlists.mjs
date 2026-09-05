/**
 * Convert local English word lists into src/data/en/{cet4,cet6,kaoyan}.json
 *
 * Usage:
 *   node scripts/build-en-wordlists.mjs
 *
 * Put source files here (any one per level is enough):
 *   scripts/raw/en/cet4.csv
 *   scripts/raw/en/cet6.csv
 *   scripts/raw/en/kaoyan.csv
 *   or the same names with .tsv / .json
 *
 * Required CSV header (first row). Extra columns are ignored.
 *   word,meaningZh
 *
 * Recommended CSV header:
 *   word,meaningZh,phonetic,meaningEn,exampleEn,exampleZh
 *
 * Column aliases (case-insensitive):
 *   word       = word | headword | lemma | spelling | 单词 | 词汇 | 英文
 *   meaningZh  = meaningZh | meaning | zh | translation | 中文 | 释义 | 中文释义
 *   phonetic   = phonetic | ipa | uk | us | 音标
 *   meaningEn  = meaningEn | en | definition | 英文释义
 *   exampleEn  = exampleEn | example | sentence | 例句
 *   exampleZh  = exampleZh | example_zh | sentenceZh | 例句中文
 *
 * JSON: an array of objects, or { words | vocab | items | data: [...] }
 * with the same field names / aliases.
 *
 * Rules:
 *   - meaningZh is required; rows without Chinese are skipped
 *     (pass --keep-en-only to keep them, using meaningEn and notes:"missing-zh")
 *   - same word in one level is kept once
 *   - examples are copied as-is; empty is fine; nothing is invented
 *   - id = en-{cet4|cet6|kaoyan}-{lowercase word, non-letters stripped}
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "scripts", "raw", "en");
const OUT_DIR = join(ROOT, "src", "data", "en");

const LEVELS = [
  { level: "CET4", prefix: "cet4", stems: ["cet4", "cet-4", "四级"] },
  { level: "CET6", prefix: "cet6", stems: ["cet6", "cet-6", "六级"] },
  { level: "KAOYAN", prefix: "kaoyan", stems: ["kaoyan", "ky", "postgraduate", "考研"] },
];

const FIELD_ALIASES = {
  word: ["word", "headword", "lemma", "spelling", "单词", "词汇", "英文", "english"],
  meaningZh: ["meaningzh", "meaning", "zh", "translation", "中文", "释义", "中文释义", "meaning_zh", "cn"],
  phonetic: ["phonetic", "ipa", "uk", "us", "音标", "phonetics"],
  meaningEn: ["meaningen", "en", "definition", "英文释义", "meaning_en", "englishmeaning"],
  exampleEn: ["exampleen", "example", "sentence", "例句", "example_en", "sentenceen"],
  exampleZh: ["examplezh", "example_zh", "sentencezh", "例句中文", "sentence_zh"],
};

const keepEnOnly = process.argv.includes("--keep-en-only");
const syncCountsOnly = process.argv.includes("--sync-counts");

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]/g, "");
}

function pickField(record, field) {
  const aliases = FIELD_ALIASES[field];
  for (const [key, value] of Object.entries(record)) {
    if (aliases.includes(normalizeKey(key))) {
      const text = String(value ?? "").trim();
      if (text) {
        return text;
      }
    }
  }
  return "";
}

function hasChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function slugWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let inQuotes = false;
  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    if (row.length > 1 || (row.length === 1 && row[0].trim())) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === "," || ch === "\t") {
      pushCell();
      continue;
    }
    if (ch === "\n") {
      pushCell();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    cell += ch;
  }
  pushCell();
  pushRow();
  return rows;
}

function rowsToRecords(rows) {
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0].map((item) => item.trim());
  return rows.slice(1).map((cols) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cols[index] ?? "";
    });
    return record;
  });
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
  const exts = [".csv", ".tsv", ".json"];
  for (const stem of stems) {
    for (const ext of exts) {
      const exact = files.find((name) => name.toLowerCase() === `${stem}${ext}`);
      if (exact) {
        return join(RAW_DIR, exact);
      }
    }
  }
  return files.find((name) => {
    const lower = name.toLowerCase();
    return stems.some((stem) => lower.startsWith(stem) && exts.some((ext) => lower.endsWith(ext)));
  })
    ? join(
        RAW_DIR,
        files.find((name) => {
          const lower = name.toLowerCase();
          return stems.some((stem) => lower.startsWith(stem) && exts.some((ext) => lower.endsWith(ext)));
        }),
      )
    : null;
}

function loadRecords(filePath) {
  const text = readFileSync(filePath, "utf8");
  if (filePath.toLowerCase().endsWith(".json")) {
    return asRecordList(JSON.parse(text));
  }
  return rowsToRecords(parseCsv(text));
}

function convertLevel(level, prefix, records) {
  const seen = new Set();
  const words = [];
  let skippedNoWord = 0;
  let skippedNoZh = 0;
  let skippedDup = 0;
  let keptEnOnly = 0;

  for (const record of records) {
    const word = pickField(record, "word");
    if (!word) {
      skippedNoWord += 1;
      continue;
    }
    const slug = slugWord(word);
    if (!slug) {
      skippedNoWord += 1;
      continue;
    }
    if (seen.has(slug)) {
      skippedDup += 1;
      continue;
    }

    const meaningZhRaw = pickField(record, "meaningZh");
    const meaningEn = pickField(record, "meaningEn");
    let meaningZh = meaningZhRaw;
    let notes;
    if (!hasChinese(meaningZh)) {
      if (keepEnOnly && meaningEn) {
        meaningZh = meaningEn;
        notes = "missing-zh";
        keptEnOnly += 1;
      } else {
        skippedNoZh += 1;
        continue;
      }
    }

    seen.add(slug);
    const item = {
      id: `en-${prefix}-${slug}`,
      lang: "en",
      word,
      meaningZh,
      level,
    };
    const phonetic = pickField(record, "phonetic");
    const exampleEn = pickField(record, "exampleEn");
    const exampleZh = pickField(record, "exampleZh");
    if (phonetic) {
      item.phonetic = phonetic;
    }
    if (meaningEn) {
      item.meaningEn = meaningEn;
    }
    if (exampleEn) {
      item.exampleEn = exampleEn;
    }
    if (exampleZh) {
      item.exampleZh = exampleZh;
    }
    if (notes) {
      item.notes = notes;
    }
    words.push(item);
  }

  return { words, skippedNoWord, skippedNoZh, skippedDup, keptEnOnly };
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
未找到 scripts/raw/en/ 下的原始词表，现有小词库不会被覆盖。

请下载带中文释义的完整表，放到：
  scripts/raw/en/cet4.csv
  scripts/raw/en/cet6.csv
  scripts/raw/en/kaoyan.csv
（.tsv / .json 也可以）

CSV 第一行必须是表头，至少包含：
  word,meaningZh

推荐表头：
  word,meaningZh,phonetic,meaningEn,exampleEn,exampleZh

示例：
  word,meaningZh,phonetic,meaningEn,exampleEn,exampleZh
  abandon,放弃；抛弃,/əˈbændən/,to give up completely,,

没有例句就留空，不要填假句子。然后运行：
  npm run import:en
`);
}

const counts = { CET4: 0, CET6: 0, KAOYAN: 0 };
let converted = 0;

mkdirSync(OUT_DIR, { recursive: true });

for (const item of LEVELS) {
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
      `  (跳过无词 ${result.skippedNoWord}，无中文 ${result.skippedNoZh}，重复 ${result.skippedDup}` +
      `${result.keptEnOnly ? `，仅英文 ${result.keptEnOnly}` : ""})`,
  );
}

function readExistingCounts() {
  for (const item of LEVELS) {
    if (counts[item.level] > 0) {
      continue;
    }
    const existing = join(OUT_DIR, `${item.prefix}.json`);
    if (existsSync(existing)) {
      counts[item.level] = asRecordList(JSON.parse(readFileSync(existing, "utf8"))).length;
    }
  }
}

if (converted === 0) {
  if (syncCountsOnly) {
    readExistingCounts();
    writeCounts(counts);
    console.log(`已同步 src/data/en/counts.ts → CET4 ${counts.CET4} / CET6 ${counts.CET6} / 考研 ${counts.KAOYAN}`);
    process.exit(0);
  }
  printHelp();
  process.exit(1);
}

readExistingCounts();
writeCounts(counts);
console.log(`已更新 src/data/en/counts.ts → CET4 ${counts.CET4} / CET6 ${counts.CET6} / 考研 ${counts.KAOYAN}`);
