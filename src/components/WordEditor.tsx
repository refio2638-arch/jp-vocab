"use client";

import { useState, type FormEvent } from "react";
import { JLPT_LEVELS, isJlptLevel, type JlptLevel, type Word } from "@/lib/types";

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
  romaji: string;
  meaning: string;
  pos: string;
  jlpt: string;
  exampleJp: string;
  exampleZh: string;
  notes: string;
};

function fromWord(word: Word | null | undefined): FormState {
  return {
    id: word?.id ?? "",
    kanji: word?.kanji ?? "",
    kana: word?.kana ?? "",
    romaji: word?.romaji ?? "",
    meaning: word?.meaning ?? "",
    pos: word?.pos ?? "",
    jlpt: word?.jlpt ?? "N5",
    exampleJp: word?.exampleJp ?? "",
    exampleZh: word?.exampleZh ?? "",
    notes: word?.notes ?? "",
  };
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function WordEditor({ initial, existingIds, onSave, onCancel }: WordEditorProps) {
  const editing = Boolean(initial);
  const [form, setForm] = useState<FormState>(() => fromWord(initial));
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const kana = form.kana.trim();
    const meaning = form.meaning.trim();
    if (!kana || !meaning) {
      setError("假名和释义是必填的");
      return;
    }
    const id = form.id.trim() || `c-${Date.now()}`;
    if (!editing && existingIds.includes(id)) {
      setError("这个编号已经存在，请换一个");
      return;
    }
    const jlptValue = form.jlpt.trim();
    const jlpt: JlptLevel | undefined = isJlptLevel(jlptValue) ? jlptValue : undefined;
    onSave({
      ...initial,
      id,
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
