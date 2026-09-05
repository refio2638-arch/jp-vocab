"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GradeButtons } from "@/components/GradeButtons";
import { ReviewCard } from "@/components/ReviewCard";
import { ReviewSettings } from "@/components/ReviewSettings";
import { SentenceBox } from "@/components/SentenceBox";
import { speak } from "@/lib/speak";
import { getSpeechStatus } from "@/lib/speech";
import { useVocabStore } from "@/lib/store";
import { exampleEnOf, exampleJpOf, formatEnLevels, formatLevels, headText, wordLang, type Grade, type Word } from "@/lib/types";

export default function ReviewPage() {
  const words = useVocabStore((state) => state.words);
  const progress = useVocabStore((state) => state.progress);
  const session = useVocabStore((state) => state.session);
  const autoSpeak = useVocabStore((state) => state.autoSpeak);
  const applyGrade = useVocabStore((state) => state.applyGrade);
  const addSentence = useVocabStore((state) => state.addSentence);
  const pickNext = useVocabStore((state) => state.pickNext);
  const enabledLevels = useVocabStore((state) => state.enabledLevels);
  const enabledEnLevels = useVocabStore((state) => state.enabledEnLevels);
  const studyScope = useVocabStore((state) => state.studyScope);
  const lang = useVocabStore((state) => state.lang);

  const [word, setWord] = useState<Word | null>(() => useVocabStore.getState().pickNext(null));
  const [flipped, setFlipped] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<Grade | null>(null);
  const [gradeLocked, setGradeLocked] = useState(false);
  const gradeLockTimer = useRef<number | null>(null);
  const [speechHint, setSpeechHint] = useState<string | null>(
    () => getSpeechStatus().message,
  );

  const speakLang = word ? wordLang(word) : lang;
  const speakText = word ? (speakLang === "en" ? headText(word) : word.kana || word.kanji) : "";
  const exampleText = word
    ? speakLang === "en"
      ? exampleEnOf(word)
      : exampleJpOf(word)
    : "";

  const speakPhrase = useCallback(
    (text: string) => {
      if (!text) {
        return;
      }
      void speak(text, speakLang).catch(() => {
        const status = getSpeechStatus();
        if (status.message) {
          setSpeechHint(status.message);
        }
      });
    },
    [speakLang],
  );

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
        (item) =>
          item.kanji === q || item.kana === q || item.word === q || item.id === q || headText(item) === q,
      );
      if (found) {
        setWord(found);
        return;
      }
    }
    setFlipped(false);
    setPendingGrade(null);
    setWord((current) => pickNext(current?.id ?? null));
  }, [enabledEnLevels, enabledLevels, lang, pickNext, studyScope, words]);

  useEffect(() => {
    if (!word || !autoSpeak) {
      return;
    }
    const nextLang = wordLang(word);
    void speak(nextLang === "en" ? headText(word) : word.kana || word.kanji, nextLang);
  }, [autoSpeak, word]);

  const revealBack = useCallback(() => {
    if (!flipped && autoSpeak && exampleText) {
      void speak(exampleText, speakLang);
    }
    setFlipped(true);
  }, [autoSpeak, exampleText, flipped, speakLang]);

  function handleCardFlip() {
    if (flipped) {
      setFlipped(false);
      setPendingGrade(null);
      return;
    }
    revealBack();
  }

  const lockGradesBriefly = useCallback(() => {
    if (gradeLockTimer.current !== null) {
      window.clearTimeout(gradeLockTimer.current);
    }
    setGradeLocked(true);
    gradeLockTimer.current = window.setTimeout(() => {
      setGradeLocked(false);
      gradeLockTimer.current = null;
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (gradeLockTimer.current !== null) {
        window.clearTimeout(gradeLockTimer.current);
      }
    };
  }, []);

  const commitGrade = useCallback(
    (value: Grade) => {
      if (!word) {
        return;
      }
      applyGrade(word.id, value);
      setPendingGrade(null);
      setFlipped(false);
      setWord(pickNext(word.id));
    },
    [applyGrade, pickNext, word],
  );

  const grade = useCallback(
    (value: Grade) => {
      if (!word || gradeLocked) {
        return;
      }
      if (value === "know" && !flipped) {
        commitGrade("know");
        return;
      }
      if ((value === "fuzzy" || value === "unknown") && !flipped) {
        setPendingGrade(value);
        revealBack();
        lockGradesBriefly();
        return;
      }
      commitGrade(value);
    },
    [commitGrade, flipped, gradeLocked, lockGradesBriefly, revealBack, word],
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
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="mx-auto flex w-full max-w-lg shrink-0 items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm text-stone-400 hover:text-ink">
          返回首页
        </Link>
        <ReviewSettings />
      </header>
      <p className="mx-auto w-full max-w-lg shrink-0 px-4 text-center text-xs tabular-nums text-stone-400">
        {lang === "en" ? formatEnLevels(enabledEnLevels) : formatLevels(enabledLevels)}
        {` · 本次 ${session.reviewed} · 认识率 ${session.reviewed === 0 ? "—" : `${knowRate}%`}`}
      </p>

      <main className="flex flex-1 flex-col items-center justify-center px-4">
        {speechHint ? <p className="mb-4 text-center text-sm text-amber-800">{speechHint}</p> : null}

        {word ? (
          <>
            <ReviewCard
              word={word}
              flipped={flipped}
              onFlip={handleCardFlip}
              onSpeakUnavailable={setSpeechHint}
            />
            {flipped ? (
              <div className="mt-6 w-full max-w-lg">
                <SentenceBox
                  key={word.id}
                  word={word}
                  savedCount={savedCount}
                  onSave={(sentence) => addSentence(word.id, sentence)}
                />
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-center text-stone-400">{emptyHint}</p>
        )}
      </main>

      {word ? (
        <footer className="sticky bottom-0 mt-auto bg-paper px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-md">
            {pendingGrade ? (
              <p className="mb-2 text-center text-xs text-stone-400">再点一次进入下一词</p>
            ) : null}
            <GradeButtons disabled={gradeLocked} onGrade={grade} />
          </div>
        </footer>
      ) : null}
    </div>
  );
}
