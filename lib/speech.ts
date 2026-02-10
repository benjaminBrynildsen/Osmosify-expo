import * as Speech from 'expo-speech';

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

export async function speak(text: string, options?: { rate?: number; onEnd?: () => void }): Promise<void> {
  const rate = options?.rate ?? 0.85;

  if (isSpeaking) {
    await Speech.stop();
    isSpeaking = false;
  }

  return new Promise((resolve) => {
    isSpeaking = true;
    Speech.speak(text, {
      rate,
      pitch: 1.0,
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

export function startListening(
  targetWord: string,
  onMatch: (result: RecognitionResult) => void,
  onNoMatch: (result: RecognitionResult) => void,
  onError: (error: string) => void,
  onEnd: () => void
): { stop: () => void; updateTargetWord: (newWord: string) => void } {
  if (!ExpoSpeechRecognition) {
    onError('Speech recognition not available');
    onEnd();
    return { stop: () => {}, updateTargetWord: () => {} };
  }

  let currentTarget = targetWord;
  let stopped = false;

  const handleResult = (event: any) => {
    if (stopped) return;
    const results = event.results;
    if (!results || results.length === 0) return;

    const lastResult = results[results.length - 1];
    if (!lastResult || lastResult.length === 0) return;

    const transcript = lastResult[0].transcript || '';
    const confidence = lastResult[0].confidence || 0;
    const isMatch = checkWordMatch(transcript, currentTarget);

    const result: RecognitionResult = { transcript, confidence, isMatch };

    if (isMatch) {
      onMatch(result);
    } else if (lastResult.isFinal) {
      onNoMatch(result);
    }
  };

  try {
    ExpoSpeechRecognition.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 3,
      continuous: false,
    });

    // Set up event listeners via the native module
    const resultSub = ExpoSpeechRecognition.addListener('result', handleResult);
    const errorSub = ExpoSpeechRecognition.addListener('error', (e: any) => {
      if (!stopped) onError(e.error || 'Recognition error');
    });
    const endSub = ExpoSpeechRecognition.addListener('end', () => {
      if (!stopped) onEnd();
    });

    return {
      stop: () => {
        stopped = true;
        try {
          ExpoSpeechRecognition.stop();
        } catch {}
        resultSub?.remove?.();
        errorSub?.remove?.();
        endSub?.remove?.();
      },
      updateTargetWord: (newWord: string) => {
        currentTarget = newWord;
      },
    };
  } catch (err: any) {
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
    const results = event.results;
    if (!results || results.length === 0) return;

    const lastResult = results[results.length - 1];
    if (!lastResult || lastResult.length === 0) return;

    const transcript = lastResult[0].transcript || '';
    const confidence = lastResult[0].confidence || 0;

    onInterimResult(transcript);

    const allMatches: MultiWordMatch[] = [];
    const spoken = transcript.toLowerCase().split(/\s+/);

    currentTargets.forEach((word, index) => {
      if (matchedIndices.has(index)) return;
      for (const s of spoken) {
        if (checkWordMatch(s, word)) {
          const match: MultiWordMatch = { word, index, transcript, confidence };
          allMatches.push(match);
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

  try {
    ExpoSpeechRecognition.start({
      lang: 'en-US',
      interimResults: true,
      maxAlternatives: 3,
      continuous: true,
    });

    const resultSub = ExpoSpeechRecognition.addListener('result', handleResult);
    const errorSub = ExpoSpeechRecognition.addListener('error', (e: any) => {
      if (!stopped) onError(e.error || 'Recognition error');
    });
    const endSub = ExpoSpeechRecognition.addListener('end', () => {
      if (!stopped) {
        // Restart continuous listening
        try {
          ExpoSpeechRecognition.start({
            lang: 'en-US',
            interimResults: true,
            maxAlternatives: 3,
            continuous: true,
          });
        } catch {
          onEnd();
        }
      }
    });

    return {
      stop: () => {
        stopped = true;
        try {
          ExpoSpeechRecognition.stop();
        } catch {}
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
