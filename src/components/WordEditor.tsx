"use client";

import { useState, type FormEvent } from "react";
import { useVocabStore } from "@/lib/store";
import { EN_LEVELS, JLPT_LEVELS, isEnLevel, isJlptLevel, wordLang, type EnLevel, type JlptLevel, type Word } from "@/lib/types";

type WordEditorProps = {
  initial?: Word | null;
  existingIds: string[];
  onSave: (word: Word) => void;
  onCancel: () => void;
};

type FormState = {
  id: string;
  kanji: string;
  kana: string;
  word: string;
  phonetic: string;
  romaji: string;
  meaning: string;
  meaningZh: string;
  meaningEn: string;
  pos: string;
  jlpt: string;
  level: string;
  exampleJp: string;
  exampleEn: string;
  exampleZh: string;
  notes: string;
};

function fromWord(word: Word | null | undefined): FormState {
  return {
    id: word?.id ?? "",
    kanji: word?.kanji ?? "",
    kana: word?.kana ?? "",
    word: word?.word ?? "",
    phonetic: word?.phonetic ?? "",
    romaji: word?.romaji ?? "",
    meaning: word?.meaning ?? "",
    meaningZh: word?.meaningZh ?? "",
    meaningEn: word?.meaningEn ?? "",
    pos: word?.pos ?? "",
    jlpt: word?.jlpt ?? "N5",
    level: word?.level ?? "CET4",
    exampleJp: word?.exampleJp ?? "",
    exampleEn: word?.exampleEn ?? "",
    exampleZh: word?.exampleZh ?? "",
    notes: word?.notes ?? "",
  };
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function WordEditor({ initial, existingIds, onSave, onCancel }: WordEditorProps) {
  const appLang = useVocabStore((state) => state.lang);
  const editing = Boolean(initial);
  const isEn = initial ? wordLang(initial) === "en" : appLang === "en";
  const [form, setForm] = useState<FormState>(() => fromWord(initial));
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const id = form.id.trim() || `c-${Date.now()}`;
    if (!editing && existingIds.includes(id)) {
      setError("这个编号已经存在，请换一个");
      return;
    }

    if (isEn) {
      const english = form.word.trim();
      const meaningZh = form.meaningZh.trim() || form.meaning.trim();
      if (!english || !meaningZh) {
        setError("单词和中文释义是必填的");
        return;
      }
      const levelValue = form.level.trim();
      const level: EnLevel | undefined = isEnLevel(levelValue) ? levelValue : undefined;
      onSave({
        ...initial,
        id,
        lang: "en",
        kanji: "",
        kana: "",
        word: english,
        phonetic: optional(form.phonetic),
        meaning: meaningZh,
        meaningZh,
        meaningEn: optional(form.meaningEn),
        pos: optional(form.pos),
        level: level ?? "CET4",
        exampleEn: optional(form.exampleEn),
        exampleZh: optional(form.exampleZh),
        notes: optional(form.notes),
      });
      return;
    }

    const kana = form.kana.trim();
    const meaning = form.meaning.trim();
    if (!kana || !meaning) {
      setError("假名和释义是必填的");
      return;
    }
    const jlptValue = form.jlpt.trim();
    const jlpt: JlptLevel | undefined = isJlptLevel(jlptValue) ? jlptValue : undefined;
    onSave({
      ...initial,
      id,
      lang: "ja",
      kanji: form.kanji.trim(),
      kana,
      meaning,
      meaningEn: initial?.meaningEn,
      meaningZh: initial?.meaningZh,
      romaji: optional(form.romaji),
      pos: optional(form.pos),
      jlpt,
      exampleJp: optional(form.exampleJp),
      exampleEn: initial?.exampleEn,
      exampleZh: optional(form.exampleZh),
      notes: optional(form.notes),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-3xl border border-line bg-card p-4">
      <h2 className="text-base font-medium">{editing ? "编辑词条" : "新增词条"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-stone-500">
          编号
          <input
            value={form.id}
            onChange={(event) => setField("id", event.target.value)}
            disabled={editing}
            className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink disabled:bg-stone-50"
            placeholder="留空则自动生成"
          />
        </label>
        {isEn ? (
          <label className="text-sm text-stone-500">
            级别
            <select
              value={form.level}
              onChange={(event) => setField("level", event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-ink"
            >
              {EN_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="text-sm text-stone-500">
            JLPT
            <select
              value={form.jlpt}
              onChange={(event) => setField("jlpt", event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-line bg-white px-3 text-ink"
            >
              <option value="">不标级别</option>
              {JLPT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        )}
        {isEn ? (
          <>
            <label className="text-sm text-stone-500">
              单词 *
              <input
                value={form.word}
                onChange={(event) => setField("word", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
                required
              />
            </label>
            <label className="text-sm text-stone-500">
              音标
              <input
                value={form.phonetic}
                onChange={(event) => setField("phonetic", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
                placeholder="/əˈbændən/"
              />
            </label>
            <label className="text-sm text-stone-500 sm:col-span-2">
              中文释义 *
              <input
                value={form.meaningZh}
                onChange={(event) => setField("meaningZh", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
                required
              />
            </label>
            <label className="text-sm text-stone-500 sm:col-span-2">
              英文释义
              <input
                value={form.meaningEn}
                onChange={(event) => setField("meaningEn", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
              />
            </label>
            <label className="text-sm text-stone-500 sm:col-span-2">
              例句（英语）
              <input
                value={form.exampleEn}
                onChange={(event) => setField("exampleEn", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
              />
            </label>
            <label className="text-sm text-stone-500 sm:col-span-2">
              例句（中文）
              <input
                value={form.exampleZh}
                onChange={(event) => setField("exampleZh", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
              />
            </label>
          </>
        ) : (
          <>
            <label className="text-sm text-stone-500">
              汉字
              <input
                value={form.kanji}
                onChange={(event) => setField("kanji", event.target.value)}
                className="font-jp mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
              />
            </label>
            <label className="text-sm text-stone-500">
              假名 *
              <input
                value={form.kana}
                onChange={(event) => setField("kana", event.target.value)}
                className="font-jp mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
                required
              />
            </label>
            <label className="text-sm text-stone-500">
              罗马音
              <input
                value={form.romaji}
                onChange={(event) => setField("romaji", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
              />
            </label>
            <label className="text-sm text-stone-500">
              词性
              <input
                value={form.pos}
                onChange={(event) => setField("pos", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
                placeholder="动词 / 名词 …"
              />
            </label>
            <label className="text-sm text-stone-500 sm:col-span-2">
              释义 *
              <input
                value={form.meaning}
                onChange={(event) => setField("meaning", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
                required
              />
            </label>
            <label className="text-sm text-stone-500 sm:col-span-2">
              例句（日语）
              <input
                value={form.exampleJp}
                onChange={(event) => setField("exampleJp", event.target.value)}
                className="font-jp mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
              />
            </label>
            <label className="text-sm text-stone-500 sm:col-span-2">
              例句（中文）
              <input
                value={form.exampleZh}
                onChange={(event) => setField("exampleZh", event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-line px-3 text-ink"
              />
            </label>
          </>
        )}
        <label className="text-sm text-stone-500 sm:col-span-2">
          笔记
          <textarea
            value={form.notes}
            onChange={(event) => setField("notes", event.target.value)}
            className="mt-1 min-h-20 w-full rounded-xl border border-line px-3 py-2 text-ink"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" className="min-h-11 rounded-2xl bg-stone-800 px-4 text-sm font-medium text-white">
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-2xl px-4 text-sm text-stone-500 hover:bg-stone-100"
        >
          取消
        </button>
      </div>
    </form>
  );
}
