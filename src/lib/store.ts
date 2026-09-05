"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BANK_VERSION } from "@/data/jlpt";
import {
  parseAppLang,
  parseEnAccent,
  parseEnabledEnLevels,
  readAppLang,
  readEnAccent,
  readEnabledEnLevels,
  writeAppLang,
  writeEnAccent,
  writeEnabledEnLevels,
} from "@/lib/langSettings";
import {
  parseEnabledLevels,
  parseStudyScope,
  readEnabledLevels,
  readStudyScope,
  writeEnabledLevels,
  writeStudyScope,
} from "@/lib/levelSettings";
import { mergeProgressById, mergeWordsById, overlayExampleFields } from "@/lib/parse";
import { readProgress, writeProgress } from "@/lib/progressStorage";
import {
  applyGradeToProgress,
  defaultProgress,
  filterStudyPool,
  selectNextWord,
} from "@/lib/scheduler";
import { configureEnAccent, configureSpeak } from "@/lib/speak";
import type {
  AppLang,
  EnAccent,
  EnLevel,
  Grade,
  JlptLevel,
  Progress,
  SessionStats,
  SpeakEngine,
  StudyScope,
  Word,
} from "@/lib/types";
import { isEnLevel, sortEnLevels, sortLevels, todayKey, wordLang } from "@/lib/types";
import { loadEnglishWords, loadLevel } from "@/lib/wordBank";

type TodayBucket = { date: string; count: number };

export type VocabState = {
  lang: AppLang;
  enAccent: EnAccent;
  words: Word[];
  customWords: Word[];
  bankByLevel: Partial<Record<JlptLevel, Word[]>>;
  enBank: Word[];
  enBankByLevel: Partial<Record<EnLevel, Word[]>>;
  enabledLevels: JlptLevel[];
  enabledEnLevels: EnLevel[];
  studyScope: StudyScope;
  bankReady: boolean;
  progress: Record<string, Progress>;
  autoSpeak: boolean;
  speakEngine: SpeakEngine;
  todayDate: string;
  todayCount: number;
  lifetimeReviews: number;
  todayByLang: Record<AppLang, TodayBucket>;
  lifetimeByLang: Record<AppLang, number>;
  session: SessionStats;
  sessionByLang: Record<AppLang, SessionStats>;
  hydrated: boolean;
  bankVersion: string;
  setHydrated: (value: boolean) => void;
  setLang: (lang: AppLang) => Promise<void>;
  setEnAccent: (accent: EnAccent) => void;
  setAutoSpeak: (value: boolean) => void;
  setSpeakEngine: (value: SpeakEngine) => void;
  setEnabledLevels: (levels: JlptLevel[]) => Promise<void>;
  setEnabledEnLevels: (levels: EnLevel[]) => Promise<void>;
  setStudyScope: (scope: StudyScope) => void;
  toggleLevel: (level: JlptLevel) => Promise<void>;
  toggleEnLevel: (level: EnLevel) => Promise<void>;
  ensureBank: () => Promise<void>;
  applyGrade: (wordId: string, grade: Grade) => void;
  addSentence: (wordId: string, sentence: string) => boolean;
  pickNext: (excludeId: string | null) => Word | null;
  upsertWord: (word: Word) => void;
  importData: (words: Word[], progress: Progress[]) => void;
  resetSession: () => void;
};

const emptySession = (): SessionStats => ({
  reviewed: 0,
  know: 0,
  fuzzy: 0,
  unknown: 0,
});

function emptyTodayByLang(date = todayKey()): Record<AppLang, TodayBucket> {
  return {
    ja: { date, count: 0 },
    en: { date, count: 0 },
  };
}

function emptyLifetimeByLang(): Record<AppLang, number> {
  return { ja: 0, en: 0 };
}

function emptySessionByLang(): Record<AppLang, SessionStats> {
  return { ja: emptySession(), en: emptySession() };
}

function currentToday(bucket: TodayBucket | undefined): TodayBucket {
  const today = todayKey();
  if (!bucket || bucket.date !== today) {
    return { date: today, count: 0 };
  }
  return bucket;
}

function collectWords(
  lang: AppLang,
  enabledLevels: JlptLevel[],
  bankByLevel: Partial<Record<JlptLevel, Word[]>>,
  enabledEnLevels: EnLevel[],
  enBankByLevel: Partial<Record<EnLevel, Word[]>>,
  customWords: Word[],
): Word[] {
  const map = new Map<string, Word>();
  for (const word of customWords) {
    if (wordLang(word) !== lang) {
      continue;
    }
    if (lang === "ja" && word.jlpt && !enabledLevels.includes(word.jlpt)) {
      continue;
    }
    if (lang === "en" && word.level && isEnLevel(word.level) && !enabledEnLevels.includes(word.level)) {
      continue;
    }
    map.set(word.id, word);
  }
  if (lang === "en") {
    for (const level of enabledEnLevels) {
      for (const word of enBankByLevel[level] ?? []) {
        const stored = map.get(word.id);
        map.set(word.id, stored ? overlayExampleFields(stored, word) : word);
      }
    }
    return Array.from(map.values());
  }
  for (const level of enabledLevels) {
    for (const word of bankByLevel[level] ?? []) {
      const stored = map.get(word.id);
      map.set(word.id, stored ? overlayExampleFields(stored, word) : word);
    }
  }
  return Array.from(map.values());
}

function flattenEnBank(enBankByLevel: Partial<Record<EnLevel, Word[]>>): Word[] {
  return Object.values(enBankByLevel).flatMap((list) => list ?? []);
}

function overlayCustomFromBank(
  customWords: Word[],
  bankByLevel: Partial<Record<JlptLevel, Word[]>>,
  enBankByLevel: Partial<Record<EnLevel, Word[]>>,
): Word[] {
  const byId = new Map<string, Word>();
  for (const list of Object.values(bankByLevel)) {
    for (const word of list ?? []) {
      byId.set(word.id, word);
    }
  }
  for (const word of flattenEnBank(enBankByLevel)) {
    byId.set(word.id, word);
  }
  if (byId.size === 0) {
    return customWords;
  }
  return customWords.map((word) => {
    const bank = byId.get(word.id);
    return bank ? overlayExampleFields(word, bank) : word;
  });
}

function isCachedBankId(id: string): boolean {
  return /^N[1-5]-/.test(id) || /^en-(cet4|cet6|kaoyan)-/.test(id);
}

function migrateCustomWords(saved: Partial<VocabState> | undefined): Word[] {
  const custom = Array.isArray(saved?.customWords) ? saved.customWords : [];
  return custom.filter((word) => word?.id && !isCachedBankId(word.id));
}

function withWords(
  state: Pick<
    VocabState,
    "lang" | "enabledLevels" | "enabledEnLevels" | "bankByLevel" | "enBankByLevel" | "customWords"
  >,
  extra: Partial<VocabState> = {},
): Partial<VocabState> {
  const lang = extra.lang ?? state.lang;
  const enabledLevels = extra.enabledLevels ?? state.enabledLevels;
  const enabledEnLevels = extra.enabledEnLevels ?? state.enabledEnLevels;
  const bankByLevel = extra.bankByLevel ?? state.bankByLevel;
  const enBankByLevel = extra.enBankByLevel ?? state.enBankByLevel;
  const customWords = extra.customWords ?? state.customWords;
  const enBank = flattenEnBank(enBankByLevel);
  return {
    ...extra,
    lang,
    enabledLevels,
    enabledEnLevels,
    bankByLevel,
    enBankByLevel,
    enBank,
    customWords,
    words: collectWords(lang, enabledLevels, bankByLevel, enabledEnLevels, enBankByLevel, customWords),
  };
}

export const useVocabStore = create<VocabState>()(
  persist(
    (set, get) => ({
      lang: "ja",
      enAccent: "en-US",
      words: [],
      customWords: [],
      bankByLevel: {},
      enBank: [],
      enBankByLevel: {},
      enabledLevels: ["N5"],
      enabledEnLevels: ["CET4"],
      studyScope: "all",
      bankReady: false,
      progress: {},
      autoSpeak: true,
      speakEngine: "neural",
      todayDate: todayKey(),
      todayCount: 0,
      lifetimeReviews: 0,
      todayByLang: emptyTodayByLang(),
      lifetimeByLang: emptyLifetimeByLang(),
      session: emptySession(),
      sessionByLang: emptySessionByLang(),
      hydrated: false,
      bankVersion: "",
      setHydrated: (value) => set({ hydrated: value }),
      setLang: async (lang) => {
        const state = get();
        if (state.lang === lang && state.bankReady) {
          return;
        }
        writeAppLang(lang);
        const today = currentToday(state.todayByLang[lang]);
        const bankAlready =
          lang === "en"
            ? state.enabledEnLevels.every((level) => Boolean(state.enBankByLevel[level]))
            : state.enabledLevels.every((level) => Boolean(state.bankByLevel[level]));
        set({
          ...withWords(state, { lang, bankReady: bankAlready }),
          progress: readProgress(lang),
          todayByLang: { ...state.todayByLang, [lang]: today },
          todayDate: today.date,
          todayCount: today.count,
          lifetimeReviews: state.lifetimeByLang[lang] ?? 0,
          session: state.sessionByLang[lang] ?? emptySession(),
        });
        await get().ensureBank();
      },
      setEnAccent: (accent) => {
        writeEnAccent(accent);
        configureEnAccent(accent);
        set({ enAccent: accent });
      },
      setAutoSpeak: (value) => set({ autoSpeak: value }),
      setSpeakEngine: (value) => {
        configureSpeak(value);
        set({ speakEngine: value });
      },
      setEnabledLevels: async (levels) => {
        const enabledLevels = sortLevels(levels.length > 0 ? levels : ["N5"]);
        writeEnabledLevels(enabledLevels);
        set(withWords(get(), { enabledLevels, bankReady: get().lang !== "ja" ? get().bankReady : false }));
        if (get().lang === "ja") {
          await get().ensureBank();
        }
      },
      setEnabledEnLevels: async (levels) => {
        const enabledEnLevels = sortEnLevels(levels.length > 0 ? levels : ["CET4"]);
        writeEnabledEnLevels(enabledEnLevels);
        const missing = enabledEnLevels.some((level) => !get().enBankByLevel[level]);
        set(withWords(get(), { enabledEnLevels, bankReady: get().lang === "en" && missing ? false : get().bankReady }));
        if (get().lang === "en") {
          await get().ensureBank();
        }
      },
      setStudyScope: (scope) => {
        writeStudyScope(scope);
        set({ studyScope: scope });
      },
      toggleLevel: async (level) => {
        const current = get().enabledLevels;
        const next = current.includes(level)
          ? current.filter((item) => item !== level)
          : [...current, level];
        await get().setEnabledLevels(next);
      },
      toggleEnLevel: async (level) => {
        const current = get().enabledEnLevels;
        const next = current.includes(level)
          ? current.filter((item) => item !== level)
          : [...current, level];
        await get().setEnabledEnLevels(next);
      },
      ensureBank: async () => {
        const state = get();
        if (state.lang === "en") {
          const enBankByLevel = { ...state.enBankByLevel };
          await Promise.all(
            state.enabledEnLevels.map(async (level) => {
              if (!enBankByLevel[level]) {
                enBankByLevel[level] = await loadEnglishWords([level]);
              }
            }),
          );
          const customWords = overlayCustomFromBank(state.customWords, state.bankByLevel, enBankByLevel);
          set(
            withWords(get(), {
              enBankByLevel,
              customWords,
              bankReady: true,
            }),
          );
          return;
        }
        const versionChanged = state.bankVersion !== BANK_VERSION;
        const nextBank = versionChanged ? {} : { ...state.bankByLevel };
        await Promise.all(
          state.enabledLevels.map(async (level) => {
            if (!nextBank[level]) {
              nextBank[level] = await loadLevel(level);
            }
          }),
        );
        const customWords = overlayCustomFromBank(state.customWords, nextBank, state.enBankByLevel);
        set(
          withWords(get(), {
            bankByLevel: nextBank,
            customWords,
            bankReady: true,
            bankVersion: BANK_VERSION,
          }),
        );
      },
      applyGrade: (wordId, grade) => {
        const state = get();
        const lang = state.lang;
        const updated = applyGradeToProgress(state.progress[wordId], wordId, grade, Date.now());
        const progress = { ...state.progress, [wordId]: updated };
        writeProgress(lang, progress);
        const today = currentToday(state.todayByLang[lang]);
        const nextToday = { date: today.date, count: today.count + 1 };
        const todayByLang = { ...state.todayByLang, [lang]: nextToday };
        const lifetimeByLang = {
          ...state.lifetimeByLang,
          [lang]: (state.lifetimeByLang[lang] ?? 0) + 1,
        };
        const session = {
          reviewed: state.session.reviewed + 1,
          know: state.session.know + (grade === "know" ? 1 : 0),
          fuzzy: state.session.fuzzy + (grade === "fuzzy" ? 1 : 0),
          unknown: state.session.unknown + (grade === "unknown" ? 1 : 0),
        };
        set({
          progress,
          todayByLang,
          todayDate: nextToday.date,
          todayCount: nextToday.count,
          lifetimeByLang,
          lifetimeReviews: lifetimeByLang[lang],
          session,
          sessionByLang: { ...state.sessionByLang, [lang]: session },
        });
      },
      addSentence: (wordId, sentence) => {
        const trimmed = sentence.trim();
        if (!trimmed) {
          return false;
        }
        const state = get();
        const prev = state.progress[wordId];
        const current = prev ?? defaultProgress(wordId);
        const existing = current.sentences ?? [];
        if (existing.includes(trimmed)) {
          return true;
        }
        const progress = {
          ...state.progress,
          [wordId]: { ...current, sentences: [...existing, trimmed] },
        };
        writeProgress(state.lang, progress);
        set({ progress });
        return true;
      },
      pickNext: (excludeId) => {
        const { words, progress, studyScope } = get();
        const pool = filterStudyPool(words, progress, studyScope);
        return selectNextWord(pool, progress, excludeId);
      },
      upsertWord: (word) => {
        const state = get();
        const next = { ...word, lang: word.lang ?? state.lang };
        const customWords = mergeWordsById(state.customWords, [next]);
        set(withWords(state, { customWords }));
      },
      importData: (words, progress) => {
        const state = get();
        const tagged = words.map((word) => ({ ...word, lang: word.lang ?? state.lang }));
        const nextProgress = mergeProgressById(state.progress, progress);
        writeProgress(state.lang, nextProgress);
        set({
          ...withWords(state, { customWords: mergeWordsById(state.customWords, tagged) }),
          progress: nextProgress,
        });
      },
      resetSession: () => {
        const state = get();
        const session = emptySession();
        set({
          session,
          sessionByLang: { ...state.sessionByLang, [state.lang]: session },
        });
      },
    }),
    {
      name: "jp-vocab-v1",
      skipHydration: true,
      partialize: (state) => ({
        lang: state.lang,
        enAccent: state.enAccent,
        customWords: state.customWords.filter((word) => !isCachedBankId(word.id)),
        enabledLevels: state.enabledLevels,
        enabledEnLevels: state.enabledEnLevels,
        studyScope: state.studyScope,
        autoSpeak: state.autoSpeak,
        speakEngine: state.speakEngine,
        todayByLang: state.todayByLang,
        lifetimeByLang: state.lifetimeByLang,
        bankVersion: state.bankVersion,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<VocabState> & { progress?: Record<string, Progress> } | undefined;
        const today = todayKey();
        const lang = parseAppLang(saved?.lang ?? readAppLang());
        const enabledLevels = parseEnabledLevels(saved?.enabledLevels ?? readEnabledLevels());
        const enabledEnLevels = parseEnabledEnLevels(saved?.enabledEnLevels ?? readEnabledEnLevels());
        const studyScope = parseStudyScope(saved?.studyScope ?? readStudyScope());
        const enAccent = parseEnAccent(saved?.enAccent ?? readEnAccent());

        const jaStored = readProgress("ja");
        if (Object.keys(jaStored).length === 0 && saved?.progress && Object.keys(saved.progress).length > 0) {
          writeProgress("ja", saved.progress);
        }

        const todayByLang = saved?.todayByLang ?? emptyTodayByLang(today);
        if (!saved?.todayByLang && typeof saved?.todayCount === "number") {
          const savedDate = saved.todayDate ?? today;
          todayByLang.ja = {
            date: savedDate,
            count: savedDate === today ? saved.todayCount : 0,
          };
        }
        todayByLang.ja = currentToday(todayByLang.ja);
        todayByLang.en = currentToday(todayByLang.en);

        const lifetimeByLang = saved?.lifetimeByLang ?? emptyLifetimeByLang();
        if (!saved?.lifetimeByLang && typeof saved?.lifetimeReviews === "number") {
          lifetimeByLang.ja = saved.lifetimeReviews;
        }

        const bucket = todayByLang[lang];
        return {
          ...current,
          ...saved,
          lang,
          enAccent,
          words: [],
          customWords: migrateCustomWords(saved),
          bankByLevel: {},
          enBank: [],
          enBankByLevel: {},
          enabledLevels,
          enabledEnLevels,
          studyScope,
          bankReady: false,
          progress: readProgress(lang),
          autoSpeak: saved?.autoSpeak ?? true,
          speakEngine: saved?.speakEngine === "system" ? "system" : "neural",
          todayByLang,
          lifetimeByLang,
          todayDate: bucket.date,
          todayCount: bucket.count,
          lifetimeReviews: lifetimeByLang[lang] ?? 0,
          bankVersion: typeof saved?.bankVersion === "string" ? saved.bankVersion : "",
          session: current.session,
          sessionByLang: emptySessionByLang(),
          hydrated: current.hydrated,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          writeAppLang(state.lang);
          writeEnAccent(state.enAccent);
          writeEnabledLevels(state.enabledLevels);
          writeEnabledEnLevels(state.enabledEnLevels);
          writeStudyScope(state.studyScope);
          configureSpeak(state.speakEngine === "system" ? "system" : "neural");
          configureEnAccent(state.enAccent);
          state.setHydrated(true);
        }
      },
    },
  ),
);
