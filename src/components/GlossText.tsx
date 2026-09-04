"use client";

type GlossTextProps = {
  primary: string;
  secondary?: string;
  primaryClassName?: string;
  align?: "center" | "left";
  foldLabel?: string;
  compact?: boolean;
};

export function GlossText({
  primary,
  secondary,
  primaryClassName = "text-ink",
  align = "left",
  foldLabel = "英文",
  compact = false,
}: GlossTextProps) {
  const extra = secondary?.trim();
  const showExtra = Boolean(extra && extra !== primary);

  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className={primaryClassName}>{primary}</p>
      {showExtra && compact ? (
        <p className="mt-0.5 truncate text-xs text-stone-400">{extra}</p>
      ) : null}
      {showExtra && !compact ? (
        <details className="mt-1">
          <summary className="cursor-pointer select-none text-xs text-stone-400">{foldLabel}</summary>
          <p className="mt-1 text-sm leading-6 text-stone-500">{extra}</p>
        </details>
      ) : null}
    </div>
  );
}
