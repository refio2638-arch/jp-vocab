"use client";

import type { StudyScope } from "@/lib/types";
import { useVocabStore } from "@/lib/store";

const OPTIONS: { value: StudyScope; label: string }[] = [
  { value: "all", label: "全部已选级别" },
  { value: "new", label: "仅生词" },
  { value: "weak", label: "仅弱词" },
];

export function StudyScopeSelect() {
  const studyScope = useVocabStore((state) => state.studyScope);
  const setStudyScope = useVocabStore((state) => state.setStudyScope);

  return (
    <label className="flex flex-col gap-1 text-sm text-stone-500">
      学习范围
      <select
        value={studyScope}
        onChange={(event) => setStudyScope(event.target.value as StudyScope)}
        className="min-h-11 rounded-2xl border border-line bg-card px-3 text-ink"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
