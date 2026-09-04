import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "scripts", "raw", "ex-out");
const DATA_DIR = join(ROOT, "src", "data", "jlpt");
const LEVELS = ["n5", "n4", "n3", "n2", "n1"];

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function looksChinese(value) {
  return /[\u4e00-\u9fff]/.test(value);
}

function loadMaps() {
  const map = new Map();
  if (!existsSync(OUT_DIR)) {
    return map;
  }
  for (const name of readdirSync(OUT_DIR)) {
    if (!name.endsWith(".json")) {
      continue;
    }
    const raw = JSON.parse(readFileSync(join(OUT_DIR, name), "utf8"));
    const entries = Array.isArray(raw)
      ? raw.map((item) => [item.id, item.exampleZh ?? item.zh ?? item])
      : Object.entries(raw);
    for (const [id, zh] of entries) {
      const t = text(zh);
      if (id && looksChinese(t)) {
        map.set(id, t);
      }
    }
  }
  return map;
}

const zhById = loadMaps();
let applied = 0;
for (const level of LEVELS) {
  const file = join(DATA_DIR, `${level}.json`);
  const words = JSON.parse(readFileSync(file, "utf8"));
  let n = 0;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (text(word.exampleZh)) {
      continue;
    }
    const zh = zhById.get(word.id);
    if (!zh) {
      continue;
    }
    words[i] = { ...word, exampleZh: zh };
    n += 1;
  }
  if (n > 0) {
    writeFileSync(file, JSON.stringify(words), "utf8");
  }
  applied += n;
  console.log(`${level.toUpperCase()} applied ${n}`);
}
console.log(`total applied ${applied} / dict ${zhById.size}`);
