"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GradeButtons } from "@/components/GradeButtons";
import { ReviewCard } from "@/components/ReviewCard";
import { SentenceBox } from "@/components/SentenceBox";
import { VoiceModeToggle } from "@/components/VoiceModeToggle";
import { speakJa } from "@/lib/speak";
import { getSpeechStatus } from "@/lib/speech";
import { useVocabStore } from "@/lib/store";
import { exampleJpOf, formatLevels, type Grade, type Word } from "@/lib/types";

export default function ReviewPage() {
  const words = useVocabStore((state) => state.words);
  const progress = useVocabStore((state) => state.progress);
  const session = useVocabStore((state) => state.session);
  const autoSpeak = useVocabStore((state) => state.autoSpeak);
  const setAutoSpeak = useVocabStore((state) => state.setAutoSpeak);
  const applyGrade = useVocabStore((state) => state.applyGrade);
  const addSentence = useVocabStore((state) => state.addSentence);
  const pickNext = useVocabStore((state) => state.pickNext);
  const enabledLevels = useVocabStore((state) => state.enabledLevels);
  const studyScope = useVocabStore((state) => state.studyScope);

  const [word, setWord] = useState<Word | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(
    () => getSpeechStatus().message,
  );

  const speakText = word ? word.kana || word.kanji : "";
  const exampleText = word ? exampleJpOf(word) : "";

  const speakPhrase = useCallback((text: string) => {
    if (!text) {
      return;
    }
    void speakJa(text).catch(() => {
      const status = getSpeechStatus();
      if (status.message) {
        setSpeechHint(status.message);
      }
    });
  }, []);

  const speakCurrent = useCallback(() => {
    speakPhrase(speakText);
  }, [speakPhrase, speakText]);

  const speakExample = useCallback(() => {
    speakPhrase(exampleText);
  }, [exampleText, speakPhrase]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("word")?.trim();
    if (q) {
      const found = words.find(
        (item) => item.kanji === q || item.kana === q || item.id === q,
      );
      if (found) {
        setWord(found);
        return;
      }
    }
    setWord((current) => pickNext(current?.id ?? null));
  }, [enabledLevels, pickNext, studyScope, words]);

  useEffect(() => {
    if (!word || !autoSpeak) {
      return;
    }
    void speakJa(word.kana || word.kanji);
  }, [autoSpeak, word]);

  const revealBack = useCallback(() => {
    if (!flipped && autoSpeak && exampleText) {
      void speakJa(exampleText);
    }
    setFlipped(true);
  }, [autoSpeak, exampleText, flipped]);

  function handleCardFlip() {
    if (flipped) {
      setFlipped(false);
      return;
    }
    revealBack();
  }

  const grade = useCallback(
    (value: Grade) => {
      if (!word) {
        return;
      }
      applyGrade(word.id, value);
      const next = pickNext(word.id);
      setWord(next);
      setFlipped(false);
    },
    [applyGrade, pickNext, word],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        revealBack();
        return;
      }
      if ((event.key === "e" || event.key === "E") && exampleText) {
        event.preventDefault();
        speakExample();
        return;
      }
      if (event.key === "1") {
        grade("know");
        return;
      }
      if (event.key === "2") {
        grade("fuzzy");
        return;
      }
      if (event.key === "3") {
        grade("unknown");
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        speakCurrent();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exampleText, grade, revealBack, speakCurrent, speakExample]);

  const knowRate = useMemo(() => {
    if (session.reviewed === 0) {
      return 0;
    }
    return Math.round((session.know / session.reviewed) * 100);
  }, [session]);

  const savedCount = word ? (progress[word.id]?.sentences?.length ?? 0) : 0;

  const emptyHint =
    studyScope === "new"
      ? "这个范围内没有生词了。可以改成「全部已选级别」。"
      : studyScope === "weak"
        ? "还没有弱词。先刷一轮，或改成「全部已选级别」。"
        : "当前级别没有可复习的词。";

  if (words.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
        <p className="text-lg text-ink">当前级别没有词</p>
        <p className="mt-2 text-sm text-stone-500">回去勾选级别，或到词库加词。</p>
        <Link href="/" className="mt-6 rounded-2xl bg-stone-800 px-5 py-3 text-white">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm text-stone-500 hover:text-ink">
          返回首页
        </Link>
        <div className="flex items-center gap-3 text-sm tabular-nums text-stone-600">
          <span className="font-medium text-ink">{formatLevels(enabledLevels)}</span>
          <span>本次 {session.reviewed}</span>
          <span>认识率 {session.reviewed === 0 ? "—" : `${knowRate}%`}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-10">
        <div className="mb-3 flex flex-col items-end gap-2">
          <label className="flex min-h-10 items-center gap-2 text-sm text-stone-500">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(event) => setAutoSpeak(event.target.checked)}
              className="h-4 w-4"
            />
            进入卡片时朗读
          </label>
          <VoiceModeToggle />
        </div>

        {speechHint ? (
          <p className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{speechHint}</p>
        ) : null}

        {word ? (
          <>
            <ReviewCard
              word={word}
              flipped={flipped}
              onFlip={handleCardFlip}
              onSpeakUnavailable={setSpeechHint}
            />
            {flipped ? (
              <div className="mt-4">
                <SentenceBox
                  word={word}
                  savedCount={savedCount}
                  onSave={(sentence) => addSentence(word.id, sentence)}
                />
              </div>
            ) : null}
            <div className="mt-5">
              <GradeButtons onGrade={grade} />
            </div>
          </>
        ) : (
          <p className="rounded-3xl border border-line bg-card px-5 py-16 text-center text-stone-500">
            {emptyHint}
          </p>
        )}
      </main>
    </div>
  );
}
