export type SpeakMode = "neural" | "system";

export type VoiceOption = {
  id: string;
  name: string;
  lang: string;
  kind: "system" | "neural";
};

export type SpeakOptions = {
  rate?: number;
  interrupt?: boolean;
};

const NEURAL_VOICE_ID = "ja-JP-NanamiNeural";
const DEFAULT_RATE = 0.92;

let speakMode: SpeakMode = "neural";
let currentAudio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let remoteDisabledUntil = 0;
const neuralCache = new Map<string, Blob>();

export function configureSpeak(mode: SpeakMode): void {
  speakMode = mode;
}

export function getSpeakMode(): SpeakMode {
  return speakMode;
}

export function stopSpeak(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

export async function listVoices(): Promise<VoiceOption[]> {
  const neural: VoiceOption[] = [
    {
      id: NEURAL_VOICE_ID,
      name: "奈奈实（神经语音）",
      lang: "ja-JP",
      kind: "neural",
    },
  ];
  const system = await loadSystemVoices();
  const ja = system
    .filter((voice) => voice.lang.toLowerCase().startsWith("ja"))
    .map((voice) => ({
      id: `system:${voice.voiceURI}`,
      name: voice.name,
      lang: voice.lang,
      kind: "system" as const,
    }));
  return [...neural, ...ja];
}

export async function speakJa(text: string, options?: SpeakOptions): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return;
  }

  const rate = options?.rate ?? DEFAULT_RATE;
  const interrupt = options?.interrupt ?? true;
  if (interrupt) {
    stopSpeak();
  }

  try {
    if (speakMode === "neural") {
      const played = await speakNeural(trimmed, rate);
      if (played) {
        return;
      }
    }
    await speakSystem(trimmed, rate, speakMode === "neural");
  } catch {
    try {
      await speakSystem(trimmed, rate, false);
    } catch {
      // stay quiet: no key / no network / no engine should not freeze the page
    }
  }
}

async function speakNeural(text: string, rate: number): Promise<boolean> {
  const voices = await loadSystemVoices();
  const localNeural = pickNeuralSystemVoice(voices);
  if (localNeural && neuralScore(localNeural) >= 80) {
    await speakWithVoice(text, rate, localNeural);
    return true;
  }

  const cacheKey = `${rate}:${text}`;
  const cached = neuralCache.get(cacheKey);
  if (cached) {
    return playBlob(cached, rate);
  }

  const blob = await fetchNeuralAudio(text, rate);
  if (!blob) {
    return false;
  }
  if (neuralCache.size > 40) {
    const first = neuralCache.keys().next().value;
    if (first) {
      neuralCache.delete(first);
    }
  }
  neuralCache.set(cacheKey, blob);
  return playBlob(blob, rate);
}

async function fetchNeuralAudio(text: string, rate: number): Promise<Blob | null> {
  if (typeof window === "undefined" || !navigator.onLine || Date.now() < remoteDisabledUntil) {
    return null;
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, rate }),
      signal: controller.signal,
    });
    if (!response.ok) {
      remoteDisabledUntil = Date.now() + 5 * 60_000;
      return null;
    }
    const blob = await response.blob();
    if (blob.size < 80) {
      remoteDisabledUntil = Date.now() + 5 * 60_000;
      return null;
    }
    return blob;
  } catch {
    remoteDisabledUntil = Date.now() + 5 * 60_000;
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function playBlob(blob: Blob, rate: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    currentAudio = audio;
    audio.playbackRate = clamp(rate, 0.6, 1.4);
    const finish = (ok: boolean) => {
      audio.onended = null;
      audio.onerror = null;
      if (currentAudio === audio) {
        currentAudio = null;
      }
      resolve(ok);
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    void audio.play().then(
      () => undefined,
      () => finish(false),
    );
  });
}

async function speakSystem(text: string, rate: number, preferNeural: boolean): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const voices = await loadSystemVoices();
  const voice = preferNeural ? pickNeuralSystemVoice(voices) : pickPlainSystemVoice(voices);
  await speakWithVoice(text, rate, voice);
}

function speakWithVoice(
  text: string,
  rate: number,
  voice: SpeechSynthesisVoice | null,
): Promise<void> {
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = clamp(rate, 0.5, 1.4);
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

function pickNeuralSystemVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ja = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
  const scored = ja
    .map((voice) => ({ voice, score: neuralScore(voice) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.voice ?? null;
}

function pickPlainSystemVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ja = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ja"));
  const exact = ja.find((voice) => voice.lang.toLowerCase() === "ja-jp");
  return exact ?? ja[0] ?? null;
}

function neuralScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  if (name.includes("nanami") || name.includes("奈奈")) {
    return 100;
  }
  if (name.includes("natural") || name.includes("neural") || name.includes("online")) {
    return 80;
  }
  if (name.includes("haruka") || name.includes("ayumi") || name.includes("ichiro")) {
    return 10;
  }
  return 30;
}

function loadSystemVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) {
    return Promise.resolve(existing);
  }
  return new Promise((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", finish);
    window.setTimeout(finish, 700);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
