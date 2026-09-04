import { importJlptLevel } from "@/data/jlpt";
import { parseWordList } from "@/lib/parse";
import type { JlptLevel, Word } from "@/lib/types";

export { JLPT_LEVEL_COUNTS, enabledBankCount, totalBankCount } from "@/lib/jlptCounts";

export async function loadLevel(level: JlptLevel): Promise<Word[]> {
  const raw = await importJlptLevel(level);
  return parseWordList(raw).words;
}
