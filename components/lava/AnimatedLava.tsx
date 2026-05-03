import { useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Animated lava bar with 3 layered flame waves + flickering glow.
 * Sits flush at the bottom of the game area.
 */
export function AnimatedLava({ height = 90 }: { height?: number }) {
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
    loop(wave1, 1800).start();
    loop(wave2, 2400).start();
    loop(wave3, 1500).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 0.85, duration: 220, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.92, duration: 180, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  return (
    <View style={[styles.lava, { height }]} pointerEvents="none">
      {/* Hot glow above the lava */}
      <Animated.View style={[styles.glow, { opacity: flicker.interpolate({ inputRange: [0.85, 1], outputRange: [0.35, 0.7] }) }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 90, 0, 0.35)', 'rgba(255, 60, 0, 0.6)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Wave 3 — deep red base */}
      <Animated.View
        style={[
          styles.wave,
          {
            transform: [
              { translateX: wave3.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] }) },
              { translateY: wave3.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
            ],
          },
        ]}
      >
        <FlameStrip colors={['#7f1d1d', '#991b1b']} crests={5} amplitude={14} />
      </Animated.View>

      {/* Wave 2 — orange middle */}
      <Animated.View
        style={[
          styles.wave,
          {
            bottom: 0,
            transform: [
              { translateX: wave2.interpolate({ inputRange: [0, 1], outputRange: [25, -25] }) },
              { translateY: wave2.interpolate({ inputRange: [0, 1], outputRange: [-2, 6] }) },
            ],
          },
        ]}
      >
        <FlameStrip colors={['#dc2626', '#ea580c']} crests={4} amplitude={20} />
      </Animated.View>

      {/* Wave 1 — yellow/orange tongues at top */}
      <Animated.View
        style={[
          styles.wave,
          {
            bottom: 0,
            opacity: flicker,
            transform: [
              { translateX: wave1.interpolate({ inputRange: [0, 1], outputRange: [-15, 15] }) },
              { translateY: wave1.interpolate({ inputRange: [0, 1], outputRange: [-4, 8] }) },
            ],
          },
        ]}
      >
        <FlameStrip colors={['#f59e0b', '#fbbf24']} crests={6} amplitude={26} />
      </Animated.View>
    </View>
  );
}

/**
 * A horizontal strip with N triangular flame crests rising from a flat base.
 * Built from styled Views to avoid SVG dependency.
 */
function FlameStrip({
  colors,
  crests,
  amplitude,
}: {
  colors: [string, string];
  crests: number;
  amplitude: number;
}) {
  const segWidth = (SCREEN_WIDTH + 60) / crests;
  return (
    <View style={[styles.strip]}>
      {Array.from({ length: crests }).map((_, i) => {
        const isUp = i % 2 === 0;
        return (
          <View
            key={i}
            style={{
              width: segWidth,
              height: amplitude * 2,
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: segWidth / 2,
                borderRightWidth: segWidth / 2,
                borderBottomWidth: amplitude * (isUp ? 1.6 : 1.0),
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderBottomColor: colors[0],
                marginBottom: -1,
                transform: [{ rotate: '180deg' }],
              }}
            />
          </View>
        );
      })}
      <LinearGradient
        colors={[colors[1], colors[0]]}
        style={[StyleSheet.absoluteFill, { top: amplitude * 1.3 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lava: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    left: 0,
    right: 0,
    height: 80,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: -30,
    right: -30,
  },
  strip: {
    flexDirection: 'row',
    height: 70,
  },
});
