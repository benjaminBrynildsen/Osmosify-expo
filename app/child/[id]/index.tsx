import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import type { Word } from '../../../types';

interface StatBlockProps {
  value: string | number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function StatBlock({ value, label, icon }: StatBlockProps) {
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  return (
    <View style={[styles.statBlock, { backgroundColor: colors.surface }]}>
      <Ionicons name={icon} size={20} color={colors.primary} style={styles.statIcon} />
      <Text style={[styles.statValue, { color: colors.onSurface }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.onSurfaceVariant }]}>{label}</Text>
    </View>
  );
}

interface ActionButtonProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent1' | 'accent2';
  disabled?: boolean;
  badge?: string;
}

function ActionButton({ title, icon, onPress, variant = 'secondary', disabled, badge }: ActionButtonProps) {
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'accent1':
        return theme === 'dark' ? 'rgba(147, 51, 234, 0.2)' : 'rgba(147, 51, 234, 0.1)';
      case 'accent2':
        return theme === 'dark' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(244, 63, 94, 0.1)';
      default:
        return colors.surface;
    }
  };
  
  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.onPrimary;
      case 'accent1':
        return '#9333ea';
      case 'accent2':
        return '#e11d48';
      default:
        return colors.onSurface;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
        return colors.onPrimary;
      case 'accent1':
        return '#9333ea';
      case 'accent2':
        return '#e11d48';
      default:
        return colors.primary;
    }
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        { 
          backgroundColor: getBackgroundColor(),
          opacity: disabled ? 0.5 : 1,
        }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name={icon} size={24} color={getIconColor()} />
      <Text style={[styles.actionButtonText, { color: getTextColor() }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function ChildDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words, sessions, loading, selectChild } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const child = children.find(c => c.id === id);
  
  const childWords = useMemo(() => 
    words.filter(w => w.childId === id),
    [words, id]
  );
  
  const childSessions = useMemo(() => 
    sessions.filter(s => s.childId === id).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [sessions, id]
  );
  
  const newWords = childWords.filter(w => w.status === 'new');
  const learningWords = childWords.filter(w => w.status === 'learning');
  const masteredWords = childWords.filter(w => w.status === 'mastered');
  
  const lastSession = childSessions[0];
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  
  if (!child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.onSurface }]}>Child not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  selectChild(child);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{child.name}</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push(`/child/${id}/settings`)}
        >
          <Ionicons name="settings-outline" size={24} color={colors.onSurface} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBlock value={childWords.length} label="Words" icon="book-outline" />
          <StatBlock value={masteredWords.length} label="Mastered" icon="trophy-outline" />
          <StatBlock value={child.gradeLevel || 'Pre-K'} label="Grade" icon="school-outline" />
          <StatBlock value={child.sentencesRead} label="Sentences" icon="chatbubble-outline" />
        </View>
        
        {/* Jump Back In */}
        {lastSession && (
          <TouchableOpacity 
            style={[styles.jumpBackCard, { backgroundColor: colors.primaryContainer }]}
            onPress={() => router.push(`/child/${id}/word-pop`)}
          >
            <View style={styles.jumpBackIcon}>
              <Ionicons name="play" size={20} color={colors.onPrimary} />
            </View>
            <View style={styles.jumpBackContent}>
              <Text style={[styles.jumpBackLabel, { color: colors.primary }]}>Jump Back In</Text>
              <Text style={[styles.jumpBackTitle, { color: colors.onSurface }]}>
                {lastSession.bookTitle || 'Continue Reading'}
              </Text>
              <Text style={[styles.jumpBackSubtitle, { color: colors.onSurfaceVariant }]}>
                Continue where you left off
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
        
        {/* Action Buttons Grid */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionRow}>
            <ActionButton
              title="Flashcards"
              icon="sparkles"
              onPress={() => router.push(`/child/${id}/flashcards`)}
              variant="secondary"
              disabled={newWords.length + learningWords.length === 0}
            />
            <ActionButton
              title="Books"
              icon="library"
              onPress={() => router.push(`/child/${id}/books`)}
              variant="secondary"
            />
          </View>
          
          <View style={styles.actionRow}>
            <ActionButton
              title="Word Pop"
              icon="game-controller"
              onPress={() => router.push(`/child/${id}/word-pop`)}
              variant="accent1"
              disabled={childWords.length < 4}
            />
            <ActionButton
              title="My Library"
              icon="heart"
              onPress={() => router.push(`/child/${id}/library`)}
              variant="accent2"
            />
          </View>
          
          <View style={styles.actionRow}>
            <ActionButton
              title="Upload"
              icon="camera"
              onPress={() => router.push(`/child/${id}/upload`)}
              variant="primary"
            />
            <ActionButton
              title="Word Lists"
              icon="list"
              onPress={() => router.push(`/child/${id}/library`)}
              variant="secondary"
            />
          </View>
          
          <View style={styles.actionRow}>
            <ActionButton
              title="Lava Letters"
              icon="flame"
              onPress={() => router.push(`/child/${id}/lava-letters`)}
              variant="accent2"
              disabled={childWords.length < 2}
              badge="NEW"
            />
            <ActionButton
              title="Review"
              icon="refresh"
              onPress={() => router.push(`/child/${id}/flashcards`)}
              variant="secondary"
              disabled={masteredWords.length + learningWords.length === 0}
            />
          </View>
        </View>
        
        {/* Words Ready to Unlock */}
        {newWords.length > 0 && (
          <View style={[styles.wordsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.wordsCardHeader}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.wordsCardTitle, { color: colors.onSurface }]}>
                Words Ready to Unlock
              </Text>
            </View>
            <View style={styles.wordsList}>
              {newWords.slice(0, 10).map((word) => (
                <View 
                  key={word.id}
                  style={[styles.wordChip, { backgroundColor: colors.primaryContainer }]}
                >
                  <Text style={[styles.wordChipText, { color: colors.primary }]}>
                    {word.word}
                  </Text>
                </View>
              ))}
              {newWords.length > 10 && (
                <Text style={[styles.moreWords, { color: colors.onSurfaceVariant }]}>
                  +{newWords.length - 10} more
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.practiceButton}
              onPress={() => router.push(`/child/${id}/flashcards`)}
            >
              <Ionicons name="trending-up" size={14} color={colors.primary} />
              <Text style={[styles.practiceButtonText, { color: colors.primary }]}>
                Start unlocking these words
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Recent Sessions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Recent Sessions</Text>
            {childSessions.length > 5 && (
              <TouchableOpacity>
                <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {childSessions.slice(0, 5).map((session) => (
            <View 
              key={session.id}
              style={[styles.sessionCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.sessionIcon}>
                <Ionicons name="book" size={20} color={colors.primary} />
              </View>
              <View style={styles.sessionContent}>
                <Text style={[styles.sessionTitle, { color: colors.onSurface }]}>
                  {session.bookTitle || 'Reading Session'}
                </Text>
                <Text style={[styles.sessionSubtitle, { color: colors.onSurfaceVariant }]}>
                  {session.newWordsCount} new words • {new Date(session.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
          
          {childSessions.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="book-outline" size={32} color={colors.onSurfaceVariant} />
              <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No sessions yet</Text>
              <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
                Upload pages from a book to start tracking vocabulary.
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
    marginRight: -8,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statBlock: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  jumpBackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  jumpBackIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jumpBackContent: {
    flex: 1,
    marginLeft: 12,
  },
  jumpBackLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  jumpBackTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  jumpBackSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  actionsGrid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    position: 'relative',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
  wordsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
  },
  wordsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  wordsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  wordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  wordChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  moreWords: {
    fontSize: 13,
    paddingVertical: 6,
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  practiceButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionContent: {
    flex: 1,
    marginLeft: 12,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  sessionSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomPadding: {
    height: 32,
  },
});