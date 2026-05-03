import { View, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { palette, radius } from '../../lib/tokens';

type TabKey = 'readers' | 'books' | 'settings';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

function TabIcon({ tab, active }: { tab: TabKey; active: boolean }) {
  const color = active ? palette.navy : palette.slateLight;
  const stroke = 2;
  switch (tab) {
    case 'readers':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path
            d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={stroke} fill="none" />
        </Svg>
      );
    case 'books':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path
            d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <Path
            d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={stroke} fill="none" />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );
  }
}

export function TabBar({ active, onChange }: Props) {
  const tabs: TabKey[] = ['readers', 'books', 'settings'];
  return (
    <View style={styles.bar}>
      {tabs.map((t) => {
        const isActive = active === t;
        return (
          <Pressable key={t} onPress={() => onChange(t)} style={styles.tab}>
            <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
              <TabIcon tab={t} active={isActive} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 68,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: palette.paper,
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,58,106,0.08)',
    paddingHorizontal: 8,
    paddingBottom: 12,
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconBox: {
    width: 48,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: palette.goldPale,
  },
});
