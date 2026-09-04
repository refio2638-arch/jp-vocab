"use client";

import { useEffect, type ReactNode } from "react";
import { useVocabStore } from "@/lib/store";

export function StoreProvider({ children }: { children: ReactNode }) {
  const hydrated = useVocabStore((state) => state.hydrated);
  const bankReady = useVocabStore((state) => state.bankReady);

  useEffect(() => {
    void useVocabStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (hydrated) {
      void useVocabStore.getState().ensureBank();
    }
  }, [hydrated]);

  if (!hydrated || !bankReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-6 text-stone-500">
        正在打开词本…
      </div>
    );
  }

  return children;
}
