import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useChildren } from '../../contexts/ChildrenContext';
import { COLORS, useTheme } from '../../contexts/ThemeContext';
import { Child } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import AddChildModal from '../../components/AddChildModal';

function ChildCard({ child, onPress, wordCount }: { child: Child; onPress: () => void; wordCount: number }) {
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  return (
    <TouchableOpacity 
      style={[styles.childCard, { backgroundColor: colors.surface, borderColor: colors.outline }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {child.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.childInfo}>
        <Text style={[styles.childName, { color: colors.onSurface }]}>{child.name}</Text>
        <Text style={[styles.childStats, { color: colors.onSurfaceVariant }]}>
          {wordCount} words • {child.gradeLevel || 'No grade set'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name="people-outline" size={48} color={colors.onSurfaceVariant} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.onSurface }]}>No children yet</Text>
      <Text style={[styles.emptyDescription, { color: colors.onSurfaceVariant }]}>
        Add a child to start tracking their reading progress and vocabulary.
      </Text>
      <TouchableOpacity 
        style={[styles.emptyButton, { backgroundColor: colors.primary }]}
        onPress={onAdd}
      >
        <Ionicons name="add" size={20} color={colors.onPrimary} />
        <Text style={[styles.emptyButtonText, { color: colors.onPrimary }]}>Add Child</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const { children, loading, selectChild, words } = useChildren();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  const [modalVisible, setModalVisible] = useState(false);
  
  const handleChildPress = (child: Child) => {
    selectChild(child);
    router.push(`/child/${child.id}`);
  };
  
  const getWordCount = (childId: string) => {
    return words.filter(w => w.childId === childId).length;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.onSurfaceVariant }]}>
            Loading profiles...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.onSurface }]}>Noah</Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Reading by osmosis. Select a child to start.
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      {children.length === 0 ? (
        <EmptyState onAdd={() => setModalVisible(true)} />
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChildCard 
              child={item} 
              onPress={() => handleChildPress(item)}
              wordCount={getWordCount(item.id)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
  },
  childInfo: {
    flex: 1,
    marginLeft: 16,
  },
  childName: {
    fontSize: 17,
    fontWeight: '600',
  },
  childStats: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});