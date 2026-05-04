import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

// Dynamic import for speech recognition - may not be available in Expo Go
let ExpoSpeechRecognition: any = null;
let useSpeechRecognitionEvent: any = null;

try {
  const mod = require('expo-speech-recognition');
  ExpoSpeechRecognition = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Not available (e.g. Expo Go) - speech recognition will be disabled
}

export type VoiceOption = 'alloy' | 'nova' | 'shimmer';

let isSpeaking = false;
let cachedVoiceId: string | null | undefined = undefined; // undefined = not queried yet

/**
 * Pick the best-sounding voice on the device, once per app launch.
 * iOS: prefers premium > enhanced > Siri voices over the robotic compact default.
 * Android: prefers Enhanced quality voices.
 * Picks female en-US voices that read warmly for kids (Samantha, Zoe, Karen).
 */
async function pickBestVoiceId(): Promise<string | null> {
  if (cachedVoiceId !== undefined) return cachedVoiceId;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices?.length) {
      cachedVoiceId = null;
      return null;
    }
    const preferredNames = ['Samantha', 'Zoe', 'Ava', 'Allison', 'Susan', 'Karen', 'Moira'];
    const score = (v: Speech.Voice): number => {
      let s = 0;
      const id = (v.identifier || '').toLowerCase();
      const name = (v.name || '').toLowerCase();
      if (Platform.OS === 'ios') {
        if (id.includes('premium')) s += 100;
        if (id.includes('siri')) s += 90;
        if (id.includes('enhanced')) s += 70;
      } else if (Platform.OS === 'android') {
        if ((v as any).quality === Speech.VoiceQuality.Enhanced) s += 80;
      }
      const lang = (v.language || '').toLowerCase();
      if (lang.startsWith('en-us')) s += 40;
      else if (lang.startsWith('en')) s += 20;
      const idx = preferredNames.findIndex((n) => name.includes(n.toLowerCase()));
      if (idx >= 0) s += 30 - idx;
      return s;
    };
    const englishOnly = voices.filter((v) => (v.language || '').toLowerCase().startsWith('en'));
    const sorted = (englishOnly.length ? englishOnly : voices).slice().sort((a, b) => score(b) - score(a));
    cachedVoiceId = sorted[0]?.identifier || null;
    return cachedVoiceId;
  } catch {
    cachedVoiceId = null;
    return null;
  }
}

export async function speak(text: string, options?: { rate?: number; onEnd?: () => void }): Promise<void> {
  const rate = options?.rate ?? 0.85;
  const voiceId = await pickBestVoiceId();

  if (isSpeaking) {
    await Speech.stop();
    isSpeaking = false;
  }

  return new Promise((resolve) => {
    isSpeaking = true;
    Speech.speak(text, {
      rate,
      pitch: 1.05,
      voice: voiceId || undefined,
      onDone: () => {
        isSpeaking = false;
        options?.onEnd?.();
        resolve();
      },
      onError: () => {
        isSpeaking = false;
        resolve();
      },
    });
  });
}

export async function speakWord(word: string, voice?: VoiceOption, rate: number = 0.9): Promise<void> {
  return speak(word, { rate });
}

export function cancelSpeech(): void {
  Speech.stop();
  isSpeaking = false;
}

export function isVoiceAvailable(): boolean {
  return true; // Expo Speech is always available
}

// Speech Recognition
export interface RecognitionResult {
  transcript: string;
  confidence: number;
  isMatch: boolean;
}

export interface MultiWordMatch {
  word: string;
  index: number;
  transcript: string;
  confidence: number;
}

export function isSpeechRecognitionSupported(): boolean {
  return ExpoSpeechRecognition != null;
}

export async function requestSpeechPermission(): Promise<boolean> {
  if (!ExpoSpeechRecognition) return false;
  try {
    const result = await ExpoSpeechRecognition.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

/** Set up iOS audio session so recording can run alongside TTS without
 *  one killing the other. Must be called before each start(). No-op on Android. */
function configureIosAudioForRecognition() {
  if (!ExpoSpeechRecognition || Platform.OS !== 'ios') return;
  try {
    ExpoSpeechRecognition.setCategoryIOS?.({
      category: 'playAndRecord',
      categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
      mode: 'measurement',
    });
  } catch (e) {
    console.warn('[speech] setCategoryIOS failed', e);
  }
}

/** Stop any in-flight TTS so the recognizer doesn't pick up our own voice. */
async function quietTtsBeforeListening() {
  try {
    await Speech.stop();
  } catch {}
  isSpeaking = false;
}

export function startListening(
  targetWord: string,
  onMatch: (result: RecognitionResult) => void,
  onNoMatch: (result: RecognitionResult) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { stop: () => void; updateTargetWord: (newWord: string) => void } {
  if (!ExpoSpeechRecognition) {
    console.warn('[speech] startListening: native module not loaded');
    onError('Speech recognition not available on this device');
    onEnd();
    return { stop: () => {}, updateTargetWord: () => {} };
  }

  // Native module is present — verify recognition is actually available.
  try {
    if (typeof ExpoSpeechRecognition.isRecognitionAvailable === 'function') {
      const ok = ExpoSpeechRecognition.isRecognitionAvailable();
      if (!ok) {
        console.warn('[speech] isRecognitionAvailable -> false');
        onError('Speech recognition unavailable on this device');
        onEnd();
        return { stop: () => {}, updateTargetWord: () => {} };
      }
    }
  } catch (e) {
    console.warn('[speech] isRecognitionAvailable check threw', e);
  }

  let currentTarget = targetWord;
  let stopped = false;

  const handleResult = (event: any) => {
    if (stopped) return;
    // Correct shape: { isFinal: boolean, results: [{transcript, confidence}] }
    const results = event?.results;
    if (!Array.isArray(results) || results.length === 0) return;
    const top = results[0]; // best alternative
    const transcript: string = top?.transcript || '';
    const confidence: number = top?.confidence ?? 0;
    if (!transcript) return;

    const isMatch = checkWordMatch(transcript, currentTarget);
    const result: RecognitionResult = { transcript, confidence, isMatch };

    if (isMatch) {
      onMatch(result);
    } else if (event?.isFinal) {
      onNoMatch(result);
    }
  };

  configureIosAudioForRecognition();
  quietTtsBeforeListening();

  let resultSub: any, errorSub: any, endSub: any;
  try {
    // Subscribe FIRST, then start — otherwise we may miss the first event.
    resultSub = ExpoSpeechRecognition.addListener('result', handleResult);
    errorSub = ExpoSpeechRecognition.addListener('error', (e: any) => {
      console.warn('[speech] recognition error:', e?.error, e?.message);
      if (!stopped) onError(e?.error || e?.message || 'Recognition error');
    });
    endSub = ExpoSpeechRecognition.addListener('end', () => {
      if (!stopped) onEnd();
    });

    ExpoSpeechRecognition.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 3,
      continuous: false,
      requiresOnDeviceRecognition: false,
      contextualStrings: [targetWord],
      addsPunctuation: false,
    });

    return {
      stop: () => {
        stopped = true;
        try { ExpoSpeechRecognition.stop(); } catch {}
        resultSub?.remove?.();
        errorSub?.remove?.();
        endSub?.remove?.();
      },
      updateTargetWord: (newWord: string) => {
        currentTarget = newWord;
      },
    };
  } catch (err: any) {
    console.warn('[speech] start threw:', err);
    resultSub?.remove?.();
    errorSub?.remove?.();
    endSub?.remove?.();
    onError(err?.message || 'Failed to start recognition');
    onEnd();
    return { stop: () => {}, updateTargetWord: () => {} };
  }
}

export function startContinuousListening(
  targetWords: string[],
  onWordMatch: (match: MultiWordMatch) => void,
  onInterimResult: (transcript: string) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  onAllMatches?: (matches: MultiWordMatch[], markWordMatched: (wordIndex: number) => void) => void
): { stop: () => void; updateTargetWords: (words: string[]) => void } {
  if (!ExpoSpeechRecognition) {
    onError('Speech recognition not available');
    onEnd();
    return { stop: () => {}, updateTargetWords: () => {} };
  }

  let currentTargets = [...targetWords];
  let matchedIndices = new Set<number>();
  let stopped = false;

  const handleResult = (event: any) => {
    if (stopped) return;
    const results = event?.results;
    if (!Array.isArray(results) || results.length === 0) return;
    const top = results[0];
    const transcript: string = top?.transcript || '';
    const confidence: number = top?.confidence ?? 0;
    if (!transcript) return;

    onInterimResult(transcript);

    const allMatches: MultiWordMatch[] = [];
    const spoken = transcript.toLowerCase().split(/\s+/);

    currentTargets.forEach((word, index) => {
      if (matchedIndices.has(index)) return;
      for (const s of spoken) {
        if (checkWordMatch(s, word)) {
          allMatches.push({ word, index, transcript, confidence });
          break;
        }
      }
    });

    if (allMatches.length > 0 && onAllMatches) {
      onAllMatches(allMatches, (wordIndex: number) => {
        matchedIndices.add(wordIndex);
      });
    }

    for (const match of allMatches) {
      if (!matchedIndices.has(match.index)) {
        matchedIndices.add(match.index);
        onWordMatch(match);
      }
    }
  };

  configureIosAudioForRecognition();
  quietTtsBeforeListening();

  let resultSub: any, errorSub: any, endSub: any;
  try {
    resultSub = ExpoSpeechRecognition.addListener('result', handleResult);
    errorSub = ExpoSpeechRecognition.addListener('error', (e: any) => {
      console.warn('[speech] continuous error:', e?.error, e?.message);
      if (!stopped) onError(e?.error || e?.message || 'Recognition error');
    });
    endSub = ExpoSpeechRecognition.addListener('end', () => {
      if (stopped) return;
      // Auto-restart for continuous mode
      try {
        configureIosAudioForRecognition();
        ExpoSpeechRecognition.start({
          lang: 'en-US',
          interimResults: true,
          maxAlternatives: 3,
          continuous: true,
          requiresOnDeviceRecognition: false,
        });
      } catch (e) {
        console.warn('[speech] restart failed', e);
        onEnd();
      }
    });

    ExpoSpeechRecognition.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 3,
      continuous: true,
      requiresOnDeviceRecognition: false,
      contextualStrings: targetWords,
      addsPunctuation: false,
    });

    return {
      stop: () => {
        stopped = true;
        try { ExpoSpeechRecognition.stop(); } catch {}
        resultSub?.remove?.();
        errorSub?.remove?.();
        endSub?.remove?.();
      },
      updateTargetWords: (words: string[]) => {
        currentTargets = [...words];
        matchedIndices = new Set();
      },
    };
  } catch (err: any) {
    console.warn('[speech] continuous start threw:', err);
    resultSub?.remove?.();
    errorSub?.remove?.();
    endSub?.remove?.();
    onError(err?.message || 'Failed to start recognition');
    onEnd();
    return { stop: () => {}, updateTargetWords: () => {} };
  }
}

// Homophones map for fuzzy matching
const HOMOPHONES: string[][] = [
  ['sight', 'site', 'cite'],
  ['their', 'there', "they're"],
  ['to', 'too', 'two'],
  ['your', "you're"],
  ['its', "it's"],
  ['know', 'no'],
  ['knew', 'new'],
  ['knight', 'night'],
  ['knot', 'not'],
  ['write', 'right', 'rite'],
  ['read', 'red'],
  ['hear', 'here'],
  ['sea', 'see'],
  ['sun', 'son'],
  ['one', 'won'],
  ['be', 'bee'],
  ['by', 'buy', 'bye'],
  ['for', 'four', 'fore'],
  ['ate', 'eight'],
  ['wait', 'weight'],
];

const homophoneMap = new Map<string, Set<string>>();
for (const group of HOMOPHONES) {
  const lowerGroup = group.map(w => w.toLowerCase());
  for (const word of lowerGroup) {
    if (!homophoneMap.has(word)) {
      homophoneMap.set(word, new Set());
    }
    for (const other of lowerGroup) {
      if (other !== word) {
        homophoneMap.get(word)!.add(other);
      }
    }
  }
}

function areHomophones(word1: string, word2: string): boolean {
  const lower1 = word1.toLowerCase();
  const lower2 = word2.toLowerCase();
  if (lower1 === lower2) return true;
  const homophones = homophoneMap.get(lower1);
  return homophones ? homophones.has(lower2) : false;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function checkWordMatch(spoken: string, target: string): boolean {
  const cleanSpoken = spoken.replace(/[.,!?'"]/g, '').trim().toLowerCase();
  const cleanTarget = target.replace(/[.,!?'"]/g, '').trim().toLowerCase();

  if (cleanSpoken === cleanTarget) return true;
  if (areHomophones(cleanSpoken, cleanTarget)) return true;

  const spokenWords = cleanSpoken.split(/\s+/);
  if (spokenWords.includes(cleanTarget)) return true;

  for (const word of spokenWords) {
    if (areHomophones(word, cleanTarget)) return true;
  }

  const distance = levenshteinDistance(cleanSpoken, cleanTarget);
  const maxAllowedDistance = Math.max(1, Math.floor(cleanTarget.length * 0.35));
  if (distance <= maxAllowedDistance) return true;

  return false;
}

export function playSuccessSound(): void {
  // Would use expo-av for sound effects
}

export function unlockAudio(): void {
  // No-op for mobile
}
