import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { palette, fonts, radius, shadow } from '../../../lib/tokens';
import type { Word } from '../../../types';

type Filter = 'all' | 'new' | 'learning' | 'mastered';

const STATUS_LABEL: Record<Word['status'], string> = {
  new: 'New',
  learning: 'Learning',
  mastered: 'Mastered',
};

const STATUS_BADGE_COLORS: Record<Word['status'], { bg: string; fg: string }> = {
  new: { bg: palette.lavenderPale, fg: '#6E5FA8' },
  learning: { bg: palette.goldPale, fg: '#8C6B1B' },
  mastered: { bg: palette.sagePale, fg: '#2F6B47' },
};

export default function LibraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words } = useChildren();

  const child = children.find((c) => c.id === id);
  const childWords = useMemo(() => words.filter((w) => w.childId === id), [words, id]);

  const [filter, setFilter] = useState<Filter>('all');

  const filteredWords = useMemo(() => {
    if (filter === 'all') return childWords;
    return childWords.filter((w) => w.status === filter);
  }, [childWords, filter]);

  const counts = useMemo(
    () => ({
      all: childWords.length,
      new: childWords.filter((w) => w.status === 'new').length,
      learning: childWords.filter((w) => w.status === 'learning').length,
      mastered: childWords.filter((w) => w.status === 'mastered').length,
    }),
    [childWords],
  );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'learning', label: 'Learning' },
    { key: 'mastered', label: 'Mastered' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.topbarTitle}>
          {child?.name ? `${child.name}'s words` : 'Words'}
        </Text>
        <View style={styles.topbarRight} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {filters.map((f) => {
          const isActive = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.pill, isActive && styles.pillActive]}
            >
              <Text
                style={[
                  styles.pillText,
                  isActive ? styles.pillTextActive : styles.pillTextInactive,
                ]}
              >
                {f.label} · {counts[f.key]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredWords}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const c = STATUS_BADGE_COLORS[item.status];
          return (
            <View style={styles.row}>
              <Text style={styles.word}>{item.word}</Text>
              <View style={[styles.badge, { backgroundColor: c.bg }]}>
                <Text style={[styles.badgeText, { color: c.fg }]}>
                  {STATUS_LABEL[item.status]}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No words yet</Text>
            <Text style={styles.emptyMeta}>
              Scan a book page or add a preset list to get started.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.cream },

  topbar: {
    backgroundColor: palette.paper,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 26,
    color: palette.navy,
    fontFamily: fonts.bodyBold,
    marginTop: -3,
  },
  topbarTitle: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 19,
    color: palette.navy,
    letterSpacing: -0.2,
    flex: 1,
  },
  topbarRight: { width: 36 },

  pillRow: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 6,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: palette.paper,
    ...shadow.card,
  },
  pillActive: { backgroundColor: palette.navy },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  pillTextActive: { color: '#FFFFFF' },
  pillTextInactive: { color: palette.slate },

  list: { paddingHorizontal: 18, paddingTop: 6, paddingBottom: 24 },
  row: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    ...shadow.card,
  },
  word: {
    fontFamily: fonts.contentSerifSemi,
    fontSize: 18,
    color: palette.navy,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.contentSerifBold,
    fontSize: 20,
    color: palette.navy,
  },
  emptyMeta: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.slate,
    textAlign: 'center',
    lineHeight: 22,
  },
});
