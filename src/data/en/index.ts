export const EN_LEVELS = ["CET4", "CET6", "KAOYAN"] as const;
export type EnBankLevel = (typeof EN_LEVELS)[number];

export const EN_LEVEL_COUNTS = {
  CET4: 121,
  CET6: 90,
  KAOYAN: 96,
} as const;

export async function importEnglishLevel(level: EnBankLevel) {
  switch (level) {
    case "CET4":
      return (await import("./cet4.json")).default;
    case "CET6":
      return (await import("./cet6.json")).default;
    case "KAOYAN":
      return (await import("./kaoyan.json")).default;
  }
}
