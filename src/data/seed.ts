import n5Raw from "@/data/n5.json";
import { parseWordList } from "@/lib/parse";
import type { Word } from "@/lib/types";

const parsed = parseWordList(n5Raw);

if (parsed.words.length < 30) {
  throw new Error("内置 N5 词库不足 30 条");
}

export const N5_WORDS: Word[] = parsed.words;
