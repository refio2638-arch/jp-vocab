"use client";

import { configureSpeak, type SpeakMode } from "@/lib/speak";
import { useVocabStore } from "@/lib/store";
import type { EnAccent } from "@/lib/types";

const OPTIONS: { value: SpeakMode; label: string }[] = [
  { value: "neural", label: "高质量神经语音" },
  { value: "system", label: "系统语音" },
];

const ACCENTS: { value: EnAccent; label: string }[] = [
  { value: "en-US", label: "美式" },
  { value: "en-GB", label: "英式" },
];

export function VoiceModeToggle() {
  const lang = useVocabStore((state) => state.lang);
  const speakEngine = useVocabStore((state) => state.speakEngine);
  const setSpeakEngine = useVocabStore((state) => state.setSpeakEngine);
  const enAccent = useVocabStore((state) => state.enAccent);
  const setEnAccent = useVocabStore((state) => state.setEnAccent);

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="sr-only">朗读音色</legend>
      <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
        <span className="text-stone-400">语音</span>
        {OPTIONS.map((option) => {
          const active = speakEngine === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                configureSpeak(option.value);
                setSpeakEngine(option.value);
              }}
              className={`min-h-9 rounded-full px-3 ${
                active ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {lang === "en" ? (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <span className="text-stone-400">口音</span>
          {ACCENTS.map((option) => {
            const active = enAccent === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setEnAccent(option.value)}
                className={`min-h-9 rounded-full px-3 ${
                  active ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
      <p className="max-w-xs text-xs leading-5 text-stone-400">
        {lang === "en"
          ? "英语默认美式（en-US），可切英式。没网或合成失败时改用系统英语。"
          : "默认奈奈实神经女声。没网或合成失败时自动改用系统日语。"}
      </p>
    </fieldset>
  );
}
