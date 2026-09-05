export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export type JlptLevel = (typeof JLPT_LEVELS)[number];

export const APP_LANGS = ["ja", "en"] as const;

export type AppLang = (typeof APP_LANGS)[number];

export const EN_LEVELS = ["CET4", "CET6", "KAOYAN"] as const;

export type EnLevel = (typeof EN_LEVELS)[number];

export const EN_LEVEL_LABELS: Record<EnLevel, string> = {
  CET4: "CET4",
  CET6: "CET6",
  KAOYAN: "考研",
};

export type EnAccent = "en-US" | "en-GB";

export type Grade = "know" | "fuzzy" | "unknown";

export type Word = {
  id: string;
  lang?: AppLang;
  kanji: string;
  kana: string;
  word?: string;
  phonetic?: string;
  romaji?: string;
  meaning: string;
  meaningEn?: string;
  meaningZh?: string;
  pos?: string;
  jlpt?: JlptLevel;
  level?: string;
  exampleJp?: string;
  exampleEn?: string;
  exampleZh?: string;
  examples?: Array<{ ja?: string; en?: string; zh?: string }>;
  notes?: string;
};

export type StudyScope = "all" | "new" | "weak";

export type Progress = {
  wordId: string;
  reps: number;
  know: number;
  fuzzy: number;
  unknown: number;
  lastGrade: Grade | null;
  lastSeenAt: number | null;
  nextWeight: number;
  sentences?: string[];
};

export type SessionStats = {
  reviewed: number;
  know: number;
  fuzzy: number;
  unknown: number;
};

export type SpeakEngine = "neural" | "system";

export type Settings = {
  autoSpeak: boolean;
  speakEngine: SpeakEngine;
};

export type ExportPayload = {
  version: 1;
  exportedAt: string;
  words: Word[];
  progress: Progress[];
};

export function wordLang(word: Word): AppLang {
  if (word.lang === "en" || word.lang === "ja") {
    return word.lang;
  }
  return word.word && !word.kana && !word.kanji ? "en" : "ja";
}

export function headText(word: Word): string {
  if (wordLang(word) === "en") {
    const english = word.word?.trim();
    if (english) {
      return english;
    }
  }
  const kanji = word.kanji.trim();
  return kanji.length > 0 ? kanji : word.kana;
}

export function hasKanji(word: Word): boolean {
  const kanji = word.kanji.trim();
  return kanji.length > 0 && kanji !== word.kana;
}

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isJlptLevel(value: string): value is JlptLevel {
  return (JLPT_LEVELS as readonly string[]).includes(value);
}

export function isAppLang(value: string): value is AppLang {
  return value === "ja" || value === "en";
}

export function isEnLevel(value: string): value is EnLevel {
  return (EN_LEVELS as readonly string[]).includes(value);
}

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "";
}

export function displayMeaning(word: Word): string {
  return firstNonEmpty(word.meaningZh, word.meaning, word.meaningEn) || "暂无释义";
}

export function displayMeaningEn(word: Word): string {
  const primary = displayMeaning(word);
  const english = firstNonEmpty(word.meaningEn, word.meaning);
  if (!english || english === primary) {
    return "";
  }
  return firstNonEmpty(word.meaningZh) ? english : "";
}

export function exampleJpOf(word: Word): string {
  return firstNonEmpty(word.exampleJp, word.examples?.[0]?.ja);
}

export function exampleEnOf(word: Word): string {
  return firstNonEmpty(word.exampleEn, word.examples?.[0]?.en);
}

export function exampleZhOf(word: Word): string {
  return firstNonEmpty(word.exampleZh, word.examples?.[0]?.zh);
}

export function displayExampleZh(word: Word): string {
  return exampleZhOf(word);
}

export function displayExampleEn(word: Word): string {
  const zh = exampleZhOf(word);
  const english = exampleEnOf(word);
  if (!english || english === zh) {
    return "";
  }
  return zh ? "" : english;
}

export function sortLevels(levels: JlptLevel[]): JlptLevel[] {
  return JLPT_LEVELS.filter((level) => levels.includes(level));
}

export function formatLevels(levels: JlptLevel[]): string {
  const sorted = sortLevels(levels);
  return sorted.length > 0 ? sorted.join("+") : "—";
}

export function sortEnLevels(levels: EnLevel[]): EnLevel[] {
  return EN_LEVELS.filter((level) => levels.includes(level));
}

export function formatEnLevels(levels: EnLevel[]): string {
  const sorted = sortEnLevels(levels);
  return sorted.length > 0 ? sorted.map((level) => EN_LEVEL_LABELS[level]).join("+") : "—";
}
