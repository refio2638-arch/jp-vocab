import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/edge-tts-server";

export const runtime = "nodejs";

const VOICES = {
  ja: { voice: "ja-JP-NanamiNeural", xmlLang: "ja-JP" },
  "en-US": { voice: "en-US-JennyNeural", xmlLang: "en-US" },
  "en-GB": { voice: "en-GB-SoniaNeural", xmlLang: "en-GB" },
} as const;

type Body = {
  text?: unknown;
  rate?: unknown;
  lang?: unknown;
  accent?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const rate = typeof body.rate === "number" && Number.isFinite(body.rate) ? body.rate : 0.92;
  const key = body.lang === "en" ? (body.accent === "en-GB" ? "en-GB" : "en-US") : "ja";
  const picked = VOICES[key];

  try {
    const audio = await synthesizeSpeech(text, rate, picked.voice, picked.xmlLang);
    return new Response(new Uint8Array(audio), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
