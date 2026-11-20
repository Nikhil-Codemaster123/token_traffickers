// ElevenLabs text-to-speech for the fallback loop. Without a key it answers 501 and the browser speaks instead.
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 501 });

  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text?.trim()) return Response.json({ error: "text missing" }, { status: 400 });

  const voice = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb"; // a premade ElevenLabs voice
  const model = process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5";
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text: text.slice(0, 800), model_id: model }),
  });
  if (!res.ok || !res.body) {
    return Response.json({ error: `ElevenLabs answered ${res.status}: ${await res.text().catch(() => "")}` }, { status: 502 });
  }
  return new Response(res.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
}
