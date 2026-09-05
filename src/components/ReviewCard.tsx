"use client";

import { SpeakButton } from "@/components/SpeakButton";
import {
  displayExampleEn,
  displayMeaning,
  displayMeaningEn,
  exampleEnOf,
  exampleJpOf,
  exampleZhOf,
  hasKanji,
  headText,
  wordLang,
  type Word,
} from "@/lib/types";

type ReviewCardProps = {
  word: Word;
  flipped: boolean;
  onFlip: () => void;
  onSpeakUnavailable?: (message: string) => void;
};

export function ReviewCard({ word, flipped, onFlip, onSpeakUnavailable }: ReviewCardProps) {
  const lang = wordLang(word);
  const isEn = lang === "en";
  const speakText = isEn ? headText(word) : word.kana || word.kanji;
  const meaning = displayMeaning(word);
  const meaningEn = isEn ? "" : displayMeaningEn(word);
  const exampleJp = exampleJpOf(word);
  const exampleEnFull = exampleEnOf(word);
  const exampleZh = exampleZhOf(word);
  const exampleEnFallback = displayExampleEn(word);
  const exampleSpeak = isEn ? exampleEnFull : exampleJp;
  const phonetic = word.phonetic?.trim();

  return (
    <div className="relative w-full max-w-lg">
      <div className="absolute right-0 top-0 z-10 sm:right-2">
        <SpeakButton
          text={speakText}
          lang={lang}
          label="朗读单词（R）"
          onUnavailable={onSpeakUnavailable}
        />
      </div>
      <button
        type="button"
        onClick={onFlip}
        className="flex w-full flex-col items-center justify-center px-10 py-6 text-center"
      >
        {!flipped ? (
          <>
            <p
              className={`${isEn ? "" : "font-jp"} text-5xl font-medium leading-tight tracking-wide text-ink md:text-6xl`}
            >
              {headText(word)}
            </p>
            {isEn && phonetic ? <p className="mt-4 text-lg text-stone-400">{phonetic}</p> : null}
            {!isEn && hasKanji(word) ? (
              <p className="font-jp mt-4 text-lg text-stone-400">{word.kana}</p>
            ) : null}
            <p className="mt-8 text-sm text-stone-400/70">点按或空格翻面</p>
          </>
        ) : (
          <div className="w-full max-w-md space-y-3">
            <p className={`${isEn ? "" : "font-jp"} text-5xl font-medium leading-tight text-ink md:text-6xl`}>
              {headText(word)}
            </p>
            {isEn && phonetic ? <p className="text-lg text-stone-400">{phonetic}</p> : null}
            {!isEn && hasKanji(word) ? (
              <p className="font-jp text-lg text-stone-400">{word.kana}</p>
            ) : null}
            <p className="pt-2 text-2xl font-medium text-ink">{meaning}</p>
            {isEn && word.meaningEn ? <p className="text-sm text-stone-400">{word.meaningEn}</p> : null}
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-stone-400">
              {word.pos ? <span>{word.pos}</span> : null}
              {word.jlpt ? <span>{word.jlpt}</span> : null}
              {word.level ? <span>{word.level}</span> : null}
              {word.romaji ? <span>{word.romaji}</span> : null}
            </div>
            {word.notes ? <p className="text-sm leading-6 text-stone-400">{word.notes}</p> : null}
          </div>
        )}
      </button>
      {flipped && meaningEn ? (
        <details className="mt-1 text-center">
          <summary className="cursor-pointer select-none text-xs text-stone-400/80">英文释义</summary>
          <p className="mt-1 text-sm leading-6 text-stone-400">{meaningEn}</p>
        </details>
      ) : null}
      {flipped && isEn && exampleEnFull ? (
        <div className="mt-6 flex items-start justify-center gap-2 px-2">
          <div className="min-w-0 text-center">
            <p className="text-base text-ink">{exampleEnFull}</p>
            {exampleZh ? <p className="mt-1 text-sm text-stone-400">{exampleZh}</p> : null}
          </div>
          <SpeakButton
            text={exampleSpeak}
            lang={lang}
            label="朗读例句"
            size="sm"
            onUnavailable={onSpeakUnavailable}
          />
        </div>
      ) : null}
      {flipped && !isEn && exampleJp ? (
        <div className="mt-6 flex items-start justify-center gap-2 px-2">
          <div className="min-w-0 text-center">
            <p className="font-jp text-base text-ink">{exampleJp}</p>
            {exampleZh ? <p className="mt-1 text-sm text-stone-400">{exampleZh}</p> : null}
            {!exampleZh && exampleEnFallback ? (
              <p className="mt-1 text-sm text-stone-400">{exampleEnFallback}</p>
            ) : null}
          </div>
          <SpeakButton
            text={exampleJp}
            lang="ja"
            label="朗读例句"
            size="sm"
            onUnavailable={onSpeakUnavailable}
          />
        </div>
      ) : null}
    </div>
  );
}
