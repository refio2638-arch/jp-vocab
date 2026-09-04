import type { Progress } from "@/lib/types";

export function masteryLabel(progress: Progress | undefined): string {
  if (!progress || progress.reps === 0) {
    return "未学";
  }
  if (progress.unknown > progress.know) {
    return "易忘";
  }
  if (progress.lastGrade === "unknown") {
    return "不认识";
  }
  if (progress.lastGrade === "fuzzy") {
    return "模糊";
  }
  if (progress.know >= 2 && progress.unknown === 0) {
    return "较熟";
  }
  return "学习中";
}

export function masteryTone(label: string): string {
  switch (label) {
    case "较熟":
      return "text-teal-800 bg-teal-50";
    case "模糊":
      return "text-amber-800 bg-amber-50";
    case "不认识":
    case "易忘":
      return "text-rose-800 bg-rose-50";
    case "未学":
      return "text-stone-500 bg-stone-100";
    default:
      return "text-sky-800 bg-sky-50";
  }
}

export function ratioPercents(know: number, fuzzy: number, unknown: number): {
  know: number;
  fuzzy: number;
  unknown: number;
  total: number;
} {
  const total = know + fuzzy + unknown;
  if (total === 0) {
    return { know: 0, fuzzy: 0, unknown: 0, total: 0 };
  }
  return {
    know: Math.round((know / total) * 100),
    fuzzy: Math.round((fuzzy / total) * 100),
    unknown: Math.round((unknown / total) * 100),
    total,
  };
}
