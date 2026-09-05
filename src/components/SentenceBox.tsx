"use client";

import { useState, type FormEvent } from "react";
import { sentenceContainsWord } from "@/lib/parse";
import { wordLang, type Word } from "@/lib/types";

type SentenceBoxProps = {
  word: Word;
  savedCount: number;
  onSave: (sentence: string) => void;
};

export function SentenceBox({ word, savedCount, onSave }: SentenceBoxProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const isEn = wordLang(word) === "en";

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!sentenceContainsWord(trimmed, word)) {
      setOk(false);
      setError(isEn ? "句子里需要包含这个单词" : "句子里需要包含这个词的汉字或假名");
      return;
    }
    onSave(trimmed);
    setValue("");
    setError(null);
    setOk(true);
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="sentence-input" className="block text-sm text-stone-500">
        {isEn ? "用这个词写一句英语" : "用这个词写一句日语"}
        {savedCount > 0 ? <span className="ml-2 text-stone-400">已记 {savedCount} 句</span> : null}
      </label>
      <div className="flex gap-2">
        <input
          id="sentence-input"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
            setOk(false);
          }}
          className={`${isEn ? "" : "font-jp"} min-h-12 flex-1 rounded-2xl border border-line bg-white px-4 text-base text-ink outline-none focus:border-stone-400`}
          placeholder={isEn ? "例：Don't abandon your studies." : "例：水を飲みます。"}
          autoComplete="off"
        />
        <button
          type="submit"
          className="min-h-12 shrink-0 rounded-2xl bg-stone-800 px-4 text-sm font-medium text-white"
        >
          记下
        </button>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {ok ? <p className="text-sm text-teal-700">已记下</p> : null}
    </form>
  );
}
