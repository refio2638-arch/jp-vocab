"use client";

import Link from "next/link";
import { LevelPicker } from "@/components/LevelPicker";
import { SiteHeader } from "@/components/SiteHeader";
import { StudyScopeSelect } from "@/components/StudyScopeSelect";
import { VoiceModeToggle } from "@/components/VoiceModeToggle";
import { enabledBankCount, totalBankCount } from "@/lib/jlptCounts";
import { useVocabStore } from "@/lib/store";
import { todayKey } from "@/lib/types";

export default function HomePage() {
  const todayCount = useVocabStore((state) =>
    state.todayDate === todayKey() ? state.todayCount : 0,
  );
  const enabledLevels = useVocabStore((state) => state.enabledLevels);
  const wordCount = useVocabStore((state) => state.words.length);
  const lifetimeReviews = useVocabStore((state) => state.lifetimeReviews);
  const enabledCount = enabledBankCount(enabledLevels);
  const total = totalBankCount();

  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pb-16 pt-6">
        <p className="text-sm text-stone-500">个人日语单词本</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">先想再翻，连刷不停</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          数据只存在这台设备的浏览器里。没有账号、没有每日上限。
        </p>

        <div className="mt-8 rounded-3xl border border-line bg-card px-5 py-6">
          <p className="text-sm text-stone-500">今日已刷</p>
          <p className="mt-1 text-5xl font-semibold tabular-nums text-ink">{todayCount}</p>
          <p className="mt-3 text-sm text-stone-400">
            当前 {enabledCount} 词（已加载 {wordCount}）· 词库共 {total} · 累计 {lifetimeReviews} 次
          </p>
        </div>

        <div className="mt-6">
          <LevelPicker />
        </div>
        <div className="mt-4">
          <StudyScopeSelect />
        </div>

        <Link
          href="/study/review"
          className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-stone-800 text-base font-medium text-white"
        >
          继续复习
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link
            href="/words"
            className="flex min-h-14 items-center justify-center rounded-2xl border border-line bg-card text-base text-ink"
          >
            词库
          </Link>
          <Link
            href="/stats"
            className="flex min-h-14 items-center justify-center rounded-2xl border border-line bg-card text-base text-ink"
          >
            统计
          </Link>
        </div>
        <div className="mt-8">
          <VoiceModeToggle />
        </div>
      </main>
    </div>
  );
}
