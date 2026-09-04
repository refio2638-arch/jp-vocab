import type { ExportPayload, Grade, JlptLevel, Progress, Word } from "@/lib/types";
import { isJlptLevel } from "@/lib/types";
import { NEW_WORD_WEIGHT } from "@/lib/scheduler";

export type ImportResult = {
  words: Word[];
  progress: Progress[];
  skipped: number;
};

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asGrade(value: unknown): Grade | null {
  return value === "know" || value === "fuzzy" || value === "unknown" ? value : null;
}

function firstExampleEntry(record: Record<string, unknown>): Record<string, unknown> | null {
  const examples = record.examples;
  if (!Array.isArray(examples) || examples.length === 0) {
    return null;
  }
  const first = examples[0];
  return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
}

export function parseWord(raw: unknown): Word | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = asString(record.id)?.trim();
  const kana = asString(record.kana)?.trim();
  const meaning =
    asString(record.meaning)?.trim() || asString(record.meaningEn)?.trim() || asString(record.meaningZh)?.trim();
  if (!id || !kana || !meaning) {
    return null;
  }

  const jlptRaw = asOptionalString(record.jlpt);
  const jlpt: JlptLevel | undefined = jlptRaw && isJlptLevel(jlptRaw) ? jlptRaw : undefined;
  const firstEx = firstExampleEntry(record);

  return {
    id,
    kanji: asString(record.kanji)?.trim() ?? "",
    kana,
    meaning,
    meaningEn: asOptionalString(record.meaningEn) ?? asOptionalString(record.meaning),
    meaningZh: asOptionalString(record.meaningZh),
    romaji: asOptionalString(record.romaji),
    pos: asOptionalString(record.pos),
    jlpt,
    exampleJp: asOptionalString(record.exampleJp) ?? asOptionalString(firstEx?.ja),
    exampleEn: asOptionalString(record.exampleEn) ?? asOptionalString(firstEx?.en),
    exampleZh: asOptionalString(record.exampleZh) ?? asOptionalString(firstEx?.zh),
    notes: asOptionalString(record.notes),
  };
}

export function parseProgress(raw: unknown): Progress | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const wordId = asString(record.wordId)?.trim();
  if (!wordId) {
    return null;
  }

  const sentencesRaw = record.sentences;
  const sentences = Array.isArray(sentencesRaw)
    ? sentencesRaw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return {
    wordId,
    reps: Math.max(0, asNumber(record.reps, 0)),
    know: Math.max(0, asNumber(record.know, 0)),
    fuzzy: Math.max(0, asNumber(record.fuzzy, 0)),
    unknown: Math.max(0, asNumber(record.unknown, 0)),
    lastGrade: asGrade(record.lastGrade),
    lastSeenAt: typeof record.lastSeenAt === "number" ? record.lastSeenAt : null,
    nextWeight: Math.max(1, asNumber(record.nextWeight, NEW_WORD_WEIGHT)),
    sentences,
  };
}

export function parseWordList(raw: unknown): { words: Word[]; skipped: number } {
  if (!Array.isArray(raw)) {
    return { words: [], skipped: 0 };
  }
  const words: Word[] = [];
  let skipped = 0;
  for (const item of raw) {
    const word = parseWord(item);
    if (word) {
      words.push(word);
    } else {
      skipped += 1;
    }
  }
  return { words, skipped };
}

export function parseImportPayload(raw: unknown): ImportResult {
  if (Array.isArray(raw)) {
    const parsed = parseWordList(raw);
    return { words: parsed.words, progress: [], skipped: parsed.skipped };
  }

  if (!raw || typeof raw !== "object") {
    return { words: [], progress: [], skipped: 0 };
  }

  const record = raw as Record<string, unknown>;
  const wordSource = Array.isArray(record.words) ? record.words : [];
  const parsedWords = parseWordList(wordSource);

  const progressSource = Array.isArray(record.progress) ? record.progress : [];
  const progress: Progress[] = [];
  let skipped = parsedWords.skipped;
  for (const item of progressSource) {
    const entry = parseProgress(item);
    if (entry) {
      progress.push(entry);
    } else {
      skipped += 1;
    }
  }

  return { words: parsedWords.words, progress, skipped };
}

export function toExportPayload(words: Word[], progress: Record<string, Progress>): ExportPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    words,
    progress: Object.values(progress),
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function sentenceContainsWord(sentence: string, word: Word): boolean {
  const text = sentence.trim();
  if (text.length === 0) {
    return false;
  }
  const kanji = word.kanji.trim();
  if (kanji && text.includes(kanji)) {
    return true;
  }
  return text.includes(word.kana);
}

function hasChinese(value: string | undefined): boolean {
  return Boolean(value && /[\u4e00-\u9fff]/.test(value));
}

export function overlayExampleFields(stored: Word, bank: Word): Word {
  const exampleJp = bank.exampleJp || stored.exampleJp;
  const exampleEn = bank.exampleEn || stored.exampleEn;
  const exampleZh = hasChinese(bank.exampleZh) ? bank.exampleZh : stored.exampleZh;
  if (
    exampleJp === stored.exampleJp &&
    exampleEn === stored.exampleEn &&
    exampleZh === stored.exampleZh
  ) {
    return stored;
  }
  return { ...stored, exampleJp, exampleEn, exampleZh };
}

export function mergeWordsById(existing: Word[], incoming: Word[]): Word[] {
  const map = new Map(existing.map((word) => [word.id, word]));
  for (const word of incoming) {
    map.set(word.id, word);
  }
  return Array.from(map.values());
}

export function mergeProgressById(
  existing: Record<string, Progress>,
  incoming: Progress[],
): Record<string, Progress> {
  const next = { ...existing };
  for (const entry of incoming) {
    next[entry.wordId] = entry;
  }
  return next;
}

export function fillMissingWords(existing: Word[], builtIn: Word[]): Word[] {
  const map = new Map(existing.map((word) => [word.id, word]));
  for (const word of builtIn) {
    if (!map.has(word.id)) {
      map.set(word.id, word);
    }
  }
  return Array.from(map.values());
}
