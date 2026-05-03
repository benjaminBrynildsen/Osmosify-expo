import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import { getTheme, GameTheme } from '../../../lib/themes';
import {
  speakWord,
  startContinuousListening,
  isSpeechRecognitionSupported,
  requestSpeechPermission,
} from '../../../lib/speech';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedLava } from '../../../components/lava/AnimatedLava';
import { Embers } from '../../../components/lava/Embers';
import { Creature as AnimatedCreature } from '../../../components/lava/Creature';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_HEIGHT = SCREEN_HEIGHT - 220;

interface Creature {
  id: number;
  word: string;
  x: number;
  y: number;
  speed: number;
  saved: boolean;
}

interface WordProgress {
  word: string;
  correctSaves: number;
  cleared: boolean;
}

export default function LavaLettersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const child = children.find(c => c.id === id);
  const childWords = useMemo(() => 
    words.filter(w => w.childId === id).map(w => w.word),
    [words, id]
  );
  
  const gameTheme = useMemo(() => 
    getTheme(child?.theme),
    [child?.theme]
  );
  
  const masteryThreshold = child?.masteryThreshold || 4;
  const deckSize = child?.deckSize || 4;
  
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameover' | 'victory'>('ready');
  const [lives, setLives] = useState(3);
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [wordProgress, setWordProgress] = useState<Map<string, WordProgress>>(new Map());
  const [savedCount, setSavedCount] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  
  const animationRef = useRef<number>();
  const creatureIdRef = useRef(0);
  const listenerRef = useRef<{ stop: () => void; updateTargetWords: (w: string[]) => void } | null>(null);
  const creaturesRef = useRef<Creature[]>([]);
  const handleSaveCreatureRef = useRef<(c: Creature) => void>(() => {});

  // Track the latest creatures + save handler so the listener callback
  // can reach them without recreating the listener on every state change
  useEffect(() => {
    creaturesRef.current = creatures;
  }, [creatures]);
  
  const playableWords = useMemo(() => {
    return childWords
      .filter(w => w.length >= 2 && w.length <= 12)
      .slice(0, deckSize);
  }, [childWords, deckSize]);
  
  const unclearedWords = useMemo(() => {
    return playableWords.filter(word => {
      const progress = wordProgress.get(word);
      return !progress?.cleared;
    });
  }, [playableWords, wordProgress]);
  
  const spawnCreature = useCallback(() => {
    if (unclearedWords.length === 0) return;
    
    const activeWords = new Set(creatures.filter(c => !c.saved).map(c => c.word));
    const availableWords = unclearedWords.filter(w => !activeWords.has(w));
    
    if (availableWords.length === 0) return;
    
    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    const size = 80 + randomWord.length * 4;
    const x = Math.random() * (SCREEN_WIDTH - size - 20) + 10;
    
    const baseSpeed = 0.8 + Math.random() * 0.4;
    
    const newCreature: Creature = {
      id: creatureIdRef.current++,
      word: randomWord,
      x,
      y: -100,
      speed: baseSpeed * speedMultiplier,
      saved: false,
    };
    
    setCreatures(prev => [...prev, newCreature]);
  }, [unclearedWords, creatures, speedMultiplier]);
  
  const handleSaveCreature = useCallback((creature: Creature) => {
    if (creature.saved) return;
    
    setCreatures(prev => prev.map(c => 
      c.id === creature.id ? { ...c, saved: true } : c
    ));
    
    setTimeout(() => {
      setCreatures(prev => prev.filter(c => c.id !== creature.id));
    }, 500);
    
    setSavedCount(s => {
      const newCount = s + 1;
      if (newCount % 4 === 0) {
        setSpeedMultiplier(m => Math.min(m + 0.1, 2.5));
      }
      return newCount;
    });
    
    setWordProgress(wp => {
      const newProgress = new Map(wp);
      const current = newProgress.get(creature.word) || {
        word: creature.word,
        correctSaves: 0,
        cleared: false
      };
      const newSaves = current.correctSaves + 1;
      const cleared = newSaves >= masteryThreshold;
      newProgress.set(creature.word, { ...current, correctSaves: newSaves, cleared });
      return newProgress;
    });
  }, [masteryThreshold]);

  // Keep a ref to the latest save handler so the speech listener can
  // call it without being torn down on every state change.
  useEffect(() => {
    handleSaveCreatureRef.current = handleSaveCreature;
  }, [handleSaveCreature]);

  const [speechReady, setSpeechReady] = useState(false);

  // Continuous speech listener — when the kid says a creature's word,
  // save that creature. Replaces the tap-to-save mechanic. If speech
  // recognition is unavailable, fall back to tap-to-save below.
  useEffect(() => {
    if (gameState !== 'playing') {
      listenerRef.current?.stop();
      listenerRef.current = null;
      setSpeechReady(false);
      return;
    }
    if (!isSpeechRecognitionSupported()) {
      console.log('[lava] speech recognition NOT supported — tap fallback enabled');
      return;
    }
    let cancelled = false;
    requestSpeechPermission().then((granted) => {
      console.log('[lava] mic permission granted:', granted);
      if (!granted || cancelled) return;
      const onScreenWords = creaturesRef.current.filter((c) => !c.saved).map((c) => c.word);
      console.log('[lava] starting continuous listener for', onScreenWords);
      listenerRef.current = startContinuousListening(
        onScreenWords,
        (match) => {
          console.log('[lava] match!', match.word, match.transcript);
          const candidates = creaturesRef.current
            .filter((c) => !c.saved && c.word.toLowerCase() === match.word.toLowerCase())
            .sort((a, b) => b.y - a.y);
          if (candidates[0]) handleSaveCreatureRef.current(candidates[0]);
        },
        () => {},
        (err) => console.warn('[lava] listener error:', err),
        () => {},
      );
      setSpeechReady(true);
    });
    return () => {
      cancelled = true;
      listenerRef.current?.stop();
      listenerRef.current = null;
      setSpeechReady(false);
    };
  }, [gameState]);

  // Update the listener's target list as creatures spawn / get saved
  useEffect(() => {
    if (!listenerRef.current) return;
    const onScreenWords = creatures.filter((c) => !c.saved).map((c) => c.word);
    listenerRef.current.updateTargetWords(onScreenWords);
  }, [creatures]);
  
  const startGame = useCallback(() => {
    setGameState('playing');
    setLives(3);
    setCreatures([]);
    setSavedCount(0);
    setSpeedMultiplier(1);
    
    const initialProgress = new Map<string, WordProgress>();
    playableWords.forEach(word => {
      initialProgress.set(word, { word, correctSaves: 0, cleared: false });
    });
    setWordProgress(initialProgress);
  }, [playableWords]);
  
  const togglePause = useCallback(() => {
    setGameState(prev => prev === 'playing' ? 'paused' : 'playing');
  }, []);
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }
    
    let lastSpawnTime = Date.now();
    const spawnInterval = 3000;
    
    const animate = () => {
      const now = Date.now();
      if (now - lastSpawnTime > spawnInterval && unclearedWords.length > 0) {
        spawnCreature();
        lastSpawnTime = now;
      }
      
      setCreatures(prev => {
        const updated = prev.map(creature => ({
          ...creature,
          y: creature.saved ? creature.y : creature.y + creature.speed,
        }));
        
        const hitLava = updated.filter(c => !c.saved && c.y > GAME_HEIGHT - 80);
        if (hitLava.length > 0) {
          setLives(l => {
            const newLives = Math.max(0, l - hitLava.length);
            if (newLives <= 0) {
              setGameState('gameover');
            }
            return newLives;
          });
        }
        
        return updated.filter(c => c.saved || c.y <= GAME_HEIGHT - 80);
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    spawnCreature();
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, spawnCreature, unclearedWords.length]);
  
  // Check for victory
  useEffect(() => {
    if (gameState === 'playing' && unclearedWords.length === 0 && playableWords.length > 0) {
      setGameState('victory');
    }
  }, [gameState, unclearedWords.length, playableWords.length]);
  
  if (playableWords.length < 2) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.onSurface }]}>Lava Letters</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="flame" size={64} color={colors.onSurfaceVariant} />
          <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>Not Enough Words</Text>
          <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
            You need at least 2 words to play Lava Letters.
          </Text>
          <TouchableOpacity 
            style={[styles.goBackButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.goBackText, { color: colors.onPrimary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: gameTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.livesContainer}>
          {[0, 1, 2].map(i => (
            <Ionicons
              key={i}
              name="heart"
              size={28}
              color={i < lives ? '#ef4444' : '#374151'}
              style={styles.heart}
            />
          ))}
        </View>
        
        <View style={[styles.savedBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Text style={styles.savedText}>Saved: {savedCount}</Text>
        </View>
        
        {(gameState === 'playing' || gameState === 'paused') && (
          <TouchableOpacity onPress={togglePause} style={styles.pauseButton}>
            <Ionicons 
              name={gameState === 'paused' ? 'play' : 'pause'} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Ready Screen */}
        {gameState === 'ready' && (
          <View style={styles.readyScreen}>
            <Ionicons name="flame" size={80} color={gameTheme.accentColor} />
            <Text style={[styles.readyTitle, { color: gameTheme.textColor }]}>
              {gameTheme.name} Letters
            </Text>
            <Text style={[styles.readyDescription, { color: gameTheme.textColor, opacity: 0.7 }]}>
              Say each word out loud to save the creature before it falls into the lava!
            </Text>
            
            <View style={styles.wordList}>
              {playableWords.map((word, i) => (
                <View key={i} style={[styles.wordBadge, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                  <Text style={{ color: gameTheme.textColor }}>{word}</Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity 
              style={[styles.startButton, { backgroundColor: gameTheme.creatureGradient }]}
              onPress={startGame}
            >
              <Ionicons name="play" size={24} color="white" />
              <Text style={styles.startButtonText}>Start Game</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Paused Screen */}
        {gameState === 'paused' && (
          <View style={[styles.pauseOverlay, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <Ionicons name="pause-circle" size={64} color="white" />
            <Text style={styles.pauseText}>Paused</Text>
            <TouchableOpacity 
              style={[styles.resumeButton, { backgroundColor: gameTheme.creatureGradient }]}
              onPress={togglePause}
            >
              <Text style={styles.resumeText}>Resume</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Game Over / Victory Screen */}
        {(gameState === 'gameover' || gameState === 'victory') && (
          <View style={[styles.gameOverScreen, { backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <Ionicons 
              name={gameState === 'victory' ? 'trophy' : 'flame'} 
              size={64} 
              color={gameState === 'victory' ? '#fbbf24' : gameTheme.accentColor} 
            />
            <Text style={styles.gameOverTitle}>
              {gameState === 'victory' ? 'Victory!' : 'Game Over'}
            </Text>
            <Text style={styles.gameOverSubtitle}>
              {gameState === 'victory' 
                ? 'You saved all the creatures!' 
                : `You saved ${savedCount} creatures!`}
            </Text>
            
            <View style={styles.gameOverButtons}>
              <TouchableOpacity 
                style={[styles.exitButton, { borderColor: 'rgba(255,255,255,0.3)' }]}
                onPress={() => router.back()}
              >
                <Text style={styles.exitText}>Exit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.playAgainButton, { backgroundColor: gameTheme.creatureGradient }]}
                onPress={startGame}
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.playAgainText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Creatures — saved by speaking the word, not tapping */}
        {gameState === 'playing' && creatures.map(creature => {
          const size = 80 + creature.word.length * 4;
          const inDanger = !creature.saved && creature.y > GAME_HEIGHT - 220;
          return (
            <View
              key={creature.id}
              style={[styles.creature, { left: creature.x, top: creature.y, width: size, height: size }]}
              pointerEvents="none"
            >
              <AnimatedCreature
                word={creature.word}
                saved={creature.saved}
                size={size}
                bg={gameTheme.creatureGradient}
                bgSaved={gameTheme.creatureSavedColor}
                inDanger={inDanger}
              />
            </View>
          );
        })}

        {/* Animated Lava Zone */}
        {gameState === 'playing' && (
          <>
            <Embers bottomOffset={70} count={8} />
            <AnimatedLava height={90} />
          </>
        )}
      </View>
      
      {/* Word Progress */}
      {gameState === 'playing' && (
        <View style={[styles.progressBar, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={styles.wordProgressList}>
            {playableWords.map((word, i) => {
              const progress = wordProgress.get(word);
              const cleared = progress?.cleared;
              const saves = progress?.correctSaves || 0;
              
              return (
                <View 
                  key={i} 
                  style={[
                    styles.progressBadge,
                    { 
                      backgroundColor: cleared ? '#22c55e' : 'transparent',
                      borderColor: 'rgba(255,255,255,0.3)',
                      borderWidth: cleared ? 0 : 1,
                    }
                  ]}
                >
                  <Text style={{ color: cleared ? 'white' : 'rgba(255,255,255,0.8)', fontSize: 12 }}>
                    {word} {cleared ? '' : `${saves}/${masteryThreshold}`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
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
    padding: 12,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  livesContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  heart: {
    marginHorizontal: -2,
  },
  savedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 'auto',
    marginRight: 12,
  },
  savedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  pauseButton: {
    padding: 8,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  readyScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  readyTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
  },
  readyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  wordList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  wordBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  gameOverScreen: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    marginTop: 16,
  },
  gameOverSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    marginBottom: 32,
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  exitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  exitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  playAgainText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  creature: {
    position: 'absolute',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  creatureText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  savedStar: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  lavaZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    opacity: 0.8,
  },
  lavaWave: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.2)',
    opacity: 0.5,
  },
  progressBar: {
    padding: 12,
  },
  wordProgressList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
    marginBottom: 24,
  },
  goBackButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  goBackText: {
    fontSize: 16,
    fontWeight: '600',
  },
});