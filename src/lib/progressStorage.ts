import { parseProgress } from "@/lib/parse";
import type { AppLang, Progress } from "@/lib/types";

export function progressStorageKey(lang: AppLang): string {
  return `progress:${lang}`;
}

function asRecord(raw: unknown): Record<string, Progress> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  if (Array.isArray(raw)) {
    const next: Record<string, Progress> = {};
    for (const item of raw) {
      const entry = parseProgress(item);
      if (entry) {
        next[entry.wordId] = entry;
      }
    }
    return next;
  }
  const next: Record<string, Progress> = {};
  for (const [wordId, value] of Object.entries(raw as Record<string, unknown>)) {
    const entry = parseProgress(
      value && typeof value === "object" ? { wordId, ...(value as object) } : null,
    );
    if (entry) {
      next[entry.wordId] = entry;
    }
  }
  return next;
}

export function readProgress(lang: AppLang): Record<string, Progress> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(progressStorageKey(lang));
    if (!raw) {
      return {};
    }
    return asRecord(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function writeProgress(lang: AppLang, progress: Record<string, Progress>): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(progressStorageKey(lang), JSON.stringify(progress));
}
