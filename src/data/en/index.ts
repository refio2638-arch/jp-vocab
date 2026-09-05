export const EN_LEVELS = ["CET4", "CET6", "KAOYAN"] as const;
export type EnBankLevel = (typeof EN_LEVELS)[number];

export { EN_LEVEL_COUNTS } from "./counts";

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
