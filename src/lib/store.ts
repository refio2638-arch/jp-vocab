"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  parseEnabledLevels,
  parseStudyScope,
  readEnabledLevels,
  readStudyScope,
  writeEnabledLevels,
  writeStudyScope,
} from "@/lib/levelSettings";
import { mergeProgressById, mergeWordsById, overlayExampleFields } from "@/lib/parse";
import { configureSpeak } from "@/lib/speak";
import {
  applyGradeToProgress,
  defaultProgress,
  filterStudyPool,
  selectNextWord,
} from "@/lib/scheduler";
import type { Grade, JlptLevel, Progress, SessionStats, SpeakEngine, StudyScope, Word } from "@/lib/types";
import { sortLevels, todayKey } from "@/lib/types";
import { BANK_VERSION } from "@/data/jlpt";
import { loadLevel } from "@/lib/wordBank";

export type VocabState = {
  words: Word[];
  customWords: Word[];
  bankByLevel: Partial<Record<JlptLevel, Word[]>>;
  enabledLevels: JlptLevel[];
  studyScope: StudyScope;
  bankReady: boolean;
  progress: Record<string, Progress>;
  autoSpeak: boolean;
  speakEngine: SpeakEngine;
  todayDate: string;
  todayCount: number;
  lifetimeReviews: number;
  session: SessionStats;
  hydrated: boolean;
  bankVersion: string;
  setHydrated: (value: boolean) => void;
  setAutoSpeak: (value: boolean) => void;
  setSpeakEngine: (value: SpeakEngine) => void;
  setEnabledLevels: (levels: JlptLevel[]) => Promise<void>;
  setStudyScope: (scope: StudyScope) => void;
  toggleLevel: (level: JlptLevel) => Promise<void>;
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

function bumpToday(
  todayDate: string,
  todayCount: number,
): { todayDate: string; todayCount: number } {
  const today = todayKey();
  if (todayDate !== today) {
    return { todayDate: today, todayCount: 1 };
  }
  return { todayDate, todayCount: todayCount + 1 };
}

function collectWords(
  enabledLevels: JlptLevel[],
  bankByLevel: Partial<Record<JlptLevel, Word[]>>,
  customWords: Word[],
): Word[] {
  const map = new Map<string, Word>();
  for (const word of customWords) {
    if (word.jlpt && !enabledLevels.includes(word.jlpt)) {
      continue;
    }
    map.set(word.id, word);
  }
  for (const level of enabledLevels) {
    for (const word of bankByLevel[level] ?? []) {
      const stored = map.get(word.id);
      map.set(word.id, stored ? overlayExampleFields(stored, word) : word);
    }
  }
  return Array.from(map.values());
}

function overlayCustomFromBank(
  customWords: Word[],
  bankByLevel: Partial<Record<JlptLevel, Word[]>>,
): Word[] {
  const byId = new Map<string, Word>();
  for (const list of Object.values(bankByLevel)) {
    for (const word of list ?? []) {
      byId.set(word.id, word);
    }
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
  return /^N[1-5]-/.test(id);
}

function migrateCustomWords(saved: Partial<VocabState> | undefined): Word[] {
  const custom = Array.isArray(saved?.customWords) ? saved.customWords : [];
  return custom.filter((word) => word?.id && !isCachedBankId(word.id));
}

function withWords(
  state: Pick<VocabState, "enabledLevels" | "bankByLevel" | "customWords">,
  extra: Partial<VocabState> = {},
): Partial<VocabState> {
  const enabledLevels = extra.enabledLevels ?? state.enabledLevels;
  const bankByLevel = extra.bankByLevel ?? state.bankByLevel;
  const customWords = extra.customWords ?? state.customWords;
  return {
    ...extra,
    enabledLevels,
    bankByLevel,
    customWords,
    words: collectWords(enabledLevels, bankByLevel, customWords),
  };
}

export const useVocabStore = create<VocabState>()(
  persist(
    (set, get) => ({
      words: [],
      customWords: [],
      bankByLevel: {},
      enabledLevels: ["N5"],
      studyScope: "all",
      bankReady: false,
      progress: {},
      autoSpeak: true,
      speakEngine: "neural",
      todayDate: todayKey(),
      todayCount: 0,
      lifetimeReviews: 0,
      session: emptySession(),
      hydrated: false,
      bankVersion: "",
      setHydrated: (value) => set({ hydrated: value }),
      setAutoSpeak: (value) => set({ autoSpeak: value }),
      setSpeakEngine: (value) => {
        configureSpeak(value);
        set({ speakEngine: value });
      },
      setEnabledLevels: async (levels) => {
        const enabledLevels = sortLevels(levels.length > 0 ? levels : ["N5"]);
        writeEnabledLevels(enabledLevels);
        set(withWords(get(), { enabledLevels, bankReady: false }));
        await get().ensureBank();
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
      ensureBank: async () => {
        const state = get();
        const versionChanged = state.bankVersion !== BANK_VERSION;
        const nextBank = versionChanged ? {} : { ...state.bankByLevel };
        await Promise.all(
          state.enabledLevels.map(async (level) => {
            if (!nextBank[level]) {
              nextBank[level] = await loadLevel(level);
            }
          }),
        );
        const customWords = overlayCustomFromBank(state.customWords, nextBank);
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
        const updated = applyGradeToProgress(state.progress[wordId], wordId, grade, Date.now());
        const day = bumpToday(state.todayDate, state.todayCount);
        set({
          progress: { ...state.progress, [wordId]: updated },
          todayDate: day.todayDate,
          todayCount: day.todayCount,
          lifetimeReviews: state.lifetimeReviews + 1,
          session: {
            reviewed: state.session.reviewed + 1,
            know: state.session.know + (grade === "know" ? 1 : 0),
            fuzzy: state.session.fuzzy + (grade === "fuzzy" ? 1 : 0),
            unknown: state.session.unknown + (grade === "unknown" ? 1 : 0),
          },
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
        set({
          progress: {
            ...state.progress,
            [wordId]: { ...current, sentences: [...existing, trimmed] },
          },
        });
        return true;
      },
      pickNext: (excludeId) => {
        const { words, progress, studyScope } = get();
        const pool = filterStudyPool(words, progress, studyScope);
        return selectNextWord(pool, progress, excludeId);
      },
      upsertWord: (word) => {
        const customWords = mergeWordsById(get().customWords, [word]);
        set(withWords(get(), { customWords }));
      },
      importData: (words, progress) => {
        const state = get();
        set({
          ...withWords(state, { customWords: mergeWordsById(state.customWords, words) }),
          progress: mergeProgressById(state.progress, progress),
        });
      },
      resetSession: () => set({ session: emptySession() }),
    }),
    {
      name: "jp-vocab-v1",
      skipHydration: true,
      partialize: (state) => ({
        customWords: state.customWords.filter((word) => !isCachedBankId(word.id)),
        progress: state.progress,
        enabledLevels: state.enabledLevels,
        studyScope: state.studyScope,
        autoSpeak: state.autoSpeak,
        speakEngine: state.speakEngine,
        todayDate: state.todayDate,
        todayCount: state.todayCount,
        lifetimeReviews: state.lifetimeReviews,
        bankVersion: state.bankVersion,
      }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<VocabState> | undefined;
        const today = todayKey();
        const savedDate = saved?.todayDate ?? today;
        const enabledLevels = parseEnabledLevels(saved?.enabledLevels ?? readEnabledLevels());
        const studyScope = parseStudyScope(saved?.studyScope ?? readStudyScope());
        return {
          ...current,
          ...saved,
          words: [],
          customWords: migrateCustomWords(saved),
          bankByLevel: {},
          enabledLevels,
          studyScope,
          bankReady: false,
          progress: saved?.progress ?? {},
          autoSpeak: saved?.autoSpeak ?? true,
          speakEngine: saved?.speakEngine === "system" ? "system" : "neural",
          todayDate: savedDate,
          todayCount: savedDate === today ? (saved?.todayCount ?? 0) : 0,
          lifetimeReviews: saved?.lifetimeReviews ?? 0,
          bankVersion: typeof saved?.bankVersion === "string" ? saved.bankVersion : "",
          session: current.session,
          hydrated: current.hydrated,
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          writeEnabledLevels(state.enabledLevels);
          writeStudyScope(state.studyScope);
          configureSpeak(state.speakEngine === "system" ? "system" : "neural");
          state.setHydrated(true);
        }
      },
    },
  ),
);
