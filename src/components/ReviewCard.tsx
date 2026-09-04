"use client";

import { SpeakButton } from "@/components/SpeakButton";
import {
  displayExampleEn,
  displayMeaning,
  displayMeaningEn,
  exampleJpOf,
  exampleZhOf,
  hasKanji,
  headText,
  type Word,
} from "@/lib/types";

type ReviewCardProps = {
  word: Word;
  flipped: boolean;
  onFlip: () => void;
  onSpeakUnavailable?: (message: string) => void;
};

export function ReviewCard({ word, flipped, onFlip, onSpeakUnavailable }: ReviewCardProps) {
  const speakText = word.kana || word.kanji;
  const meaning = displayMeaning(word);
  const meaningEn = displayMeaningEn(word);
  const exampleJp = exampleJpOf(word);
  const exampleZh = exampleZhOf(word);
  const exampleEn = displayExampleEn(word);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
      <div className="absolute right-3 top-3 z-10">
        <SpeakButton
          text={speakText}
          label="朗读单词（R）"
          onUnavailable={onSpeakUnavailable}
        />
      </div>
      <button
        type="button"
        onClick={onFlip}
        className="flex min-h-[260px] w-full flex-col items-center justify-center px-6 py-10 text-center md:min-h-[300px]"
      >
        {!flipped ? (
          <>
            <p className="font-jp text-5xl font-medium leading-tight tracking-wide text-ink md:text-6xl">
              {headText(word)}
            </p>
            {hasKanji(word) ? (
              <p className="font-jp mt-4 text-xl text-stone-500">{word.kana}</p>
            ) : null}
            <p className="mt-10 text-sm text-stone-400">点按卡片或按空格翻面</p>
          </>
        ) : (
          <div className="w-full max-w-md space-y-4 text-left">
            <p className="font-jp text-center text-3xl font-medium text-ink">{headText(word)}</p>
            {hasKanji(word) ? (
              <p className="font-jp text-center text-lg text-stone-500">{word.kana}</p>
            ) : null}
            <p className="text-center text-2xl font-medium text-ink">{meaning}</p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-stone-500">
              {word.pos ? <span className="rounded-full bg-stone-100 px-3 py-1">{word.pos}</span> : null}
              {word.jlpt ? <span className="rounded-full bg-stone-100 px-3 py-1">{word.jlpt}</span> : null}
              {word.romaji ? (
                <span className="rounded-full bg-stone-100 px-3 py-1">{word.romaji}</span>
              ) : null}
            </div>
            {word.notes ? <p className="text-sm leading-6 text-stone-500">{word.notes}</p> : null}
          </div>
        )}
      </button>
      {flipped && meaningEn ? (
        <div className="px-5 pb-3">
          <details>
            <summary className="cursor-pointer select-none text-xs text-stone-400">英文释义</summary>
            <p className="mt-1 text-sm leading-6 text-stone-500">{meaningEn}</p>
          </details>
        </div>
      ) : null}
      {flipped && exampleJp ? (
        <div className="border-t border-line px-5 pb-5 pt-4">
          <div className="flex items-start gap-2 rounded-2xl bg-stone-50 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-jp text-base text-ink">{exampleJp}</p>
              {exampleZh ? <p className="mt-1 text-sm text-stone-500">{exampleZh}</p> : null}
              {!exampleZh && exampleEn ? (
                <p className="mt-1 text-sm text-stone-500">{exampleEn}</p>
              ) : null}
            </div>
            <SpeakButton
              text={exampleJp}
              label="朗读例句"
              size="sm"
              onUnavailable={onSpeakUnavailable}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
