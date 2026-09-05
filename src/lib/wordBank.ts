import { importEnglishLevel, EN_LEVEL_COUNTS } from "@/data/en";
import { importJlptLevel } from "@/data/jlpt";
import { parseWordList } from "@/lib/parse";
import type { AppLang, JlptLevel, Word } from "@/lib/types";
import { wordLang } from "@/lib/types";

export { JLPT_LEVEL_COUNTS, enabledBankCount, totalBankCount } from "@/lib/jlptCounts";
export { EN_LEVEL_COUNTS };

export async function loadLevel(level: JlptLevel): Promise<Word[]> {
  const raw = await importJlptLevel(level);
  return parseWordList(raw).words.map((word) => ({ ...word, lang: "ja" as const }));
}

export async function loadEnglishLevels(): Promise<Word[]> {
  const raw = await importEnglishLevel("CET4");
  return parseWordList(raw).words.map((word) => ({
    ...word,
    lang: "en" as const,
    level: word.level || "CET4",
  }));
}

export async function getWords(lang: AppLang): Promise<Word[]> {
  if (lang === "en") {
    return loadEnglishLevels();
  }
  const levels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
  const groups = await Promise.all(levels.map((level) => loadLevel(level)));
  return groups.flat();
}

export function filterWordsByLang(words: Word[], lang: AppLang): Word[] {
  return words.filter((word) => wordLang(word) === lang);
}
