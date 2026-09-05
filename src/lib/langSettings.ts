import { isAppLang, isEnLevel, sortEnLevels, type AppLang, type EnAccent, type EnLevel } from "@/lib/types";

export const LANG_STORAGE_KEY = "jp-vocab-lang";
export const EN_ACCENT_STORAGE_KEY = "jp-vocab-en-accent";
export const EN_LEVELS_STORAGE_KEY = "en-levels";

export function parseAppLang(raw: unknown): AppLang {
  return typeof raw === "string" && isAppLang(raw) ? raw : "ja";
}

export function readAppLang(): AppLang {
  if (typeof window === "undefined") {
    return "ja";
  }
  try {
    return parseAppLang(window.localStorage.getItem(LANG_STORAGE_KEY));
  } catch {
    return "ja";
  }
}

export function writeAppLang(lang: AppLang): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LANG_STORAGE_KEY, lang);
}

export function parseEnAccent(raw: unknown): EnAccent {
  return raw === "en-GB" ? "en-GB" : "en-US";
}

export function readEnAccent(): EnAccent {
  if (typeof window === "undefined") {
    return "en-US";
  }
  try {
    return parseEnAccent(window.localStorage.getItem(EN_ACCENT_STORAGE_KEY));
  } catch {
    return "en-US";
  }
}

export function writeEnAccent(accent: EnAccent): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(EN_ACCENT_STORAGE_KEY, accent);
}

export function parseEnabledEnLevels(raw: unknown): EnLevel[] {
  if (typeof raw === "string") {
    try {
      return parseEnabledEnLevels(JSON.parse(raw) as unknown);
    } catch {
      return ["CET4"];
    }
  }
  if (!Array.isArray(raw)) {
    return ["CET4"];
  }
  const levels = raw.filter((item): item is EnLevel => typeof item === "string" && isEnLevel(item));
  return levels.length > 0 ? sortEnLevels(levels) : ["CET4"];
}

export function readEnabledEnLevels(): EnLevel[] {
  if (typeof window === "undefined") {
    return ["CET4"];
  }
  try {
    return parseEnabledEnLevels(window.localStorage.getItem(EN_LEVELS_STORAGE_KEY));
  } catch {
    return ["CET4"];
  }
}

export function writeEnabledEnLevels(levels: EnLevel[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(EN_LEVELS_STORAGE_KEY, JSON.stringify(sortEnLevels(levels)));
}
