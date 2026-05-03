import Constants from 'expo-constants';

const proxyUrl = (Constants.expoConfig?.extra as any)?.aiProxyUrl as string | undefined;
const sharedToken = (Constants.expoConfig?.extra as any)?.aiProxyToken as string | undefined;

async function call<T>(path: string, body: unknown): Promise<T> {
  if (!proxyUrl) throw new Error('aiProxyUrl not configured in app.json extra');
  const res = await fetch(`${proxyUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(sharedToken ? { 'x-noah-token': sharedToken } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`AI proxy ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function ocrImage(imageBase64: string, mimeType = 'image/jpeg'): Promise<string> {
  const r = await call<{ text: string }>('/ocr', { image: imageBase64, mimeType });
  return r.text;
}

export async function generateSentence(words: string[], supportWords: string[] = []): Promise<string> {
  const r = await call<{ sentence: string }>('/sentence', { words, supportWords });
  return r.sentence;
}

export async function generateImage(prompt: string): Promise<{ b64: string; mimeType: string }> {
  return call<{ b64: string; mimeType: string }>('/image', { prompt });
}
