import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts } from '../../lib/tokens';

export function StreakBadge({ days }: { days: number }) {
  if (!days) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.flame}>🔥</Text>
      <Text style={styles.text}>{days}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.coral,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: palette.coralDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  flame: {
    fontSize: 12,
  },
  text: {
    fontFamily: fonts.bodyExtraBold,
    color: '#FFFFFF',
    fontSize: 12,
  },
});
