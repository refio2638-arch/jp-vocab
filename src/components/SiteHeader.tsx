"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangToggle } from "@/components/LangToggle";

const LINKS = [
  { href: "/", label: "首页" },
  { href: "/study/review", label: "复习" },
  { href: "/words", label: "词库" },
  { href: "/stats", label: "统计" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4">
      <Link href="/" className="shrink-0 text-lg font-semibold tracking-tight text-ink">
        日词本
      </Link>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <LangToggle />
        <nav className="flex gap-1 text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 ${
                  active ? "bg-stone-800 text-white" : "text-stone-500 hover:bg-stone-100 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
