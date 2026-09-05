"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LangToggle } from "@/components/LangToggle";
import { VoiceModeToggle } from "@/components/VoiceModeToggle";
import { useVocabStore } from "@/lib/store";

export function ReviewSettings() {
  const autoSpeak = useVocabStore((state) => state.autoSpeak);
  const setAutoSpeak = useVocabStore((state) => state.setAutoSpeak);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="设置"
        title="设置"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-ink"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path
            strokeLinecap="round"
            d="M19.4 13.5a7.6 7.6 0 0 0 .1-1.5 7.6 7.6 0 0 0-.1-1.5l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 3h-4l-.4 2.5a7.7 7.7 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0-.1 1.5 7.6 7.6 0 0 0 .1 1.5l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 2.6 1.5L10 21h4l.4-2.5a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5z"
          />
        </svg>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="关闭设置"
            className="fixed inset-0 z-40 bg-stone-900/25"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-label="复习设置"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto rounded-t-3xl border border-line bg-card px-5 py-5 shadow-lg md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-12 md:w-80 md:max-h-[min(80dvh,28rem)] md:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between md:hidden">
              <p className="text-sm font-medium text-ink">设置</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-10 rounded-full px-3 text-sm text-stone-500 hover:bg-stone-100 hover:text-ink"
              >
                关闭
              </button>
            </div>
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs text-stone-400">语言</p>
                <LangToggle />
              </div>
              <label className="flex min-h-10 items-center gap-2 text-sm text-stone-600">
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
          </div>
        </>
      ) : null}
    </div>
  );
}
