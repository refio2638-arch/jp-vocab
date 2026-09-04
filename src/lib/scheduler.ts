import type { Grade, Progress, Word } from "@/lib/types";

export const NEW_WORD_WEIGHT = 50;
export const MIN_WEIGHT = 1;
const UNSEEN_HOURS = 72;

export function defaultProgress(wordId: string): Progress {
  return {
    wordId,
    reps: 0,
    know: 0,
    fuzzy: 0,
    unknown: 0,
    lastGrade: null,
    lastSeenAt: null,
    nextWeight: NEW_WORD_WEIGHT,
    sentences: [],
  };
}

export function applyWeight(current: number, grade: Grade): number {
  if (grade === "know") {
    return Math.max(MIN_WEIGHT, current * 0.45);
  }
  if (grade === "fuzzy") {
    return current * 1.15 + 8;
  }
  return current * 1.6 + 20;
}

export function hoursSinceLast(lastSeenAt: number | null, now: number): number {
  if (lastSeenAt === null) {
    return UNSEEN_HOURS;
  }
  return Math.max(0, (now - lastSeenAt) / 3_600_000);
}

export function scoreWord(
  progress: Progress | undefined,
  now: number,
  random: () => number = Math.random,
): number {
  const weight = progress?.nextWeight ?? NEW_WORD_WEIGHT;
  const hours = hoursSinceLast(progress?.lastSeenAt ?? null, now);
  const jitter = 0.85 + random() * 0.3;
  return weight * Math.log10(hours + 1.5) * jitter;
}

export function applyGradeToProgress(
  prev: Progress | undefined,
  wordId: string,
  grade: Grade,
  now: number,
): Progress {
  const base = prev ?? defaultProgress(wordId);
  return {
    ...base,
    wordId,
    reps: base.reps + 1,
    know: base.know + (grade === "know" ? 1 : 0),
    fuzzy: base.fuzzy + (grade === "fuzzy" ? 1 : 0),
    unknown: base.unknown + (grade === "unknown" ? 1 : 0),
    lastGrade: grade,
    lastSeenAt: now,
    nextWeight: applyWeight(base.nextWeight, grade),
    sentences: base.sentences ?? [],
  };
}

export function selectNextWord(
  words: Word[],
  progress: Record<string, Progress>,
  excludeId: string | null,
  now: number = Date.now(),
  random: () => number = Math.random,
): Word | null {
  if (words.length === 0) {
    return null;
  }

  const candidates =
    excludeId && words.length > 1
      ? words.filter((word) => word.id !== excludeId)
      : words;

  let best: Word | null = null;
  let bestScore = -Infinity;

  for (const word of candidates) {
    const score = scoreWord(progress[word.id], now, random);
    if (score > bestScore) {
      bestScore = score;
      best = word;
    }
  }

  return best;
}

export function forgetScore(progress: Progress): number {
  return progress.unknown * 10 + progress.nextWeight;
}

export function isNewWord(progress: Progress | undefined): boolean {
  return !progress || progress.reps === 0;
}

export function isWeakWord(progress: Progress | undefined): boolean {
  if (!progress || progress.reps === 0) {
    return false;
  }
  if (progress.lastGrade === "unknown" || progress.lastGrade === "fuzzy") {
    return true;
  }
  if (progress.unknown > 0 || progress.fuzzy > 0) {
    return true;
  }
  return progress.nextWeight >= 20;
}

export function filterStudyPool(
  words: Word[],
  progress: Record<string, Progress>,
  scope: "all" | "new" | "weak",
): Word[] {
  if (scope === "new") {
    return words.filter((word) => isNewWord(progress[word.id]));
  }
  if (scope === "weak") {
    return words.filter((word) => isWeakWord(progress[word.id]));
  }
  return words;
}
