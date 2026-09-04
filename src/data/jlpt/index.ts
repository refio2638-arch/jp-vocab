export const BANK_VERSION = "example-zh-1";
export const JLPT_BANK_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
export type JlptBankLevel = (typeof JLPT_BANK_LEVELS)[number];

export { JLPT_LEVEL_COUNTS } from "./counts";

export async function importJlptLevel(level: JlptBankLevel) {
  switch (level) {
    case "N5":
      return (await import("./n5.json")).default;
    case "N4":
      return (await import("./n4.json")).default;
    case "N3":
      return (await import("./n3.json")).default;
    case "N2":
      return (await import("./n2.json")).default;
    case "N1":
      return (await import("./n1.json")).default;
  }
}
