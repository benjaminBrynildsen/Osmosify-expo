/**
 * Noah AI proxy — Cloudflare Worker.
 *
 * The Expo app calls this Worker; the Worker holds the xAI key and
 * forwards requests to the xAI API. Keeps the API key out of the
 * client bundle.
 *
 * Endpoints:
 *   POST /ocr            { image: string (base64) }  →  { text: string }
 *   POST /sentence       { words: string[] }         →  { sentence: string }
 *   POST /image          { prompt: string }          →  { b64: string, mimeType: string }
 *
 * Auth: the app sends header `x-noah-token` matching APP_SHARED_SECRET.
 * Not bulletproof but good enough to keep random web requests out.
 */

interface Env {
  XAI_API_KEY: string;
  APP_SHARED_SECRET: string;
}

const XAI_BASE = 'https://api.x.ai/v1';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function callXai(env: Env, path: string, body: unknown) {
  const res = await fetch(`${XAI_BASE}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.XAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function handleOcr(env: Env, req: Request): Promise<Response> {
  const { image, mimeType = 'image/jpeg' } = (await req.json()) as {
    image: string;
    mimeType?: string;
  };
  if (!image) return json({ error: 'image required' }, 400);

  const upstream = await callXai(env, '/chat/completions', {
    model: 'grok-2-vision-1212',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${image}` },
          },
          {
            type: 'text',
            text:
              'Extract all the readable text from this book page image. Return ONLY the text — no commentary, no headers/page numbers, just the prose.',
          },
        ],
      },
    ],
  });
  if (!upstream.ok) {
    const errText = await upstream.text();
    return json({ error: 'upstream error', detail: errText }, 502);
  }
  const data: any = await upstream.json();
  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return json({ text });
}

async function handleSentence(env: Env, req: Request): Promise<Response> {
  const { words, supportWords = [] } = (await req.json()) as {
    words: string[];
    supportWords?: string[];
  };
  if (!words?.length) return json({ error: 'words required' }, 400);

  const prompt = `Create a simple sentence that a young child (ages 5-8) can read aloud.

REQUIRED WORDS (must include ALL of these): ${words.slice(0, 8).join(', ')}

OPTIONAL helper words: ${supportWords.slice(0, 5).join(', ') || 'none'}

Rules:
- The sentence MUST contain every required word at least once
- Keep it short (under 20 words)
- Age-appropriate, fun
- Only respond with the sentence, nothing else`;

  const upstream = await callXai(env, '/chat/completions', {
    model: 'grok-3',
    messages: [{ role: 'user', content: prompt }],
  });
  if (!upstream.ok) return json({ error: 'upstream error' }, 502);
  const data: any = await upstream.json();
  const sentence = data?.choices?.[0]?.message?.content?.trim() || '';
  return json({ sentence });
}

async function handleImage(env: Env, req: Request): Promise<Response> {
  const { prompt } = (await req.json()) as { prompt: string };
  if (!prompt) return json({ error: 'prompt required' }, 400);

  const upstream = await callXai(env, '/images/generations', {
    model: 'grok-2-image-1212',
    prompt,
    response_format: 'b64_json',
    n: 1,
  });
  if (!upstream.ok) return json({ error: 'upstream error' }, 502);
  const data: any = await upstream.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) return json({ error: 'no image returned' }, 502);
  return json({ b64, mimeType: 'image/png' });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, x-noah-token',
        },
      });
    }

    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

    if (
      env.APP_SHARED_SECRET &&
      req.headers.get('x-noah-token') !== env.APP_SHARED_SECRET
    ) {
      return json({ error: 'unauthorized' }, 401);
    }

    const url = new URL(req.url);
    try {
      if (url.pathname === '/ocr') return await handleOcr(env, req);
      if (url.pathname === '/sentence') return await handleSentence(env, req);
      if (url.pathname === '/image') return await handleImage(env, req);
      return json({ error: 'unknown route' }, 404);
    } catch (e: any) {
      return json({ error: 'server error', detail: String(e?.message || e) }, 500);
    }
  },
};
