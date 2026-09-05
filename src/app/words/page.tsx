"use client";

import { useEffect, useMemo, useState } from "react";
import { GlossText } from "@/components/GlossText";
import { LevelPicker } from "@/components/LevelPicker";
import { SiteHeader } from "@/components/SiteHeader";
import { WordEditor } from "@/components/WordEditor";
import { EN_LEVEL_COUNTS } from "@/data/en";
import { masteryLabel, masteryTone } from "@/lib/mastery";
import { downloadJson, parseImportPayload, toExportPayload } from "@/lib/parse";
import { useVocabStore } from "@/lib/store";
import {
  EN_LEVELS,
  JLPT_LEVELS,
  displayMeaning,
  displayMeaningEn,
  headText,
  todayKey,
  wordLang,
  type AppLang,
  type EnLevel,
  type JlptLevel,
  type Word,
} from "@/lib/types";

type JlptFilter = "all" | JlptLevel;
type EnFilter = "all" | EnLevel;

const PAGE_SIZE = 50;

export default function WordsPage() {
  const lang = useVocabStore((state) => state.lang);
  const setLang = useVocabStore((state) => state.setLang);
  const words = useVocabStore((state) => state.words);
  const progress = useVocabStore((state) => state.progress);
  const upsertWord = useVocabStore((state) => state.upsertWord);
  const importData = useVocabStore((state) => state.importData);

  const [query, setQuery] = useState("");
  const [jlpt, setJlpt] = useState<JlptFilter>("all");
  const [enLevel, setEnLevel] = useState<EnFilter>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Word | null>(null);
  const [adding, setAdding] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((word) => {
      if (wordLang(word) !== lang) {
        return false;
      }
      if (lang === "ja" && jlpt !== "all" && word.jlpt !== jlpt) {
        return false;
      }
      if (lang === "en" && enLevel !== "all" && word.level !== enLevel) {
        return false;
      }
      if (!q) {
        return true;
      }
      const blob = [
        word.kanji,
        word.kana,
        word.word ?? "",
        word.phonetic ?? "",
        word.meaning,
        word.meaningEn ?? "",
        word.meaningZh ?? "",
        word.exampleEn ?? "",
        word.exampleJp ?? "",
        word.romaji ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [enLevel, jlpt, lang, query, words]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  useEffect(() => {
    setPage(1);
  }, [query, jlpt, enLevel, lang, words.length]);

  function handleSave(word: Word) {
    upsertWord(word);
    setAdding(false);
    setEditing(null);
  }

  function runImport(raw: unknown) {
    const parsed = parseImportPayload(raw);
    if (parsed.words.length === 0 && parsed.progress.length === 0) {
      setImportMessage("没有读到有效词条。需要 JSON 数组，或带 words 字段的对象。");
      return;
    }
    importData(parsed.words, parsed.progress);
    setImportMessage(
      `已合并 ${parsed.words.length} 条词${parsed.progress.length > 0 ? `、${parsed.progress.length} 条进度` : ""}${
        parsed.skipped > 0 ? `，跳过 ${parsed.skipped} 条无效数据` : ""
      }。`,
    );
    setImportText("");
  }

  function importFromText() {
    try {
      runImport(JSON.parse(importText) as unknown);
    } catch {
      setImportMessage("JSON 解析失败，请检查格式。");
    }
  }

  async function importFromFile(file: File | undefined) {
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      runImport(JSON.parse(text) as unknown);
    } catch {
      setImportMessage("无法读取这个文件。");
    }
  }

  function exportAll() {
    const payload = toExportPayload(words, progress);
    downloadJson(`jp-vocab-${lang}-${todayKey()}.json`, payload);
  }

  const langs: { value: AppLang; label: string }[] = [
    { value: "ja", label: "日语" },
    { value: "en", label: "英语" },
  ];

  return (
    <div className="min-h-dvh bg-paper">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16">
        <h1 className="text-2xl font-semibold text-ink">词库</h1>
        <p className="mt-1 text-sm text-stone-500">
          当前启用 {words.length} 条，筛选后 {filtered.length} 条。导出时会带上 lang。
        </p>

        <div className="mt-4 flex rounded-full bg-stone-100 p-1 text-sm">
          {langs.map((option) => {
            const active = lang === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  void setLang(option.value);
                }}
                className={`min-h-10 flex-1 rounded-full px-3 ${
                  active ? "bg-stone-800 text-white" : "text-stone-500 hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {lang === "ja" ? (
          <div className="mt-4">
            <LevelPicker />
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-line bg-card p-5 text-sm text-stone-500">
            英语词库 CET4 {EN_LEVEL_COUNTS.CET4} 词
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={lang === "en" ? "搜索单词 / 音标 / 释义" : "搜索汉字 / 假名 / 释义"}
            className="min-h-12 flex-1 rounded-2xl border border-line bg-card px-4 text-ink outline-none focus:border-stone-400"
          />
          {lang === "ja" ? (
            <select
              value={jlpt}
              onChange={(event) => setJlpt(event.target.value as JlptFilter)}
              className="min-h-12 rounded-2xl border border-line bg-card px-3 text-ink"
            >
              <option value="all">全部级别</option>
              {JLPT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={enLevel}
              onChange={(event) => setEnLevel(event.target.value as EnFilter)}
              className="min-h-12 rounded-2xl border border-line bg-card px-3 text-ink"
            >
              <option value="all">全部级别</option>
              {EN_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
            className="min-h-11 rounded-2xl bg-stone-800 px-4 text-sm font-medium text-white"
          >
            新增
          </button>
          <button
            type="button"
            onClick={exportAll}
            className="min-h-11 rounded-2xl border border-line bg-card px-4 text-sm text-ink"
          >
            导出 JSON
          </button>
        </div>

        {adding || editing ? (
          <div className="mt-4">
            <WordEditor
              key={`${lang}-${editing?.id ?? "new"}`}
              initial={editing}
              existingIds={words.map((word) => word.id)}
              onSave={handleSave}
              onCancel={() => {
                setAdding(false);
                setEditing(null);
              }}
            />
          </div>
        ) : null}

        <section className="mt-6 rounded-3xl border border-line bg-card p-4">
          <h2 className="text-base font-medium">导入</h2>
          <p className="mt-1 text-sm text-stone-500">
            粘贴 JSON 数组，或上传导出文件。按 id 合并，已有词条会被覆盖。词条请带 lang。
          </p>
          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            className="mt-3 min-h-28 w-full rounded-2xl border border-line px-3 py-2 font-mono text-sm"
            placeholder={
              lang === "en"
                ? '[{"id":"custom-en-1","lang":"en","word":"apple","meaningZh":"苹果"}]'
                : '[{"id":"custom-1","lang":"ja","kanji":"猫","kana":"ねこ","meaning":"猫"}]'
            }
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={importFromText}
              className="min-h-11 rounded-2xl bg-stone-800 px-4 text-sm text-white"
            >
              从粘贴导入
            </button>
            <label className="flex min-h-11 cursor-pointer items-center rounded-2xl border border-line px-4 text-sm">
              上传文件
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  void importFromFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {importMessage ? <p className="mt-3 text-sm text-stone-600">{importMessage}</p> : null}
        </section>

        {filtered.length === 0 ? (
          <p className="mt-8 text-center text-sm text-stone-500">没有匹配的词。</p>
        ) : (
          <>
            <ul className="mt-6 space-y-2">
              {paged.map((word) => {
                const label = masteryLabel(progress[word.id]);
                const isEn = wordLang(word) === "en";
                return (
                  <li key={word.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(word);
                        setAdding(false);
                      }}
                      className="flex w-full min-h-16 items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className={`${isEn ? "" : "font-jp"} truncate text-lg text-ink`}>
                          {headText(word)}
                          {!isEn && word.kanji && word.kanji !== word.kana ? (
                            <span className="ml-2 text-sm text-stone-500">{word.kana}</span>
                          ) : null}
                          {isEn && word.phonetic ? (
                            <span className="ml-2 text-sm font-normal text-stone-500">{word.phonetic}</span>
                          ) : null}
                        </p>
                        <GlossText
                          primary={displayMeaning(word)}
                          secondary={displayMeaningEn(word)}
                          primaryClassName="truncate text-sm text-stone-500"
                          compact
                        />
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-stone-400">
                          {isEn ? (word.level ?? "CET4") : (word.jlpt ?? "—")}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${masteryTone(label)}`}>
                          {label}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-stone-500">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="min-h-11 rounded-2xl border border-line bg-card px-4 text-ink disabled:opacity-40"
              >
                上一页
              </button>
              <span className="tabular-nums">
                {safePage} / {pageCount} · 每页 {PAGE_SIZE} 条
              </span>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
                className="min-h-11 rounded-2xl border border-line bg-card px-4 text-ink disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
