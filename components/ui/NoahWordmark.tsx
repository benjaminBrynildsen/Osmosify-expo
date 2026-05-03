import { Text, StyleSheet, TextStyle } from 'react-native';
import { palette, fonts } from '../../lib/tokens';

interface Props {
  size?: number;
  style?: TextStyle;
  /** When true, renders solid gold (no gradient — RN can't gradient text easily) */
  gold?: boolean;
  /** When true, uses cream color (for placement on navy) */
  onNavy?: boolean;
}

/**
 * The "Noah" wordmark. Gilt-stamped Webster cover lettering.
 *
 * RN can't gradient-fill text without extra libs, so we render
 * a single embossed-gold tone with a subtle shadow to fake
 * the inset/letterpress effect from the mockups.
 */
export function NoahWordmark({ size = 32, style, gold = true, onNavy }: Props) {
  const color = gold ? palette.gold : onNavy ? palette.cream : palette.navy;
  return (
    <Text
      style={[
        styles.text,
        {
          fontSize: size,
          color,
          textShadowColor: gold ? 'rgba(0,0,0,0.18)' : 'transparent',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 0,
        },
        style,
      ]}
    >
      Noah
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.wordmark,
    letterSpacing: -0.5,
  },
});
