import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useChildren } from '../../../contexts/ChildrenContext';
import { palette, fonts, radius, shadow } from '../../../lib/tokens';
import * as storage from '../../../lib/storage';
import type { PresetWordList } from '../../../types';

const GRADE_ORDER = ['Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', 'Other'];

export default function PresetsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { children, refreshData } = useChildren();
  const child = children.find((c) => c.id === id);
  const [presets, setPresets] = useState<PresetWordList[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    storage.getPresets().then(setPresets);
  }, []);

  const grouped = useMemo(() => {
    const g: Record<string, PresetWordList[]> = {};
    for (const p of presets) {
      const key = p.gradeLevel || 'Other';
      (g[key] ||= []).push(p);
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => a.sortOrder - b.sortOrder);
    return g;
  }, [presets]);

  const handleAdd = async (preset: PresetWordList) => {
    if (!id) return;
    setAdding(preset.id);
    try {
      const added = await storage.addPresetToChild(id, preset.id);
      await refreshData();
      setAddedIds((prev) => new Set(prev).add(preset.id));
      Alert.alert(
        added > 0 ? 'Added!' : 'Already in library',
        added > 0
          ? `Added ${added} new word${added === 1 ? '' : 's'} from ${preset.name} to ${child?.name || 'your reader'}'s library.`
          : `${preset.name} is already in the library.`,
      );
    } finally {
      setAdding(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backChevron}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.topbarTitle}>Word Sets</Text>
          <Text style={styles.topbarMeta}>Tap a set to add it to {child?.name || 'this reader'}'s library</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {GRADE_ORDER.map((grade) => {
          const items = grouped[grade];
          if (!items?.length) return null;
          return (
            <View key={grade} style={{ marginBottom: 18 }}>
              <Text style={styles.sectionH}>{grade}</Text>
              {items.map((p) => {
                const isAdding = adding === p.id;
                const wasAdded = addedIds.has(p.id);
                return (
                  <View key={p.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.setName}>
                          {p.name.includes('·') ? p.name.split('·')[1].trim() : p.name}
                        </Text>
                        {p.description && <Text style={styles.setDesc}>{p.description}</Text>}
                      </View>
                      <View style={styles.countPill}>
                        <Text style={styles.countText}>{p.words.length}</Text>
                      </View>
                    </View>
                    <View style={styles.chips}>
                      {p.words.slice(0, 8).map((w, i) => (
                        <View key={i} style={styles.chip}>
                          <Text style={styles.chipText}>{w}</Text>
                        </View>
                      ))}
                      {p.words.length > 8 && (
                        <Text style={styles.moreText}>+{p.words.length - 8} more</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleAdd(p)}
                      disabled={isAdding}
                      style={({ pressed }) => [
                        styles.addBtn,
                        wasAdded && styles.addedBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[styles.addBtnText, wasAdded && styles.addedBtnText]}>
                        {isAdding ? 'Adding…' : wasAdded ? '✓ Added' : '+ Add to library'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          );
        })}
        <View style={{ height: 32 }} />
      </ScrollView>
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
  backChevron: { fontSize: 26, color: palette.navy, fontFamily: fonts.bodyBold, marginTop: -3 },
  topbarTitle: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 19,
    color: palette.navy,
    letterSpacing: -0.2,
  },
  topbarMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.slate,
    marginTop: 2,
  },
  scroll: { padding: 16, paddingTop: 12 },
  sectionH: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 11,
    color: palette.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    marginTop: 8,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: palette.paper,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 10,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  setName: {
    fontFamily: fonts.contentSerifBold,
    fontSize: 17,
    color: palette.navy,
    letterSpacing: -0.2,
  },
  setDesc: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.slate,
    marginTop: 3,
    lineHeight: 17,
  },
  countPill: {
    backgroundColor: palette.goldPale,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: { fontFamily: fonts.bodyExtraBold, fontSize: 12, color: '#8C6B1B' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    backgroundColor: palette.warmCream,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipText: { fontFamily: fonts.contentSerifSemi, fontSize: 13, color: palette.navy },
  moreText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.slate,
    paddingVertical: 4,
  },
  addBtn: {
    backgroundColor: palette.gold,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#B58A2E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  addedBtn: { backgroundColor: palette.sagePale, shadowOpacity: 0 },
  addBtnText: { fontFamily: fonts.bodyExtraBold, fontSize: 14, color: palette.navyDeep, letterSpacing: 0.2 },
  addedBtnText: { color: '#2F6B47' },
});
