import { importEnglishLevel, EN_LEVEL_COUNTS } from "@/data/en";
import { importJlptLevel } from "@/data/jlpt";
import { parseWordList } from "@/lib/parse";
import type { AppLang, EnLevel, JlptLevel, Word } from "@/lib/types";
import { EN_LEVELS, isEnLevel, sortEnLevels, wordLang } from "@/lib/types";

export { JLPT_LEVEL_COUNTS, enabledBankCount, totalBankCount } from "@/lib/jlptCounts";
export { EN_LEVEL_COUNTS };

export async function loadLevel(level: JlptLevel): Promise<Word[]> {
  const raw = await importJlptLevel(level);
  return parseWordList(raw).words.map((word) => ({ ...word, lang: "ja" as const }));
}

export async function loadEnglishWords(levels: EnLevel[]): Promise<Word[]> {
  const wanted = sortEnLevels(levels.length > 0 ? levels : ["CET4"]);
  const groups = await Promise.all(
    wanted.map(async (level) => {
      const raw = await importEnglishLevel(level);
      return parseWordList(raw).words.map((word) => ({
        ...word,
        lang: "en" as const,
        level: isEnLevel(word.level ?? "") ? word.level : level,
      }));
    }),
  );
  return groups.flat();
}

export async function loadEnglishLevels(): Promise<Word[]> {
  return loadEnglishWords(["CET4"]);
}

export async function getWords(lang: AppLang): Promise<Word[]> {
  if (lang === "en") {
    return loadEnglishWords([...EN_LEVELS]);
  }
  const levels: JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
  const groups = await Promise.all(levels.map((level) => loadLevel(level)));
  return groups.flat();
}

export function filterWordsByLang(words: Word[], lang: AppLang): Word[] {
  return words.filter((word) => wordLang(word) === lang);
}
