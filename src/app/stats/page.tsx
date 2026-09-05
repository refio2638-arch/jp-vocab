"use client";

import { useMemo } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ratioPercents } from "@/lib/mastery";
import { forgetScore } from "@/lib/scheduler";
import { useVocabStore } from "@/lib/store";
import { displayMeaning, headText, todayKey, wordLang, type Word } from "@/lib/types";

function PercentRow({
  title,
  know,
  fuzzy,
  unknown,
}: {
  title: string;
  know: number;
  fuzzy: number;
  unknown: number;
}) {
  const ratios = ratioPercents(know, fuzzy, unknown);
  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="text-base font-medium text-ink">{title}</h2>
      {ratios.total === 0 ? (
        <p className="mt-3 text-sm text-stone-500">还没有记录。</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-stone-100">
            <span className="bg-teal-700" style={{ width: `${ratios.know}%` }} />
            <span className="bg-amber-500" style={{ width: `${ratios.fuzzy}%` }} />
            <span className="bg-rose-600" style={{ width: `${ratios.unknown}%` }} />
          </div>
          <ul className="mt-4 space-y-1 text-sm text-stone-600">
            <li>认识 {ratios.know}%（{know}）</li>
            <li>模糊 {ratios.fuzzy}%（{fuzzy}）</li>
            <li>不认识 {ratios.unknown}%（{unknown}）</li>
          </ul>
        </>
      )}
    </section>
  );
}

export default function StatsPage() {
  const words = useVocabStore((state) => state.words);
  const progress = useVocabStore((state) => state.progress);
  const session = useVocabStore((state) => state.session);
  const todayCount = useVocabStore((state) =>
    state.todayDate === todayKey() ? state.todayCount : 0,
  );
  const lifetimeReviews = useVocabStore((state) => state.lifetimeReviews);
  const lang = useVocabStore((state) => state.lang);

  const totals = useMemo(() => {
    return Object.values(progress).reduce(
      (acc, item) => {
        acc.know += item.know;
        acc.fuzzy += item.fuzzy;
        acc.unknown += item.unknown;
        return acc;
      },
      { know: 0, fuzzy: 0, unknown: 0 },
    );
  }, [progress]);

  const wordMap = useMemo(() => {
    const map = new Map<string, Word>();
    for (const word of words) {
      map.set(word.id, word);
    }
    return map;
  }, [words]);

  const topForget = useMemo(() => {
    return Object.values(progress)
      .filter((item) => item.reps > 0)
      .sort((a, b) => forgetScore(b) - forgetScore(a))
      .slice(0, 20)
      .map((item) => ({
        progress: item,
        word: wordMap.get(item.wordId),
      }))
      .filter((item) => item.word);
  }, [progress, wordMap]);

  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg space-y-4 px-4 pb-16">
        <h1 className="text-2xl font-semibold text-ink">统计</h1>
        <p className="text-sm text-stone-500">当前：{lang === "en" ? "英语" : "日语"}（进度互不影响）</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-line bg-card p-5">
            <p className="text-sm text-stone-500">今日刷词</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">{todayCount}</p>
          </div>
          <div className="rounded-3xl border border-line bg-card p-5">
            <p className="text-sm text-stone-500">累计次数</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">{lifetimeReviews}</p>
          </div>
        </div>

        <PercentRow
          title="本次"
          know={session.know}
          fuzzy={session.fuzzy}
          unknown={session.unknown}
        />
        <PercentRow title="累计" know={totals.know} fuzzy={totals.fuzzy} unknown={totals.unknown} />

        <section className="rounded-3xl border border-line bg-card p-5">
          <h2 className="text-base font-medium text-ink">最容易忘 TOP20</h2>
          {topForget.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">刷过一些词之后会出现在这里。</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topForget.map((item, index) => {
                const word = item.word;
                if (!word) {
                  return null;
                }
                return (
                  <li key={word.id} className="flex items-baseline justify-between gap-3">
                    <span className={wordLang(word) === "en" ? "text-ink" : "font-jp text-ink"}>
                      <span className="mr-2 text-stone-400">{index + 1}.</span>
                      {headText(word)}
                      <span className="ml-2 text-sm text-stone-500">{displayMeaning(word)}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-stone-400">
                      不认识 {item.progress.unknown} · 权重 {item.progress.nextWeight.toFixed(1)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
