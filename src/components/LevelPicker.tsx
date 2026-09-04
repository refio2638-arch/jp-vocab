"use client";

import { JLPT_LEVEL_COUNTS } from "@/data/jlpt/counts";
import { enabledBankCount, totalBankCount } from "@/lib/jlptCounts";
import { useVocabStore } from "@/lib/store";
import { JLPT_LEVELS, type JlptLevel } from "@/lib/types";

export function LevelPicker() {
  const enabledLevels = useVocabStore((state) => state.enabledLevels);
  const toggleLevel = useVocabStore((state) => state.toggleLevel);
  const enabledCount = enabledBankCount(enabledLevels);
  const total = totalBankCount();

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="text-base font-medium text-ink">词库级别</h2>
      <p className="mt-1 text-sm text-stone-500">
        当前启用 {enabledCount} 词 / 全部 {total} 词
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {JLPT_LEVELS.map((level: JlptLevel) => {
          const on = enabledLevels.includes(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => {
                void toggleLevel(level);
              }}
              className={`min-h-11 rounded-2xl px-3 text-sm ${
                on ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {level}
              <span className="ml-1 opacity-70">{JLPT_LEVEL_COUNTS[level]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
