import { NextRequest, NextResponse } from 'next/server';

// Ensure Node.js runtime so Buffer is available for base64 encoding
export const runtime = 'nodejs';

// Transcribe an audio chunk using Cloudflare Workers AI (Whisper family)
// This endpoint accepts raw audio bytes (e.g., audio/webm;codecs=opus, audio/ogg, audio/wav)
// and forwards them to Cloudflare Workers AI for speech-to-text.
// Cheapest model recommendation: set CLOUDFLARE_STT_MODEL to a small Whisper variant if available
// (e.g., '@cf/openai/whisper-tiny.en'). Falls back to '@cf/openai/whisper' if not set.
export async function POST(request: NextRequest) {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const model =
      process.env.CLOUDFLARE_STT_MODEL?.trim() ||
      process.env.NEXT_PUBLIC_CLOUDFLARE_STT_MODEL?.trim() ||
      '@cf/openai/whisper-tiny.en';

    if (!accountId || !apiToken) {
      return NextResponse.json(
        {
          error:
            'Missing Cloudflare credentials. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment.',
        },
        { status: 500 }
      );
    }

    const buf = await request.arrayBuffer();
    if (!buf || buf.byteLength === 0) {
      return NextResponse.json({ error: 'Empty audio payload' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || 'audio/wav';

    const u8 = new Uint8Array(buf);
    const base64 = Buffer.from(u8).toString('base64');

    const cfBodyBase64 = {
      audio: `data:audio/wav;base64,${base64}`,
      // language: 'en',
    } as Record<string, unknown>;

    const cfBodyArray = {
      audio: Array.from(u8),
      // language: 'en',
    } as Record<string, unknown>;

    const callModelWithBody = async (m: string, body: Record<string, unknown>) => {
      const ep = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${m}`;
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 15000); // 15s timeout
      try {
        return await fetch(ep, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(body),
          signal: ac.signal,
        });
      } finally {
        clearTimeout(t);
      }
    };

    // Prefer the cheapest (env-provided) model; fallback to generic '@cf/openai/whisper' if not available
    const url = new URL(request.url);
    const sid = url.searchParams.get('sid') || 'unknown';
    const seq = url.searchParams.get('seq') || '0';

    console.log(`[transcribe] recv sid=${sid} seq=${seq} type=${contentType} bytes=${u8.length} model=${model}`);

    // Try base64 data URL first (shape: string), then array of bytes (shape: array)
    let cfRes = await callModelWithBody(model, cfBodyBase64);
    let shape = 'base64';

    if (!cfRes.ok) {
      try { cfRes.body?.cancel(); } catch {}
      cfRes = await callModelWithBody(model, cfBodyArray);
      shape = 'array';
    }

    if (!cfRes.ok && model !== '@cf/openai/whisper') {
      try { cfRes.body?.cancel(); } catch {}
      // Retry both shapes with fallback model
      cfRes = await callModelWithBody('@cf/openai/whisper', cfBodyBase64);
      shape = 'base64-fallback';
      if (!cfRes.ok) {
        try { cfRes.body?.cancel(); } catch {}
        cfRes = await callModelWithBody('@cf/openai/whisper', cfBodyArray);
        shape = 'array-fallback';
      }
    }

    if (!cfRes.ok) {
      const text = await cfRes.text();
      console.warn(`[transcribe] CF error sid=${sid} seq=${seq} status=${cfRes.status} shape=${shape} details=${text?.slice(0,200)}`);
      return NextResponse.json(
        { error: 'Cloudflare AI request failed', status: cfRes.status, details: text },
        { status: 502 }
      );
    }

    const data = await cfRes.json();
    const result = (data && (data.result || data)) || {};
    const text: string =
      result.text ||
      (Array.isArray(result.segments)
        ? result.segments.map((s: any) => s.text).join(' ').trim()
        : '') ||
      '';

    console.log(`[transcribe] ok sid=${sid} seq=${seq} textLen=${text.length} shape=${shape}`);
    return NextResponse.json({ text, raw: data });
  } catch (err) {
    console.error('Transcription error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}