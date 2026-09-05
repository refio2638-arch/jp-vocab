"use client";

import { EN_LEVEL_COUNTS } from "@/data/en";
import { useVocabStore } from "@/lib/store";
import { EN_LEVEL_LABELS, EN_LEVELS, type EnLevel } from "@/lib/types";

export function EnLevelPicker() {
  const enabledEnLevels = useVocabStore((state) => state.enabledEnLevels);
  const toggleEnLevel = useVocabStore((state) => state.toggleEnLevel);
  const enBankByLevel = useVocabStore((state) => state.enBankByLevel);
  const wordCount = useVocabStore((state) => state.words.length);

  function levelCount(level: EnLevel) {
    return enBankByLevel[level]?.length ?? EN_LEVEL_COUNTS[level];
  }

  return (
    <section>
      <h2 className="text-sm text-stone-400">英语级别</h2>
      <p className="mt-1 text-xs text-stone-400">可多选，至少保留一个。当前已加载 {wordCount} 词</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EN_LEVELS.map((level: EnLevel) => {
          const on = enabledEnLevels.includes(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => {
                void toggleEnLevel(level);
              }}
              className={`min-h-10 rounded-2xl px-3 text-sm ${
                on ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {EN_LEVEL_LABELS[level]}
              <span className="ml-1 opacity-70">{levelCount(level)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
