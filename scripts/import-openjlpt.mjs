import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const RAW_DIR = join(__dirname, "raw");
const OUT_DIR = join(ROOT, "src", "data", "jlpt");

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const LEVEL_RANK = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };

const SOURCES = [
  {
    N5: "https://raw.githubusercontent.com/evanclan/OpenJLPT/main/data/json/vocab/n5.json",
    N4: "https://raw.githubusercontent.com/evanclan/OpenJLPT/main/data/json/vocab/n4.json",
    N3: "https://raw.githubusercontent.com/evanclan/OpenJLPT/main/data/json/vocab/n3.json",
    N2: "https://raw.githubusercontent.com/evanclan/OpenJLPT/main/data/json/vocab/n2.json",
    N1: "https://raw.githubusercontent.com/evanclan/OpenJLPT/main/data/json/vocab/n1.json",
  },
  {
    N5: "https://cdn.jsdelivr.net/gh/evanclan/OpenJLPT@main/data/json/vocab/n5.json",
    N4: "https://cdn.jsdelivr.net/gh/evanclan/OpenJLPT@main/data/json/vocab/n4.json",
    N3: "https://cdn.jsdelivr.net/gh/evanclan/OpenJLPT@main/data/json/vocab/n3.json",
    N2: "https://cdn.jsdelivr.net/gh/evanclan/OpenJLPT@main/data/json/vocab/n2.json",
    N1: "https://cdn.jsdelivr.net/gh/evanclan/OpenJLPT@main/data/json/vocab/n1.json",
  },
];

function localRawPath(level) {
  const n = level.toLowerCase();
  return join(RAW_DIR, `${n}.json`);
}

async function loadRaw(level) {
  const local = localRawPath(level);
  if (existsSync(local)) {
    console.log(`← local ${local}`);
    return JSON.parse(readFileSync(local, "utf8"));
  }

  const errors = [];
  for (const urls of SOURCES) {
    const url = urls[level];
    console.log(`↓ fetch ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      mkdirSync(RAW_DIR, { recursive: true });
      writeFileSync(local, JSON.stringify(json));
      return json;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      errors.push(`${url} (${msg})`);
    }
  }
  throw new Error(
    `${level} 下载失败。请把文件放到 scripts/raw/${level.toLowerCase()}.json 后重跑。\n` +
      errors.join("\n"),
  );
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.vocab)) {
      return value.vocab;
    }
    if (Array.isArray(value.words)) {
      return value.words;
    }
    if (Array.isArray(value.items)) {
      return value.items;
    }
    if (Array.isArray(value.data)) {
      return value.data;
    }
  }
  return [];
}

function joinMeanings(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (item && typeof item === "object") {
        return String(item.en ?? item.meaning ?? item.text ?? "").trim();
      }
      return "";
    })
    .filter(Boolean)
    .join("；");
}

function firstExample(value) {
  if (!Array.isArray(value) || value.length === 0) {
    return { ja: "", en: "" };
  }
  const first = value[0];
  if (typeof first === "string") {
    return { ja: first.trim(), en: "" };
  }
  if (first && typeof first === "object") {
    return {
      ja: String(first.ja ?? first.jp ?? first.sentence ?? first.text ?? "").trim(),
      en: String(first.en ?? first.meaning ?? first.translation ?? "").trim(),
    };
  }
  return { ja: "", en: "" };
}

function asPos(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).join(" / ");
  }
  return "";
}

function slugPart(value) {
  return String(value).replace(/\s+/g, "");
}

function mapEntry(raw, level) {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const word = String(raw.word ?? raw.kanji ?? raw.expression ?? "").trim();
  const reading = String(raw.reading ?? raw.kana ?? raw.hiragana ?? "").trim();
  if (!word && !reading) {
    return null;
  }
  const kana = reading || word;
  const kanji = !word || word === kana ? "" : word;
  const meaning = joinMeanings(raw.meanings ?? raw.meaning ?? raw.glosses ?? raw.senses);
  if (!kana || !meaning) {
    return null;
  }
  const pos = asPos(raw.pos ?? raw.partOfSpeech ?? raw.part_of_speech ?? raw.type);
  const example = firstExample(raw.examples ?? raw.example);
  return {
    id: `${level}-${slugPart(word || kana)}-${slugPart(kana)}`,
    kanji,
    kana,
    meaning,
    meaningEn: meaning,
    meaningZh: "",
    jlpt: level,
    pos: pos || undefined,
    exampleJp: example.ja || undefined,
    exampleEn: example.en || undefined,
    exampleZh: "",
  };
}

function dedupeKeepLowerLevel(all) {
  const map = new Map();
  for (const word of all) {
    const key = `${word.kanji}::${word.kana}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, word);
      continue;
    }
    if (LEVEL_RANK[word.jlpt] < LEVEL_RANK[prev.jlpt]) {
      map.set(key, word);
    }
  }
  return Array.from(map.values());
}

function writeIndex(counts) {
  writeFileSync(
    join(OUT_DIR, "counts.ts"),
    `export const JLPT_LEVEL_COUNTS = ${JSON.stringify(counts, null, 2)} as const;\n`,
    "utf8",
  );
  const lines = [
    `export const JLPT_BANK_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;`,
    `export type JlptBankLevel = (typeof JLPT_BANK_LEVELS)[number];`,
    ``,
    `export { JLPT_LEVEL_COUNTS } from "./counts";`,
    ``,
    `export async function importJlptLevel(level: JlptBankLevel) {`,
    `  switch (level) {`,
    `    case "N5":`,
    `      return (await import("./n5.json")).default;`,
    `    case "N4":`,
    `      return (await import("./n4.json")).default;`,
    `    case "N3":`,
    `      return (await import("./n3.json")).default;`,
    `    case "N2":`,
    `      return (await import("./n2.json")).default;`,
    `    case "N1":`,
    `      return (await import("./n1.json")).default;`,
    `  }`,
    `}`,
    ``,
  ];
  writeFileSync(join(OUT_DIR, "index.ts"), lines.join("\n"), "utf8");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(RAW_DIR, { recursive: true });

  const byLevel = [];
  for (const level of LEVELS) {
    const raw = await loadRaw(level);
    const mapped = asArray(raw)
      .map((item) => mapEntry(item, level))
      .filter(Boolean);
    console.log(`  ${level} mapped ${mapped.length}`);
    byLevel.push({ level, words: mapped });
  }

  const deduped = dedupeKeepLowerLevel(byLevel.flatMap((item) => item.words));
  const grouped = { N5: [], N4: [], N3: [], N2: [], N1: [] };
  for (const word of deduped) {
    grouped[word.jlpt].push(word);
  }

  const counts = {};
  for (const level of LEVELS) {
    const outFile = join(OUT_DIR, `${level.toLowerCase()}.json`);
    const existingById = new Map();
    if (existsSync(outFile)) {
      try {
        const prev = JSON.parse(readFileSync(outFile, "utf8"));
        if (Array.isArray(prev)) {
          for (const item of prev) {
            if (item && item.id) {
              existingById.set(item.id, item);
            }
          }
        }
      } catch {
        // ignore broken previous output
      }
    }
    const words = grouped[level].map((word) => {
      const prev = existingById.get(word.id);
      const meaningZh = String(prev?.meaningZh ?? word.meaningZh ?? "").trim();
      const exampleZh = String(prev?.exampleZh ?? word.exampleZh ?? "").trim();
      return {
        ...word,
        meaningZh,
        exampleZh,
      };
    });
    writeFileSync(outFile, JSON.stringify(words), "utf8");
    counts[level] = words.length;
    console.log(`→ ${level} ${words.length}`);
  }
  writeIndex(counts);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  console.log(`total ${total} (source: OpenJLPT, not an official JLPT list)`);
  if (counts.N5 < 600) {
    console.warn("warning: N5 count is under 600 — check source shape");
  }
  if (total < 8000) {
    console.warn("warning: total is under 8000 — check source shape");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
