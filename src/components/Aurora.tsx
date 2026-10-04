import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { gradients } from '../theme';

const BLOBS = [
  { color: '#7C5CFF', x: 0.15, y: 0.08, r: 0.75, drift: 30, duration: 9000 },
  { color: '#FF5CA8', x: 0.95, y: 0.28, r: 0.6, drift: 40, duration: 11000 },
  { color: '#3DD6F5', x: 0.1, y: 0.78, r: 0.55, drift: 35, duration: 13000 },
];

function Blob({ color, size, x, y, drift, duration, id }: { color: string; size: number; x: number; y: number; drift: number; duration: number; id: string }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-drift, drift] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [drift / 2, -drift / 2] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <Stop offset="55%" stopColor={color} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Yavaşça süzülen renk bulutlarıyla koyu gradyan arka plan. */
export function Aurora({ intensity = 1 }: { intensity?: number }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.background} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { opacity: intensity }]}>
        {BLOBS.map((b, i) => (
          <Blob
            key={i}
            id={`aurora${i}`}
            color={b.color}
            size={width * b.r * 1.6}
            x={width * b.x}
            y={height * b.y}
            drift={b.drift}
            duration={b.duration}
          />
        ))}
      </View>
    </View>
  );
}
