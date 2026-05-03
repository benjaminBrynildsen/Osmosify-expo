import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useChildren } from '../../contexts/ChildrenContext';
import { Child } from '../../types';
import AddChildModal from '../../components/AddChildModal';
import { palette, fonts, radius, shadow } from '../../lib/tokens';
import { NoahWordmark } from '../../components/ui/NoahWordmark';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { TabBar } from '../../components/ui/TabBar';

interface ChildRowProps {
  child: Child;
  onPress: () => void;
  wordCount: number;
  streak?: number;
}

function ChildRow({ child, onPress, wordCount, streak = 0 }: ChildRowProps) {
  return (
    <Card onPress={onPress}>
      <Avatar name={child.name} />
      <View style={styles.childInfo}>
        <Text style={styles.childName}>{child.name}</Text>
        <Text style={styles.childMeta}>
          {wordCount} words · {child.gradeLevel || 'No grade set'}
        </Text>
      </View>
      {streak > 0 && <StreakBadge days={streak} />}
      <Text style={styles.chevron}>›</Text>
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No readers yet</Text>
      <Text style={styles.emptyDescription}>
        Add your child to start tracking the words they're absorbing.
      </Text>
      <Button onPress={onAdd} variant="gold" fullWidth={false}>
        + Add a reader
      </Button>
    </View>
  );
}

export default function HomeScreen() {
  const { children, loading, selectChild, words } = useChildren();
  const [modalVisible, setModalVisible] = useState(false);

  const handleChildPress = (child: Child) => {
    selectChild(child);
    router.push(`/child/${child.id}`);
  };

  const wordCountFor = (childId: string) =>
    words.filter((w) => w.childId === childId).length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={palette.navy} />
          <Text style={styles.loadingText}>Loading readers…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <NoahWordmark size={36} />
        <Text style={styles.subtitle}>Pick a reader</Text>
      </View>

      {children.length === 0 ? (
        <EmptyState onAdd={() => setModalVisible(true)} />
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChildRow
              child={item}
              onPress={() => handleChildPress(item)}
              wordCount={wordCountFor(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View style={{ marginTop: 4 }}>
              <Button onPress={() => setModalVisible(true)} variant="outline">
                + Add a reader
              </Button>
            </View>
          }
        />
      )}

      <TabBar
        active="readers"
        onChange={(t) => {
          if (t === 'books') router.push('/books' as any);
          if (t === 'settings') router.push('/settings' as any);
        }}
      />

      <AddChildModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: palette.slate,
    fontFamily: fonts.body,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.hand,
    fontSize: 22,
    color: palette.gold,
    marginTop: -4,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 16,
  },
  childInfo: {
    flex: 1,
    minWidth: 0,
  },
  childName: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 17,
    color: palette.navy,
    letterSpacing: -0.2,
  },
  childMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.slate,
    marginTop: 2,
  },
  chevron: {
    color: palette.slateLight,
    fontSize: 22,
    fontFamily: fonts.bodyBold,
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyTitle: {
    fontFamily: fonts.contentSerifBold,
    fontSize: 22,
    color: palette.navy,
  },
  emptyDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.slate,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
});
