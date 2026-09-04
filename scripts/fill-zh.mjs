import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "src", "data", "jlpt");
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];

const SYSTEM_PROMPT =
  "你是日语学习词典编辑。把日语词的英文释义译成简洁中文词义，不要解释，不要句号堆砌，多个义项用中文分号分隔。例句译成通顺中文。只返回 JSON。";

function loadDotEnv() {
  for (const name of [".env.local", ".env"]) {
    const file = join(ROOT, name);
    if (!existsSync(file)) {
      continue;
    }
    const text = readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const DICT_PATHS = [
  join(__dirname, "raw", "ja-zh-final.json"),
  join(DATA_DIR, "ja-zh-final.json"),
];
const DICT_URLS = [
  "https://cdn.jsdelivr.net/gh/lxl66566/Japanese-Chinese-thesaurus@main/final.json",
  "https://raw.githubusercontent.com/lxl66566/Japanese-Chinese-thesaurus/main/final.json",
];

let jaZhDict = null;

function extractDictZh(value) {
  let s = String(value);
  s = s.replace(/（[^）]*）/g, "");
  s = s.replace(/\([^)]*\)/g, "");
  s = s.replace(/[⓪①②③④⑤⑥⑦⑧⑨]/g, "");
  s = s.replace(/【[^】]*】/g, "");
  s = s.replace(/\[[^\]]*\]/g, "");
  s = s.replace(/\{[^}]*\}/g, "");
  return s.replace(/^[\s,;、；:：\/]+/, "").trim();
}

function lookupKeys(word) {
  const kanji = text(word.kanji);
  const kana = text(word.kana);
  const keys = new Set();
  for (const raw of [kanji, kana]) {
    if (!raw) {
      continue;
    }
    keys.add(raw);
    keys.add(raw.replace(/\s+/g, ""));
    for (const part of raw.split(/[\/／、]/)) {
      const p = part.trim();
      if (p) {
        keys.add(p);
      }
      if (p.endsWith("する") && p.length > 2) {
        keys.add(p.slice(0, -2));
      }
    }
  }
  return [...keys];
}

async function loadJaZhDict() {
  if (jaZhDict) {
    return jaZhDict;
  }
  for (const file of DICT_PATHS) {
    if (existsSync(file)) {
      jaZhDict = JSON.parse(readFileSync(file, "utf8"));
      console.log(`← zh dict ${file} (${Object.keys(jaZhDict).length})`);
      return jaZhDict;
    }
  }
  for (const url of DICT_URLS) {
    try {
      console.log(`↓ fetch ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      jaZhDict = await res.json();
      const dest = DICT_PATHS[0];
      writeFileSync(dest, JSON.stringify(jaZhDict), "utf8");
      console.log(`← zh dict saved ${dest} (${Object.keys(jaZhDict).length})`);
      return jaZhDict;
    } catch (error) {
      console.warn(`  dict fetch failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  jaZhDict = {};
  return jaZhDict;
}

function dictMeaningZh(dict, word) {
  for (const key of lookupKeys(word)) {
    if (!dict[key]) {
      continue;
    }
    const zh = extractDictZh(dict[key]);
    if (looksChinese(zh)) {
      return zh;
    }
  }
  return "";
}

function fillFromDict(words, dict) {
  let filled = 0;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (text(word.meaningZh)) {
      continue;
    }
    const zh = dictMeaningZh(dict, word);
    if (!zh) {
      continue;
    }
    words[i] = { ...word, meaningZh: zh };
    filled += 1;
  }
  return filled;
}

function parseArgs(argv) {
  const levelIndex = argv.indexOf("--level");
  const raw = levelIndex >= 0 ? String(argv[levelIndex + 1] ?? "").toUpperCase() : "";
  if (raw && !LEVELS.includes(raw)) {
    throw new Error(`未知级别 ${raw}，可选 ${LEVELS.join(" / ")}`);
  }
  return {
    levels: raw ? [raw] : LEVELS,
    dictOnly: argv.includes("--dict-only"),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function looksChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function extractJson(raw) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("no json object");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

class RateLimiter {
  constructor(perSecond) {
    this.gap = Math.ceil(1000 / perSecond);
    this.nextAt = 0;
  }

  async wait() {
    const now = Date.now();
    const at = Math.max(now, this.nextAt);
    this.nextAt = at + this.gap;
    if (at > now) {
      await sleep(at - now);
    }
  }
}

function llmConfig() {
  if (process.env.DEEPSEEK_API_KEY) {
    return {
      name: "deepseek",
      key: process.env.DEEPSEEK_API_KEY,
      base: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      name: "openai-compatible",
      key: process.env.OPENAI_API_KEY,
      base: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

async function fetchJson(url, init, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${body.slice(0, 180)}`);
    }
    return body ? JSON.parse(body) : {};
  } finally {
    clearTimeout(timer);
  }
}

async function translateWithLlm(llm, limiter, word) {
  await limiter.wait();
  const endpoint = llm.base.endsWith("/v1")
    ? `${llm.base}/chat/completions`
    : `${llm.base}/v1/chat/completions`;
  const payload = {
    kanji: word.kanji ?? "",
    kana: word.kana ?? "",
    meaningEn: text(word.meaningEn) || text(word.meaning),
    exampleJp: text(word.exampleJp),
    exampleEn: text(word.exampleEn),
  };
  const json = await fetchJson(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${llm.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: llm.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `词：${payload.kanji || payload.kana}${payload.kanji && payload.kana ? `（${payload.kana}）` : ""}\n` +
            `英文释义：${payload.meaningEn}\n` +
            `日语例句：${payload.exampleJp}\n` +
            `英文例句：${payload.exampleEn}\n` +
            `输入：${JSON.stringify(payload)}\n` +
            `返回：{"meaningZh":"...","exampleZh":"..."}`,
        },
      ],
    }),
  });
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("empty llm content");
  }
  const parsed = extractJson(content);
  return {
    meaningZh: text(parsed.meaningZh),
    exampleZh: text(parsed.exampleZh),
  };
}

let skipMyMemory = false;
let skipLibre = false;
let skipLingva = false;

async function translateMyMemory(q, langpair, limiter) {
  if (skipMyMemory) {
    throw new Error("mymemory skipped");
  }
  await limiter.wait();
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${langpair}`;
  try {
    const json = await fetchJson(url, undefined, 12_000);
    const translated = text(json?.responseData?.translatedText);
    if (!translated || /MYMEMORY WARNING|QUERY LENGTH LIMIT|USED ALL AVAILABLE/i.test(translated)) {
      skipMyMemory = true;
      throw new Error(translated || "mymemory empty");
    }
    return translated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (/429|MYMEMORY WARNING|USED ALL AVAILABLE/i.test(msg)) {
      skipMyMemory = true;
    }
    throw error;
  }
}

async function translateLibre(q, source, limiter) {
  if (skipLibre) {
    throw new Error("libretranslate skipped");
  }
  const endpoints = [
    "https://libretranslate.de/translate",
    "https://translate.fedilab.app/translate",
    "https://lt.vern.cc/translate",
  ];
  let lastError = "libretranslate failed";
  for (const url of endpoints) {
    try {
      await limiter.wait();
      const json = await fetchJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q, source, target: "zh", format: "text" }),
      }, 8_000);
      const translated = text(json?.translatedText);
      if (translated) {
        return translated;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  skipLibre = true;
  throw new Error(lastError);
}

async function translateLingva(q, source, limiter) {
  if (skipLingva) {
    throw new Error("lingva skipped");
  }
  await limiter.wait();
  const url = `https://lingva.ml/api/v1/${source}/zh/${encodeURIComponent(q)}`;
  try {
    const json = await fetchJson(url, undefined, 8_000);
    const translated = text(json?.translation);
    if (!translated) {
      throw new Error("lingva empty");
    }
    return translated;
  } catch (error) {
    skipLingva = true;
    throw error;
  }
}

async function translateFree(q, source, limiter) {
  const errors = [];
  for (const fn of [
    () => translateMyMemory(q, `${source}|zh-CN`, limiter),
    () => translateLibre(q, source, limiter),
    () => translateLingva(q, source, limiter),
  ]) {
    try {
      const translated = await fn();
      if (translated) {
        return translated;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(errors.join(" | ") || "free translate failed");
}

async function translateOneFree(q, source, limiter) {
  if (!q) {
    return "";
  }
  const translated = await translateFree(q, source, limiter);
  return looksChinese(translated) ? translated : "";
}

async function translateWordFree(limiter, word) {
  const meaningEn = text(word.meaningEn) || text(word.meaning);
  const exampleEn = text(word.exampleEn);
  const exampleJp = text(word.exampleJp);
  let meaningZh = "";
  let exampleZh = "";
  if (!text(word.meaningZh) && meaningEn) {
    meaningZh = await translateOneFree(meaningEn, "en", limiter);
  }
  if (!text(word.exampleZh)) {
    if (exampleEn) {
      exampleZh = await translateOneFree(exampleEn, "en", limiter);
    }
    if (!exampleZh && exampleJp) {
      exampleZh = await translateOneFree(exampleJp, "ja", limiter);
    }
  }
  return { meaningZh, exampleZh };
}

const EDGE_AUTH = "https://edge.microsoft.com/translate/auth";
const EDGE_TRANSLATE = "https://api-edge.cognitive.microsofttranslator.com/translate";
const EDGE_BATCH = 25;

let edgeToken = "";
let edgeTokenExp = 0;

async function getEdgeToken() {
  if (edgeToken && Date.now() < edgeTokenExp) {
    return edgeToken;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(EDGE_AUTH, { signal: controller.signal });
    const token = text(await res.text());
    if (!res.ok || !token) {
      throw new Error(`edge auth HTTP ${res.status}`);
    }
    edgeToken = token;
    edgeTokenExp = Date.now() + 8 * 60 * 1000;
    return token;
  } finally {
    clearTimeout(timer);
  }
}

async function translateEdgeBatch(texts, from, limiter) {
  if (texts.length === 0) {
    return [];
  }
  await limiter.wait();
  const token = await getEdgeToken();
  const fromLang = from === "ja" ? "ja" : "en";
  const url = `${EDGE_TRANSLATE}?api-version=3.0&from=${fromLang}&to=zh-Hans`;
  const json = await fetchJson(
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(texts.map((item) => ({ Text: String(item).slice(0, 900) }))),
    },
    30_000,
  );
  if (!Array.isArray(json)) {
    throw new Error("edge translate: unexpected body");
  }
  return json.map((item) => text(item?.translations?.[0]?.text));
}

async function fillLevelEdge(level, words, limiter) {
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const jobs = [];
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (!needsWork(word)) {
      skipped += 1;
      continue;
    }
    jobs.push({ index: i, word });
  }

  for (let start = 0; start < jobs.length; start += EDGE_BATCH) {
    const batch = jobs.slice(start, start + EDGE_BATCH);
    const meaningSrc = batch.map(({ word }) =>
      text(word.meaningZh) ? "" : text(word.meaningEn) || text(word.meaning),
    );
    const exampleSrc = batch.map(({ word }) => {
      if (text(word.exampleZh)) {
        return { text: "", from: "en" };
      }
      if (text(word.exampleEn)) {
        return { text: text(word.exampleEn), from: "en" };
      }
      if (text(word.exampleJp)) {
        return { text: text(word.exampleJp), from: "ja" };
      }
      return { text: "", from: "en" };
    });

    const meaningNeed = meaningSrc
      .map((value, offset) => ({ offset, value }))
      .filter((item) => item.value);
    const exampleEnNeed = exampleSrc
      .map((item, offset) => ({ offset, ...item }))
      .filter((item) => item.text && item.from === "en");
    const exampleJaNeed = exampleSrc
      .map((item, offset) => ({ offset, ...item }))
      .filter((item) => item.text && item.from === "ja");

    const [meaningOut, exampleEnOut, exampleJaOut] = await Promise.all([
      meaningNeed.length
        ? translateEdgeBatch(
            meaningNeed.map((item) => item.value),
            "en",
            limiter,
          )
        : Promise.resolve([]),
      exampleEnNeed.length
        ? translateEdgeBatch(
            exampleEnNeed.map((item) => item.text),
            "en",
            limiter,
          )
        : Promise.resolve([]),
      exampleJaNeed.length
        ? translateEdgeBatch(
            exampleJaNeed.map((item) => item.text),
            "ja",
            limiter,
          )
        : Promise.resolve([]),
    ]);

    const meaningZhByOffset = new Map();
    meaningNeed.forEach((item, idx) => meaningZhByOffset.set(item.offset, meaningOut[idx] ?? ""));
    const exampleZhByOffset = new Map();
    exampleEnNeed.forEach((item, idx) => exampleZhByOffset.set(item.offset, exampleEnOut[idx] ?? ""));
    exampleJaNeed.forEach((item, idx) => {
      if (!exampleZhByOffset.get(item.offset)) {
        exampleZhByOffset.set(item.offset, exampleJaOut[idx] ?? "");
      }
    });

    for (let offset = 0; offset < batch.length; offset += 1) {
      const { index, word } = batch[offset];
      const next = applyTranslation(word, {
        meaningZh: meaningZhByOffset.get(offset) ?? "",
        exampleZh: exampleZhByOffset.get(offset) ?? "",
      });
      const filledMeaning = !text(word.meaningZh) && text(next.meaningZh);
      const filledExample = !text(word.exampleZh) && text(next.exampleZh);
      if (filledMeaning || filledExample) {
        words[index] = next;
        success += 1;
      } else if (needsWork(word)) {
        failed += 1;
      } else {
        skipped += 1;
      }
    }

    writeLevel(level, words);
    const done = Math.min(start + EDGE_BATCH, jobs.length);
    console.log(`  ${level} ${done}/${jobs.length} pending ok=${success} fail=${failed} skip=${skipped}`);
  }

  return { success, failed, skipped };
}

async function withRetry(label, fn, retries = 2) {
  let lastError = "unknown";
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < retries) {
        await sleep(600 * (attempt + 1));
      }
    }
  }
  throw new Error(`${label}: ${lastError}`);
}

function needsWork(word) {
  const missingMeaning = !text(word.meaningZh) && Boolean(text(word.meaningEn) || text(word.meaning));
  const missingExample =
    !text(word.exampleZh) && Boolean(text(word.exampleEn) || text(word.exampleJp));
  return missingMeaning || missingExample;
}

function applyTranslation(word, translated) {
  const next = { ...word };
  const meaningZh = text(translated.meaningZh);
  const exampleZh = text(translated.exampleZh);
  if (meaningZh && !text(word.meaningZh) && looksChinese(meaningZh)) {
    next.meaningZh = meaningZh;
  }
  if (exampleZh && !text(word.exampleZh) && looksChinese(exampleZh)) {
    next.exampleZh = exampleZh;
  }
  return next;
}

function writeLevel(level, words) {
  writeFileSync(join(DATA_DIR, `${level.toLowerCase()}.json`), JSON.stringify(words), "utf8");
}

async function fillLevel(level, llm, limiter, dictOnly) {
  const file = join(DATA_DIR, `${level.toLowerCase()}.json`);
  if (!existsSync(file)) {
    throw new Error(`找不到 ${file}`);
  }
  const words = JSON.parse(readFileSync(file, "utf8"));
  if (!Array.isArray(words)) {
    throw new Error(`${level} 不是数组`);
  }

  const dict = await loadJaZhDict();
  const dictFilled = fillFromDict(words, dict);
  writeLevel(level, words);
  console.log(`  ${level} dict filled ${dictFilled}`);

  const skipOnline = dictOnly || !llm;
  if (skipOnline) {
    const leftover = words.filter((word) => !text(word.meaningZh)).length;
    const withZh = words.length - leftover;
    console.log(
      `${level} done: dict ${dictFilled}, meaningZh ${withZh}/${words.length}, leftover ${leftover}`,
    );
    return { success: dictFilled, failed: leftover, skipped: words.length - dictFilled - leftover };
  }

  let success = dictFilled;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (!needsWork(word)) {
      skipped += 1;
      continue;
    }
    const label = word.id || `${level}#${i}`;
    try {
      const translated = await withRetry(label, () =>
        llm ? translateWithLlm(llm, limiter, word) : translateWordFree(limiter, word),
      );
      const next = applyTranslation(word, translated);
      const filledMeaning = !text(word.meaningZh) && text(next.meaningZh);
      const filledExample = !text(word.exampleZh) && text(next.exampleZh);
      if (filledMeaning || filledExample) {
        words[i] = next;
        success += 1;
      } else if (!text(next.meaningZh) && needsWork(word)) {
        failed += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`  ! ${label} ${msg}`);
    }
    processed += 1;
    if (processed % 10 === 0) {
      writeLevel(level, words);
      console.log(`  ${level} ${i + 1}/${words.length} ok=${success} fail=${failed} skip=${skipped}`);
    }
  }

  writeLevel(level, words);
  const withZh = words.filter((word) => text(word.meaningZh)).length;
  console.log(
    `${level} done: success ${success}, failed ${failed}, skipped ${skipped}, meaningZh ${withZh}/${words.length}`,
  );
  return { success, failed, skipped };
}

async function main() {
  loadDotEnv();
  const { levels, dictOnly } = parseArgs(process.argv.slice(2));
  const llm = llmConfig();
  const limiter = new RateLimiter(llm ? 4 : 3);
  console.log(
    llm
      ? `translate via ${llm.name} (${llm.model}), levels ${levels.join(",")}`
      : `no API key, merging Japanese-Chinese-thesaurus then keeping English fallback, levels ${levels.join(",")}`,
  );

  const totals = { success: 0, failed: 0, skipped: 0 };
  for (const level of levels) {
    const result = await fillLevel(level, llm, limiter, dictOnly);
    totals.success += result.success;
    totals.failed += result.failed;
    totals.skipped += result.skipped;
  }
  console.log(
    `all done: success ${totals.success}, failed ${totals.failed}, skipped ${totals.skipped}`,
  );
  if (totals.failed > 0 && totals.success === 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
