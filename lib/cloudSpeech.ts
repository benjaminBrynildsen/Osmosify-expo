import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from 'expo-audio';

/**
 * Cloud-based speech-to-text via the Cloudflare Worker. Used when the
 * on-device SFSpeechRecognizer can't keep up — Whisper / Grok-2-audio
 * is dramatically more accurate, especially for kid voices.
 *
 * Wire-up: set `extra.aiProxyUrl` and `extra.aiProxyToken` in app.json
 * after deploying the Worker. If unset, isCloudSpeechAvailable() returns
 * false and callers fall back to the device recognizer.
 */

const proxyUrl = (Constants.expoConfig?.extra as any)?.aiProxyUrl as string | undefined;
const sharedToken = (Constants.expoConfig?.extra as any)?.aiProxyToken as string | undefined;

export function isCloudSpeechAvailable(): boolean {
  return !!proxyUrl;
}

let micPermissionChecked = false;
let micPermissionGranted = false;

export async function ensureRecordingPermission(): Promise<boolean> {
  if (micPermissionChecked) return micPermissionGranted;
  try {
    const res = await requestRecordingPermissionsAsync();
    micPermissionGranted = !!res.granted;
  } catch {
    micPermissionGranted = false;
  }
  micPermissionChecked = true;
  return micPermissionGranted;
}

/**
 * Record a short utterance, upload to the Worker, return transcript.
 * @param prompt — biasing words to nudge the recognizer (e.g. expected target word)
 * @param maxSeconds — hard cap on recording length
 */
export async function transcribeOnce(
  prompt: string,
  maxSeconds: number = 4,
): Promise<{ text: string; source?: string } | null> {
  if (!proxyUrl) return null;
  const granted = await ensureRecordingPermission();
  if (!granted) return null;

  let recorder: any;
  try {
    recorder = new (AudioModule as any).AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
    recorder.record({ forDuration: maxSeconds });

    // Wait for recording to finish (forDuration auto-stops)
    await new Promise((r) => setTimeout(r, maxSeconds * 1000 + 200));
    try { await recorder.stop(); } catch {}

    const uri: string | null = recorder.uri;
    if (!uri) return null;

    const form = new FormData();
    form.append('audio', {
      uri,
      name: 'audio.m4a',
      type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
    } as any);
    form.append('language', 'en');
    if (prompt) form.append('prompt', prompt);

    const res = await fetch(`${proxyUrl}/transcribe`, {
      method: 'POST',
      headers: {
        ...(sharedToken ? { 'x-noah-token': sharedToken } : {}),
      },
      body: form,
    });
    if (!res.ok) {
      console.warn('[cloudSpeech] transcribe failed', res.status);
      return null;
    }
    const data = await res.json();
    return { text: (data?.text || '').trim(), source: data?.source };
  } catch (e) {
    console.warn('[cloudSpeech] transcribeOnce error', e);
    return null;
  }
}

/**
 * Record audio in repeating short chunks, transcribe each, and call
 * onTranscript with each. Returns a `stop` function. Used for games
 * like Lava Letters where we listen continuously while the kid plays.
 *
 * Each chunk is ~1.5s — short enough that creature saves feel
 * responsive, long enough that Whisper/Grok have a real utterance
 * to work with.
 */
export function startCloudChunkedListening(
  promptProvider: () => string,
  onTranscript: (text: string) => void,
  chunkSeconds: number = 1.6,
): { stop: () => void } {
  if (!proxyUrl) return { stop: () => {} };
  let stopped = false;

  const loop = async () => {
    const granted = await ensureRecordingPermission();
    if (!granted || stopped) return;

    while (!stopped) {
      let recorder: any;
      try {
        recorder = new (AudioModule as any).AudioRecorder(RecordingPresets.HIGH_QUALITY);
        await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
        recorder.record({ forDuration: chunkSeconds });
        await new Promise((r) => setTimeout(r, chunkSeconds * 1000 + 100));
        try { await recorder.stop(); } catch {}
        if (stopped) return;
        const uri: string | null = recorder.uri;
        if (!uri) continue;

        const form = new FormData();
        form.append('audio', {
          uri,
          name: 'chunk.m4a',
          type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
        } as any);
        form.append('language', 'en');
        const prompt = promptProvider();
        if (prompt) form.append('prompt', prompt);

        const res = await fetch(`${proxyUrl}/transcribe`, {
          method: 'POST',
          headers: { ...(sharedToken ? { 'x-noah-token': sharedToken } : {}) },
          body: form,
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = (data?.text || '').trim();
        if (text && !stopped) onTranscript(text);
      } catch (e) {
        console.warn('[cloudSpeech] chunk error', e);
        // Wait a moment before retrying to avoid hot-looping on errors
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  };

  loop();
  return { stop: () => { stopped = true; } };
}
