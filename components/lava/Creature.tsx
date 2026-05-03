import { useEffect, useRef } from 'react';
import { Animated, Easing, Text, View, StyleSheet } from 'react-native';

interface Props {
  word: string;
  saved: boolean;
  size: number;
  bg: string;
  bgSaved: string;
  inDanger?: boolean;
}

/**
 * A bouncy/wobbling creature bubble. When `saved`, plays a quick burst
 * (scale up + fade out + sparkle). When `inDanger` (low on screen),
 * pulses a warning glow.
 */
export function Creature({ word, saved, size, bg, bgSaved, inDanger }: Props) {
  const wobble = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const dangerPulse = useRef(new Animated.Value(0)).current;

  // Idle wobble
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(wobble, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Save burst
  useEffect(() => {
    if (saved) {
      Animated.timing(burst, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      burst.setValue(0);
    }
  }, [saved]);

  // Danger pulse
  useEffect(() => {
    if (!inDanger) {
      dangerPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dangerPulse, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(dangerPulse, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [inDanger]);

  const rotate = wobble.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });
  const scale = saved
    ? burst.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] })
    : wobble.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] });
  const opacity = saved
    ? burst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1, 0] })
    : 1;
  const dangerScale = dangerPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const dangerOpacity = dangerPulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

  return (
    <View style={{ width: size, height: size }}>
      {/* Danger halo */}
      {inDanger && !saved && (
        <Animated.View
          style={{
            position: 'absolute',
            top: -8,
            left: -8,
            right: -8,
            bottom: -8,
            borderRadius: size,
            backgroundColor: '#ef4444',
            opacity: dangerOpacity,
            transform: [{ scale: dangerScale }],
          }}
        />
      )}
      <Animated.View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            backgroundColor: saved ? bgSaved : bg,
            opacity,
            transform: [{ scale }, { rotate }],
          },
        ]}
      >
        <Text
          style={[
            styles.word,
            { fontSize: Math.max(14, size * 0.28) },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {word}
        </Text>
      </Animated.View>
      {/* Save sparkles */}
      {saved && (
        <>
          {['✦', '✦', '⭐', '✦'].map((s, i) => (
            <Animated.Text
              key={i}
              style={{
                position: 'absolute',
                left: size / 2,
                top: size / 2,
                color: '#fef08a',
                fontSize: 22,
                opacity: burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
                transform: [
                  {
                    translateX: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.cos((i / 4) * Math.PI * 2) * 50],
                    }),
                  },
                  {
                    translateY: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, Math.sin((i / 4) * Math.PI * 2) * 50],
                    }),
                  },
                ],
              }}
            >
              {s}
            </Animated.Text>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  word: {
    fontWeight: '800',
    color: 'white',
    paddingHorizontal: 8,
    textAlign: 'center',
  },
});
