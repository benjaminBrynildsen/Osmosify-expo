import { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, Easing } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Floating ember particles drifting up from the lava bar.
 */
export function Embers({ bottomOffset = 70, count = 6 }: { bottomOffset?: number; count?: number }) {
  return (
    <View style={[styles.layer, { bottom: bottomOffset }]} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <Ember key={i} delay={i * 600} />
      ))}
    </View>
  );
}

function Ember({ delay }: { delay: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const startX = useRef(Math.random() * SCREEN_WIDTH).current;
  const drift = useRef((Math.random() - 0.5) * 60).current;
  const size = useRef(4 + Math.random() * 5).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 2400 + Math.random() * 1200,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: startX,
        bottom: 0,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: '#fbbf24',
        shadowColor: '#fb923c',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 6,
        opacity: t.interpolate({
          inputRange: [0, 0.1, 0.7, 1],
          outputRange: [0, 0.9, 0.6, 0],
        }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -260] }) },
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) },
        ],
      }}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 280,
  },
});
