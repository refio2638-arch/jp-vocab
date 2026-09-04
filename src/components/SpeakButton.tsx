"use client";

import type { MouseEvent } from "react";
import { speakJa } from "@/lib/speak";

type SpeakButtonProps = {
  text: string;
  label?: string;
  size?: "md" | "sm";
  onUnavailable?: (message: string) => void;
};

export function SpeakButton({
  text,
  label = "朗读",
  size = "md",
  onUnavailable,
}: SpeakButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void speakJa(text).catch(() => {
      onUnavailable?.("暂时无法朗读，已尝试回退系统语音。");
    });
  }

  const box = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const icon = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 ${box}`}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" className={icon} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 10v4h3l5 4V6L7 10H4z" strokeLinejoin="round" />
        <path d="M16 9.5a3.5 3.5 0 0 1 0 5" strokeLinecap="round" />
        <path d="M18.2 7.2a6.5 6.5 0 0 1 0 9.6" strokeLinecap="round" />
      </svg>
    </button>
  );
}
