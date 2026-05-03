import { ReactNode } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { palette, fonts, radius } from '../../lib/tokens';

type Variant = 'primary' | 'gold' | 'coral' | 'outline';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<Variant, { bg: string; fg: string; shadow: string }> = {
  primary: { bg: palette.navy, fg: palette.cream, shadow: palette.navyDeep },
  gold: { bg: palette.gold, fg: palette.navyDeep, shadow: '#B58A2E' },
  coral: { bg: palette.coral, fg: '#FFFFFF', shadow: palette.coralDeep },
  outline: { bg: palette.paper, fg: palette.navy, shadow: palette.goldPale },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  fullWidth = true,
  style,
  textStyle,
}: Props) {
  const v = variantStyles[variant];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: v.bg,
          borderColor: variant === 'outline' ? palette.gold : 'transparent',
          borderWidth: variant === 'outline' ? 2 : 0,
          width: fullWidth ? '100%' : undefined,
          shadowColor: v.shadow,
          transform: pressed ? [{ translateY: 2 }] : [{ translateY: 0 }],
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: v.fg }, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
});
