import { createHash, randomUUID } from "crypto";
import WebSocket from "ws";

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CHROMIUM = "143.0.7499.41";
const VOICE = "ja-JP-NanamiNeural";
const WIN_EPOCH = 11644473600;

export async function synthesizeNanami(text: string, rate = 0.92): Promise<Buffer> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error("empty");
  }
  if (trimmed.length > 400) {
    throw new Error("too-long");
  }

  const requestId = randomUUID().replace(/-/g, "");
  const gec = generateSecMsGec();
  const url =
    `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1` +
    `?TrustedClientToken=${TOKEN}` +
    `&Sec-MS-GEC=${gec}` +
    `&Sec-MS-GEC-Version=1-${CHROMIUM}` +
    `&ConnectionId=${requestId}`;

  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    const timer = setTimeout(() => {
      ws.terminate();
      finish(new Error("timeout"));
    }, 8000);

    const ws = new WebSocket(url, {
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        Cookie: `MUID=${randomUUID().replace(/-/g, "").toUpperCase()}`,
      },
    });

    const fail = (error: Error) => {
      ws.terminate();
      finish(error);
    };

    ws.on("open", () => {
      const stamp = new Date().toString();
      ws.send(
        `X-Timestamp:${stamp}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":false,"wordBoundaryEnabled":false},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`,
      );
      ws.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${stamp}Z\r\nPath:ssml\r\n\r\n` +
          buildSsml(trimmed, rate),
      );
    });

    ws.on("message", (data, isBinary) => {
      if (isBinary || Buffer.isBuffer(data)) {
        const raw = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        const audio = extractAudio(raw);
        if (audio && audio.length > 0) {
          chunks.push(audio);
        }
        return;
      }
      const textMsg = data.toString();
      if (textMsg.includes("Path:turn.end")) {
        ws.close();
        finish();
      }
    });

    ws.on("error", (error) => {
      fail(error instanceof Error ? error : new Error("ws"));
    });

    ws.on("close", () => {
      if (chunks.length > 0) {
        finish();
        return;
      }
      finish(new Error("closed"));
    });
  });

  if (chunks.length === 0) {
    throw new Error("no-audio");
  }
  return Buffer.concat(chunks);
}

function generateSecMsGec(): string {
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks = Math.floor(ticks * 10_000_000);
  return createHash("sha256").update(`${ticks}${TOKEN}`).digest("hex").toUpperCase();
}

function buildSsml(text: string, rate: number): string {
  const percent = Math.round((rate - 1) * 100);
  const rateText = `${percent >= 0 ? "+" : ""}${percent}%`;
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">` +
    `<voice name="${VOICE}">` +
    `<prosody pitch="+0Hz" rate="${rateText}">${escaped}</prosody>` +
    `</voice></speak>`
  );
}

function extractAudio(data: Buffer): Buffer | null {
  if (data.length < 2) {
    return null;
  }
  const headerLength = data.readUInt16BE(0);
  const body = data.subarray(2 + headerLength);
  if (body.length === 0) {
    return null;
  }
  return body;
}
