import type { JlptLevel, StudyScope } from "@/lib/types";
import { isJlptLevel, sortLevels } from "@/lib/types";

export const LEVELS_STORAGE_KEY = "jp-vocab-levels";
export const SCOPE_STORAGE_KEY = "jp-vocab-scope";

export function parseEnabledLevels(raw: unknown): JlptLevel[] {
  if (!Array.isArray(raw)) {
    return ["N5"];
  }
  const levels = raw.filter((item): item is JlptLevel => typeof item === "string" && isJlptLevel(item));
  return levels.length > 0 ? sortLevels(levels) : ["N5"];
}

export function parseStudyScope(raw: unknown): StudyScope {
  return raw === "new" || raw === "weak" ? raw : "all";
}

export function readEnabledLevels(): JlptLevel[] {
  if (typeof window === "undefined") {
    return ["N5"];
  }
  try {
    const raw = window.localStorage.getItem(LEVELS_STORAGE_KEY);
    if (!raw) {
      return ["N5"];
    }
    return parseEnabledLevels(JSON.parse(raw) as unknown);
  } catch {
    return ["N5"];
  }
}

export function writeEnabledLevels(levels: JlptLevel[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LEVELS_STORAGE_KEY, JSON.stringify(sortLevels(levels)));
}

export function readStudyScope(): StudyScope {
  if (typeof window === "undefined") {
    return "all";
  }
  try {
    return parseStudyScope(window.localStorage.getItem(SCOPE_STORAGE_KEY));
  } catch {
    return "all";
  }
}

export function writeStudyScope(scope: StudyScope): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SCOPE_STORAGE_KEY, scope);
}
