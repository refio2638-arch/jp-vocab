import { JLPT_LEVEL_COUNTS } from "@/data/jlpt/counts";
import type { JlptLevel } from "@/lib/types";
import { JLPT_LEVELS } from "@/lib/types";

export { JLPT_LEVEL_COUNTS };

export function totalBankCount(): number {
  return JLPT_LEVELS.reduce((sum, level) => sum + JLPT_LEVEL_COUNTS[level], 0);
}

export function enabledBankCount(levels: JlptLevel[]): number {
  return levels.reduce((sum, level) => sum + (JLPT_LEVEL_COUNTS[level] ?? 0), 0);
}
