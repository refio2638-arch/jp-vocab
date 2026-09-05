"use client";

import { useVocabStore } from "@/lib/store";
import type { AppLang } from "@/lib/types";

const OPTIONS: { value: AppLang; label: string }[] = [
  { value: "ja", label: "日语" },
  { value: "en", label: "英语" },
];

export function LangToggle() {
  const lang = useVocabStore((state) => state.lang);
  const setLang = useVocabStore((state) => state.setLang);

  return (
    <div className="flex rounded-full bg-stone-100 p-0.5 text-sm">
      {OPTIONS.map((option) => {
        const active = lang === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              void setLang(option.value);
            }}
            className={`min-h-8 rounded-full px-3 ${
              active ? "bg-stone-800 text-white" : "text-stone-500 hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
