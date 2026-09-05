import { isAppLang, type AppLang, type EnAccent } from "@/lib/types";

export const LANG_STORAGE_KEY = "jp-vocab-lang";
export const EN_ACCENT_STORAGE_KEY = "jp-vocab-en-accent";

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
