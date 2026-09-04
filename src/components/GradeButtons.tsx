"use client";

import type { Grade } from "@/lib/types";

type GradeButtonsProps = {
  disabled?: boolean;
  onGrade: (grade: Grade) => void;
};

const BUTTONS: { grade: Grade; label: string; keyHint: string; className: string }[] = [
  {
    grade: "know",
    label: "认识",
    keyHint: "1",
    className: "bg-teal-700 text-white hover:bg-teal-800",
  },
  {
    grade: "fuzzy",
    label: "模糊",
    keyHint: "2",
    className: "bg-amber-600 text-white hover:bg-amber-700",
  },
  {
    grade: "unknown",
    label: "不认识",
    keyHint: "3",
    className: "bg-rose-700 text-white hover:bg-rose-800",
  },
];

export function GradeButtons({ disabled, onGrade }: GradeButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      {BUTTONS.map((item) => (
        <button
          key={item.grade}
          type="button"
          disabled={disabled}
          onClick={() => onGrade(item.grade)}
          className={`min-h-14 rounded-2xl px-2 text-base font-medium disabled:opacity-40 ${item.className}`}
        >
          <span className="block">{item.label}</span>
          <span className="mt-0.5 block text-xs font-normal opacity-80">{item.keyHint}</span>
        </button>
      ))}
    </div>
  );
}
