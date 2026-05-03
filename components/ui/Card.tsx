import { ReactNode } from 'react';
import { Pressable, View, StyleSheet, ViewStyle } from 'react-native';
import { palette, radius, shadow } from '../../lib/tokens';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, onPress, style }: Props) {
  const Component: any = onPress ? Pressable : View;
  return (
    <Component
      onPress={onPress}
      android_ripple={onPress ? { color: 'rgba(31,58,106,0.06)' } : undefined}
      style={({ pressed }: any) => [
        styles.card,
        style,
        pressed && onPress ? { opacity: 0.92, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      {children}
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.paper,
    borderRadius: radius.xl,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    ...shadow.card,
  },
});
