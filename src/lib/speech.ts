export { speakJa as speakJapanese, stopSpeak } from "@/lib/speak";

export type SpeechStatus = {
  ready: boolean;
  message: string | null;
};

export function getSpeechStatus(): SpeechStatus {
  if (typeof window === "undefined") {
    return { ready: false, message: null };
  }
  if (navigator.onLine) {
    return { ready: true, message: null };
  }
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return {
      ready: false,
      message: "当前没有可用的语音。连网后可用神经语音；或改用系统语音（Chrome / Edge）。",
    };
  }
  return { ready: true, message: null };
}
