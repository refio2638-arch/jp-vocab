export const EN_LEVELS = ["CET4"] as const;
export type EnBankLevel = (typeof EN_LEVELS)[number];

export const EN_LEVEL_COUNTS = {
  CET4: 121,
} as const;

export async function importEnglishLevel(level: EnBankLevel) {
  switch (level) {
    case "CET4":
      return (await import("./cet4.json")).default;
  }
}
