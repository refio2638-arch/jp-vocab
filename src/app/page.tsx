"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EnLevelPicker } from "@/components/EnLevelPicker";
import { LevelPicker } from "@/components/LevelPicker";
import { SiteHeader } from "@/components/SiteHeader";
import { StudyScopeSelect } from "@/components/StudyScopeSelect";
import { VoiceModeToggle } from "@/components/VoiceModeToggle";
import { EN_LEVEL_COUNTS } from "@/data/en";
import { enabledBankCount, totalBankCount } from "@/lib/jlptCounts";
import { useVocabStore } from "@/lib/store";
import { todayKey, type AppLang } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const lang = useVocabStore((state) => state.lang);
  const setLang = useVocabStore((state) => state.setLang);
  const todayByLang = useVocabStore((state) => state.todayByLang);
  const enabledLevels = useVocabStore((state) => state.enabledLevels);
  const enabledEnLevels = useVocabStore((state) => state.enabledEnLevels);
  const enBankByLevel = useVocabStore((state) => state.enBankByLevel);
  const lifetimeByLang = useVocabStore((state) => state.lifetimeByLang);
  const enCount = (level: "CET4" | "CET6" | "KAOYAN") =>
    enBankByLevel[level]?.length ?? EN_LEVEL_COUNTS[level];
  const enEnabledCount = enabledEnLevels.reduce((sum, level) => sum + enCount(level), 0);
  const enabledCount = enabledBankCount(enabledLevels);
  const total = totalBankCount();
  const today = todayKey();
  const jaToday = todayByLang.ja.date === today ? todayByLang.ja.count : 0;
  const enToday = todayByLang.en.date === today ? todayByLang.en.count : 0;

  async function startReview(next: AppLang) {
    await setLang(next);
    router.push("/study/review");
  }

  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pb-16 pt-6">
        <p className="text-sm text-stone-500">个人单词本</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">先想再翻，连刷不停</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          数据只存在这台设备的浏览器里。日语和英语进度分开保存。
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => {
              void startReview("ja");
            }}
            className="rounded-3xl border border-line bg-card px-5 py-6 text-left hover:border-stone-300"
          >
            <p className="text-lg font-medium text-ink">日语复习</p>
            <p className="mt-2 text-sm text-stone-500">今日已刷</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-ink">{jaToday}</p>
            <p className="mt-2 text-xs text-stone-400">
              当前 {enabledCount} 词 · 词库共 {total} · 累计 {lifetimeByLang.ja} 次
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              void startReview("en");
            }}
            className="rounded-3xl border border-line bg-card px-5 py-6 text-left hover:border-stone-300"
          >
            <p className="text-lg font-medium text-ink">英语复习</p>
            <p className="mt-2 text-sm text-stone-500">今日已刷</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-ink">{enToday}</p>
            <p className="mt-2 text-xs text-stone-400">
              当前 {enEnabledCount} 词 · CET4 {enCount("CET4")} · CET6 {enCount("CET6")} · 考研{" "}
              {enCount("KAOYAN")} · 累计 {lifetimeByLang.en} 次
            </p>
          </button>
        </div>

        {lang === "ja" ? (
          <div className="mt-6">
            <LevelPicker />
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-line bg-card px-5 py-5">
            <EnLevelPicker />
          </div>
        )}
        <div className="mt-4">
          <StudyScopeSelect />
        </div>

        <Link
          href="/study/review"
          className="mt-6 flex min-h-14 items-center justify-center rounded-2xl bg-stone-800 text-base font-medium text-white"
        >
          继续{lang === "en" ? "英语" : "日语"}复习
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
