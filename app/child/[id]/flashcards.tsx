import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import {
  speakWord,
  cancelSpeech,
  isSpeechRecognitionSupported,
  requestSpeechPermission,
  startListening,
} from '../../../lib/speech';
import { Ionicons } from '@expo/vector-icons';
import type { Word } from '../../../types';

interface WordProgress {
  word: Word;
  sessionCorrectCount: number;
  totalAttempts: number;
}

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words, updateWord } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const child = children.find(c => c.id === id);
  const childWords = useMemo(() => 
    words.filter(w => w.childId === id && (w.status === 'new' || w.status === 'learning')),
    [words, id]
  );
  
  const masteryThreshold = child?.masteryThreshold || 4;
  const timerSeconds = child?.timerSeconds || 7;
  
  const [wordProgress, setWordProgress] = useState<Map<string, WordProgress>>(new Map());
  const [queue, setQueue] = useState<string[]>([]);
  const [masteredIds, setMasteredIds] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [isPaused, setIsPaused] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [transcript, setTranscript] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const listenerRef = useRef<{ stop: () => void; updateTargetWord: (w: string) => void } | null>(null);
  
  // Initialize session
  useEffect(() => {
    if (childWords.length === 0) return;
    
    const progress = new Map<string, WordProgress>();
    childWords.forEach(word => {
      progress.set(word.id, {
        word,
        sessionCorrectCount: 0,
        totalAttempts: 0,
      });
    });
    setWordProgress(progress);
    
    const shuffledIds = childWords.map(w => w.id).sort(() => Math.random() - 0.5);
    setQueue(shuffledIds);
    setTimeLeft(timerSeconds);
  }, [childWords, timerSeconds]);
  
  const currentWordId = queue[0];
  const currentProgress = currentWordId ? wordProgress.get(currentWordId) : null;
  const currentWord = currentProgress?.word;
  
  // Timer effect
  useEffect(() => {
    if (!currentWord || showFeedback || isComplete || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentWord, showFeedback, isComplete, isPaused, timerSeconds]);
  
  // Speak word when it changes
  useEffect(() => {
    if (currentWord && !showFeedback && !isComplete) {
      speakWord(currentWord.word, child?.voicePreference);
    }
  }, [currentWord, showFeedback, isComplete]);
  
  // Check speech recognition availability
  useEffect(() => {
    if (isSpeechRecognitionSupported()) {
      requestSpeechPermission().then(granted => {
        setSpeechAvailable(granted);
      });
    }
  }, []);

  // Stop listening when word changes or feedback shown
  useEffect(() => {
    if (showFeedback || isComplete) {
      listenerRef.current?.stop();
      listenerRef.current = null;
      setIsListening(false);
      setTranscript('');
    }
  }, [showFeedback, isComplete]);

  // Clean up listener on unmount
  useEffect(() => {
    return () => {
      listenerRef.current?.stop();
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!currentWord || showFeedback) return;

    if (isListening) {
      listenerRef.current?.stop();
      listenerRef.current = null;
      setIsListening(false);
      setTranscript('');
      return;
    }

    setIsListening(true);
    setTranscript('');

    listenerRef.current = startListening(
      currentWord.word,
      (result) => {
        // Match found - mark correct
        setTranscript(result.transcript);
        listenerRef.current?.stop();
        listenerRef.current = null;
        setIsListening(false);
        handleAnswer(true);
      },
      (result) => {
        // No match on final result
        setTranscript(result.transcript);
        listenerRef.current?.stop();
        listenerRef.current = null;
        setIsListening(false);
      },
      () => {
        // Error
        setIsListening(false);
        listenerRef.current = null;
      },
      () => {
        // End
        setIsListening(false);
        listenerRef.current = null;
      }
    );
  }, [currentWord, isListening, showFeedback]);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    if (!currentWordId || !currentProgress) return;
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setShowFeedback(isCorrect ? 'correct' : 'incorrect');
    
    // Animate card
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: isCorrect ? -300 : 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
    
    const updatedProgress = new Map(wordProgress);
    const updatedWordProg = { ...currentProgress };
    updatedWordProg.totalAttempts++;
    
    if (isCorrect) {
      updatedWordProg.sessionCorrectCount++;
    }
    
    updatedProgress.set(currentWordId, updatedWordProg);
    setWordProgress(updatedProgress);
    
    // Update word in storage
    const word = updatedWordProg.word;
    if (isCorrect) {
      word.masteryCorrectCount++;
      if (word.masteryCorrectCount >= masteryThreshold) {
        word.status = 'mastered';
      } else if (word.status === 'new') {
        word.status = 'learning';
      }
    } else if (child?.demoteOnMiss && word.status === 'mastered') {
      word.status = 'learning';
    }
    word.lastTested = new Date().toISOString();
    updateWord(word);
    
    setTimeout(() => {
      setShowFeedback(null);
      setTimeLeft(timerSeconds);
      
      const newQueue = [...queue];
      newQueue.shift();
      
      const wordJustMastered = updatedWordProg.sessionCorrectCount >= masteryThreshold;
      
      if (wordJustMastered) {
        const newMasteredIds = [...masteredIds, currentWordId];
        setMasteredIds(newMasteredIds);
        
        if (newMasteredIds.length >= childWords.length) {
          setIsComplete(true);
        } else if (newQueue.length === 0) {
          // Reshuffle remaining
          const remaining = childWords
            .filter(w => !newMasteredIds.includes(w.id))
            .map(w => w.id)
            .sort(() => Math.random() - 0.5);
          setQueue(remaining);
        } else {
          setQueue(newQueue.filter(id => id !== currentWordId));
        }
      } else {
        // Put word back in queue with delay
        if (newQueue.length === 0) {
          newQueue.push(currentWordId);
        } else {
          // Insert at position 3 or end
          const insertPos = Math.min(newQueue.length, 3);
          newQueue.splice(insertPos, 0, currentWordId);
        }
        setQueue(newQueue);
      }
    }, isCorrect ? 800 : 1500);
  }, [currentWordId, currentProgress, wordProgress, queue, masteredIds, childWords.length, masteryThreshold, child?.demoteOnMiss, timerSeconds, updateWord]);
  
  const handleRestart = () => {
    setIsComplete(false);
    setMasteredIds([]);
    setShowFeedback(null);
    const shuffledIds = childWords.map(w => w.id).sort(() => Math.random() - 0.5);
    setQueue(shuffledIds);
    setTimeLeft(timerSeconds);
  };
  
  if (childWords.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Flashcards</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={64} color={colors.onSurfaceVariant} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No words to practice</Text>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            All words have been mastered! Use Review to practice previously learned words.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (isComplete) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.completeContainer, { backgroundColor: colors.background }]}>
          <View style={styles.starsContainer}>
            <Ionicons name="star" size={40} color="#fbbf24" />
            <Ionicons name="star" size={56} color="#fbbf24" style={styles.centerStar} />
            <Ionicons name="star" size={40} color="#fbbf24" />
          </View>
          <Text style={[styles.completeScore, { color: colors.primary }]}>
            {masteredIds.length} / {childWords.length}
          </Text>
          <Text style={[styles.completeTitle, { color: colors.onSurface }]}>Words Unlocked!</Text>
          <TouchableOpacity 
            style={[styles.restartButton, { backgroundColor: colors.primary }]}
            onPress={handleRestart}
          >
            <Ionicons name="refresh" size={20} color={colors.onPrimary} />
            <Text style={[styles.restartText, { color: colors.onPrimary }]}>Continue Practicing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!currentWord) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }
  
  const progressPercent = (masteredIds.length / childWords.length) * 100;
  const timerPercent = (timeLeft / timerSeconds) * 100;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.progressText, { color: colors.onSurfaceVariant }]}>
            Word {masteredIds.length + 1} of {childWords.length}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.surfaceVariant }]}>
            <View style={[styles.progressFill, { 
              backgroundColor: colors.primary, 
              width: `${progressPercent}%` 
            }]} />
          </View>
        </View>
        <TouchableOpacity 
          style={styles.pauseButton}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
      
      {/* Timer */}
      <View style={styles.timerContainer}>
        <View style={[styles.timerBadge, { 
          backgroundColor: timeLeft <= 2 ? '#fee2e2' : timeLeft <= 3 ? '#fef3c7' : colors.surface 
        }]}>
          <Text style={[styles.timerText, { 
            color: timeLeft <= 2 ? '#dc2626' : timeLeft <= 3 ? '#d97706' : colors.onSurface 
            }]}>
            {timeLeft}s
          </Text>
        </View>
        <View style={[styles.timerBar, { backgroundColor: colors.surfaceVariant }]}>
          <View style={[styles.timerFill, { 
            backgroundColor: timeLeft <= 2 ? '#dc2626' : timeLeft <= 3 ? '#d97706' : colors.primary,
            width: `${timerPercent}%` 
          }]} />
        </View>
      </View>
      
      {/* Card */}
      <View style={styles.cardContainer}>
        <Animated.View style={[
          styles.card,
          { 
            backgroundColor: showFeedback === 'correct' ? '#22c55e' : 
                            showFeedback === 'incorrect' ? '#f59e0b' : colors.surface,
            transform: [{ translateX: slideAnim }]
          }
        ]}>
          {showFeedback === 'correct' && (
            <View style={styles.starsOverlay}>
              <Ionicons name="star" size={32} color="#fef08a" style={{ position: 'absolute', top: 10, left: 20 }} />
              <Ionicons name="star" size={24} color="#fef08a" style={{ position: 'absolute', top: 30, right: 30 }} />
              <Ionicons name="star" size={28} color="#fef08a" style={{ position: 'absolute', bottom: 40, left: 30 }} />
              <Ionicons name="star" size={20} color="#fef08a" style={{ position: 'absolute', bottom: 60, right: 20 }} />
            </View>
          )}
          
          <Text style={[
            styles.wordText,
            { color: showFeedback ? '#ffffff' : colors.onSurface }
          ]}>
            {currentWord.word}
          </Text>
          
          {showFeedback === 'incorrect' && (
            <Text style={styles.tryAgainText}>Try again!</Text>
          )}
          
          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            {Array.from({ length: masteryThreshold }).map((_, i) => (
              <View 
                key={i}
                style={[
                  styles.dot,
                  { 
                    backgroundColor: i < currentProgress.sessionCorrectCount 
                      ? showFeedback === 'correct' ? '#fef08a' : colors.primary
                      : showFeedback === 'correct' ? 'rgba(255,255,255,0.3)' : colors.surfaceVariant
                  }
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </View>
      
      {/* Pause Overlay */}
      {isPaused && (
        <View style={[styles.pauseOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <Ionicons name="pause-circle" size={64} color="white" />
          <Text style={styles.pauseText}>Paused</Text>
          <TouchableOpacity 
            style={[styles.resumeButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsPaused(false)}
          >
            <Text style={[styles.resumeText, { color: colors.onPrimary }]}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Mic Button */}
      {speechAvailable && (
        <View style={styles.micContainer}>
          <TouchableOpacity
            style={[
              styles.micButton,
              {
                backgroundColor: isListening ? '#ef4444' : colors.primary,
              }
            ]}
            onPress={toggleListening}
            disabled={showFeedback !== null}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={32}
              color="white"
            />
          </TouchableOpacity>
          <Text style={[styles.micLabel, { color: colors.onSurfaceVariant }]}>
            {isListening ? (transcript || 'Listening...') : 'Tap to speak'}
          </Text>
        </View>
      )}

      {/* Instructions */}
      <Text style={[styles.instructions, { color: colors.onSurfaceVariant }]}>
        {speechAvailable ? 'Speak the word or tap a button' : 'Tap a button below'}
      </Text>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.incorrectButton, { borderColor: colors.error }]}
          onPress={() => handleAnswer(false)}
          disabled={showFeedback !== null}
        >
          <Ionicons name="close" size={28} color={colors.error} />
          <Text style={[styles.actionButtonText, { color: colors.error }]}>Incorrect</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.correctButton, { backgroundColor: '#22c55e' }]}
          onPress={() => handleAnswer(true)}
          disabled={showFeedback !== null}
        >
          <Ionicons name="checkmark" size={28} color="#ffffff" />
          <Text style={[styles.actionButtonText, { color: '#ffffff' }]}>Correct</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 16,
  },
  progressText: {
    fontSize: 13,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  pauseButton: {
    padding: 8,
    marginRight: -8,
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  timerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timerBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    aspectRatio: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  starsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  wordText: {
    fontSize: 48,
    fontWeight: '700',
  },
  tryAgainText: {
    position: 'absolute',
    top: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  pauseText: {
    fontSize: 24,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
    marginBottom: 24,
  },
  resumeButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  resumeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  micContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  micLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  instructions: {
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 0,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  incorrectButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  correctButton: {
    borderWidth: 0,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  centerStar: {
    marginHorizontal: 8,
  },
  completeScore: {
    fontSize: 56,
    fontWeight: '700',
    marginBottom: 8,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  restartText: {
    fontSize: 16,
    fontWeight: '600',
  },
});