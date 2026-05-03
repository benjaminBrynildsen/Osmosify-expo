import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { palette, fonts, radius, shadow } from '../../../lib/tokens';
import { Button } from '../../../components/ui/Button';

interface StatTileProps {
  value: string | number;
  label: string;
  emoji?: string;
  color?: 'navy' | 'gold' | 'coral';
}

function StatTile({ value, label, emoji, color = 'navy' }: StatTileProps) {
  const numberColor =
    color === 'gold' ? palette.gold : color === 'coral' ? palette.coral : palette.navy;
  return (
    <View style={styles.statTile}>
      {emoji && <Text style={styles.statEmoji}>{emoji}</Text>}
      <Text style={[styles.statNumber, { color: numberColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface ActivityTileProps {
  title: string;
  subtitle: string;
  icon: string;
  variant: 'featured' | 'coral' | 'gold' | 'sage' | 'sky';
  onPress: () => void;
  disabled?: boolean;
}

function ActivityTile({
  title,
  subtitle,
  icon,
  variant,
  onPress,
  disabled,
}: ActivityTileProps) {
  if (variant === 'featured') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.tile,
          styles.featuredTile,
          pressed && { transform: [{ scale: 0.99 }] },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Text style={styles.featuredSparkle}>✦</Text>
        <Text style={styles.featuredIcon}>{icon}</Text>
        <Text style={styles.featuredTitle}>{title}</Text>
        <Text style={styles.featuredSubtitle}>{subtitle}</Text>
      </Pressable>
    );
  }

  const bg =
    variant === 'coral'
      ? palette.coralPale
      : variant === 'gold'
      ? palette.goldPale
      : variant === 'sage'
      ? palette.sagePale
      : palette.skyPale;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.tile,
        pressed && { transform: [{ scale: 0.99 }] },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[styles.tileIconCircle, { backgroundColor: bg }]}>
        <Text style={styles.tileIcon}>{icon}</Text>
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

export default function ChildDashboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, words, sessions, loading, selectChild } = useChildren();

  const child = children.find((c) => c.id === id);
  const childWords = useMemo(() => words.filter((w) => w.childId === id), [words, id]);
  const childSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.childId === id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [sessions, id],
  );

  const newWords = childWords.filter((w) => w.status === 'new');
  const learningWords = childWords.filter((w) => w.status === 'learning');
  const masteredWords = childWords.filter((w) => w.status === 'mastered');
  const lastSession = childSessions[0];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.navy} />
        </View>
      </SafeAreaView>
    );
  }

  if (!child) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Reader not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: palette.gold, fontFamily: fonts.bodyBold }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  selectChild(child);

  // Surface a couple of derived numbers for the stats row
  const streak = lastSession ? 1 : 0; // TODO: real streak when sessions tracked
  const booksCount = new Set(
    childSessions.map((s) => s.bookTitle).filter(Boolean),
  ).size;

  const todaysWordsLabel =
    newWords.length > 0
      ? `${Math.min(5, newWords.length)} new words`
      : learningWords.length > 0
      ? 'Practice the learning words'
      : 'All caught up — scan a new page';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <Text style={styles.topbarTitle}>{child.name}</Text>
        <View style={styles.topbarRight} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <StatTile value={childWords.length} label="Words" emoji="📖" />
          <StatTile value={streak} label="Day streak" emoji="🔥" color="coral" />
          <StatTile value={booksCount} label="Books" emoji="⭐" color="gold" />
        </View>

        {/* Today's adventure */}
        <Text style={styles.sectionH}>Today's adventure</Text>
        <ActivityTile
          variant="featured"
          icon="✨"
          title={
            newWords.length > 0
              ? `${Math.min(5, newWords.length)} new words`
              : 'Keep learning'
          }
          subtitle={
            lastSession?.bookTitle
              ? `From ${lastSession.bookTitle}`
              : 'Tap to start'
          }
          onPress={() => router.push(`/child/${id}/flashcards`)}
        />

        <View style={styles.tileGrid}>
          <ActivityTile
            variant="coral"
            icon="📇"
            title="Flashcards"
            subtitle="Mastery"
            onPress={() => router.push(`/child/${id}/flashcards`)}
            disabled={newWords.length + learningWords.length === 0}
          />
          <ActivityTile
            variant="gold"
            icon="🎯"
            title="Word Pop"
            subtitle="Find the word"
            onPress={() => router.push(`/child/${id}/word-pop`)}
            disabled={childWords.length < 4}
          />
          <ActivityTile
            variant="coral"
            icon="🔥"
            title="Lava Letters"
            subtitle="Save the words!"
            onPress={() => router.push(`/child/${id}/lava-letters`)}
            disabled={childWords.length < 2}
          />
          <ActivityTile
            variant="sage"
            icon="📖"
            title="Library"
            subtitle={`${childWords.length} words`}
            onPress={() => router.push(`/child/${id}/library`)}
          />
          <ActivityTile
            variant="sky"
            icon="📷"
            title="Add page"
            subtitle="Scan a book"
            onPress={() => router.push(`/child/${id}/upload`)}
          />
        </View>

        {/* Words ready to unlock */}
        {newWords.length > 0 && (
          <View style={styles.unlockCard}>
            <Text style={styles.sectionH}>Ready to unlock</Text>
            <View style={styles.chipRow}>
              {newWords.slice(0, 8).map((w) => (
                <View key={w.id} style={styles.chip}>
                  <Text style={styles.chipText}>{w.word}</Text>
                </View>
              ))}
              {newWords.length > 8 && (
                <Text style={styles.chipMore}>+{newWords.length - 8}</Text>
              )}
            </View>
            <View style={{ marginTop: 12 }}>
              <Button
                onPress={() => router.push(`/child/${id}/flashcards`)}
                variant="gold"
              >
                Start unlocking
              </Button>
            </View>
          </View>
        )}

        {/* Recent sessions */}
        {childSessions.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionH}>Recent reading</Text>
            {childSessions.slice(0, 5).map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <View style={styles.sessionIcon}>
                  <Text style={{ fontSize: 18 }}>📖</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionTitle}>
                    {s.bookTitle || 'Reading session'}
                  </Text>
                  <Text style={styles.sessionMeta}>
                    {s.newWordsCount} new words ·{' '}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.cream },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: {
    fontFamily: fonts.contentSerifBold,
    fontSize: 18,
    color: palette.navy,
  },

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

  scrollBody: { padding: 18, paddingTop: 12 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statTile: {
    flex: 1,
    backgroundColor: palette.paper,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
    ...shadow.card,
  },
  statEmoji: { position: 'absolute', top: 6, right: 8, fontSize: 14, opacity: 0.6 },
  statNumber: {
    fontFamily: fonts.contentSerifBold,
    fontSize: 28,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: palette.slate,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  sectionH: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    color: palette.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginTop: 18,
    marginBottom: 10,
    marginLeft: 4,
  },

  tile: {
    backgroundColor: palette.paper,
    borderRadius: radius.xl,
    padding: 14,
    minHeight: 96,
    ...shadow.card,
  },
  featuredTile: {
    width: '100%',
    minHeight: 110,
    backgroundColor: palette.navy,
    overflow: 'hidden',
    paddingVertical: 18,
  },
  featuredSparkle: {
    position: 'absolute',
    top: 14,
    right: 18,
    color: palette.gold,
    fontSize: 22,
  },
  featuredIcon: { fontSize: 30, marginBottom: 4 },
  featuredTitle: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 19,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  featuredSubtitle: {
    fontFamily: fonts.hand,
    fontSize: 18,
    color: palette.goldPale,
    marginTop: 2,
  },

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  tileIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileIcon: { fontSize: 20 },
  tileTitle: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
    color: palette.navy,
    letterSpacing: -0.2,
  },
  tileSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: palette.slate,
    marginTop: 2,
  },

  unlockCard: { marginTop: 4 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: palette.lavenderPale,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  chipText: {
    fontFamily: fonts.contentSerifSemi,
    fontSize: 14,
    color: '#6E5FA8',
  },
  chipMore: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: palette.slate,
    paddingVertical: 8,
  },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.paper,
    padding: 12,
    borderRadius: radius.lg,
    marginBottom: 8,
    gap: 12,
    ...shadow.card,
  },
  sessionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.warmCream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: palette.navy,
  },
  sessionMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.slate,
    marginTop: 2,
  },
});
