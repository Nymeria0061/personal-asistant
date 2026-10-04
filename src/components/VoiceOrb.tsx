import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { gradients } from '../theme';

export type OrbMode = 'idle' | 'listening' | 'speaking';

/**
 * Asistanın "yüzü": dönen gradyan çekirdek, nefes alan halkalar.
 * Dinlerken halkalar ses seviyesine göre büyür.
 */
export function VoiceOrb({ size = 180, mode = 'idle', volume = 0 }: { size?: number; mode?: OrbMode; volume?: number }) {
  const [spin] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [level] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const s = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: mode === 'idle' ? 9000 : 3200, easing: Easing.linear, useNativeDriver: true }),
    );
    s.start();
    return () => s.stop();
  }, [spin, mode]);

  useEffect(() => {
    const speed = mode === 'idle' ? 2600 : 900;
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    b.start();
    return () => b.stop();
  }, [breathe, mode]);

  useEffect(() => {
    Animated.spring(level, { toValue: mode === 'listening' ? volume : 0, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  }, [level, volume, mode]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const coreScale = Animated.add(
    breathe.interpolate({ inputRange: [0, 1], outputRange: [1, mode === 'idle' ? 1.03 : 1.06] }),
    level.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
  );

  const rings = [0, 1, 2].map((i) => {
    const base = 1.18 + i * 0.22;
    const scale = Animated.add(
      breathe.interpolate({ inputRange: [0, 1], outputRange: [base, base + (mode === 'idle' ? 0.05 : 0.12)] }),
      level.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35 + i * 0.15] }),
    );
    const opacity = breathe.interpolate({
      inputRange: [0, 1],
      outputRange: [0.32 - i * 0.09, (mode === 'idle' ? 0.22 : 0.42) - i * 0.1],
    });
    return { scale, opacity };
  });

  return (
    <View style={{ width: size * 1.9, height: size * 1.9, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      {rings.map((r, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: r.opacity,
              transform: [{ scale: r.scale }],
              borderColor: i === 1 ? '#FF5CA8' : '#7C5CFF',
            },
          ]}
        />
      ))}
      <Animated.View style={{ width: size, height: size, transform: [{ scale: coreScale }] }}>
        {/* dış parıltı */}
        <View style={[StyleSheet.absoluteFill, styles.glow, { borderRadius: size / 2, shadowRadius: size / 4 }]} />
        <Animated.View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', transform: [{ rotate }] }}>
          <LinearGradient colors={gradients.orb} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,92,168,0)', 'rgba(255,92,168,0.85)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
          />
        </Animated.View>
        {/* cam parlaması */}
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="orbShine" cx="35%" cy="28%" r="55%">
              <Stop offset="0%" stopColor="#fff" stopOpacity={0.75} />
              <Stop offset="45%" stopColor="#fff" stopOpacity={0.12} />
              <Stop offset="100%" stopColor="#fff" stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="orbShade" cx="60%" cy="75%" r="65%">
              <Stop offset="50%" stopColor="#07051A" stopOpacity={0} />
              <Stop offset="100%" stopColor="#07051A" stopOpacity={0.45} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orbShade)" />
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#orbShine)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { position: 'absolute', borderWidth: 1.5 },
  glow: {
    backgroundColor: 'rgba(124,92,255,0.35)',
    shadowColor: '#7C5CFF',
    shadowOpacity: 0.9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
  },
});
