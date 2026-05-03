import { View, Text, StyleSheet } from 'react-native';
import { palette, fonts, avatarColorFor, radius } from '../../lib/tokens';

interface Props {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 54 }: Props) {
  const c = avatarColorFor(name);
  const initial = (name?.charAt(0) || '?').toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: c.bg,
        },
      ]}
    >
      <Text style={[styles.initial, { color: c.fg, fontSize: size * 0.45 }]}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  initial: {
    fontFamily: fonts.bodyExtraBold,
    letterSpacing: -0.5,
  },
});
