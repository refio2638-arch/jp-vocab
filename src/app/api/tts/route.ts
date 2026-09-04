import { NextResponse } from "next/server";
import { synthesizeNanami } from "@/lib/edge-tts-server";

export const runtime = "nodejs";

type Body = {
  text?: unknown;
  rate?: unknown;
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

  try {
    const audio = await synthesizeNanami(text, rate);
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
