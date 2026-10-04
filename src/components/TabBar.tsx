import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useWakeStatus } from '../lib/wake';
import { colors, gradients } from '../theme';
import { Txt } from './ui';

const ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap, string]> = {
  index: ['sunny', 'sunny-outline', 'Bugün'],
  plan: ['calendar', 'calendar-outline', 'Plan'],
  notes: ['document-text', 'document-text-outline', 'Notlar'],
  settings: ['options', 'options-outline', 'Ayarlar'],
};

/** Ortasında sesli asistan düğmesi olan yüzen cam sekme çubuğu. */
export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const wake = useWakeStatus();
  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const [on, off, label] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline', route.name];
    return (
      <Pressable
        key={route.key}
        style={styles.tab}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            navigation.navigate(route.name);
          }
        }}
      >
        <Ionicons name={focused ? on : off} size={22} color={focused ? colors.text : colors.textDim} />
        <Txt size={10} weight={focused ? 'bold' : 'medium'} color={focused ? colors.text : colors.textDim}>
          {label}
        </Txt>
        {focused && <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dot} />}
      </Pressable>
    );
  });

  const mic = (
    <Pressable
      key="mic"
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/assistant');
      }}
      style={({ pressed }) => [styles.micWrap, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <LinearGradient
        colors={gradients.orb}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.mic, wake === 'listening' && styles.micWake]}
      >
        <Ionicons name="mic" size={26} color="#fff" />
      </LinearGradient>
    </Pressable>
  );

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {Platform.OS === 'ios' ? (
          <BlurView tint="dark" intensity={40} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,12,51,0.92)' }]} />
        )}
        {tabs.slice(0, 2)}
        <View style={styles.tab} />
        {tabs.slice(2)}
      </View>
      <View style={[styles.micAnchor, { bottom: Math.max(insets.bottom, 12) + 22 }]} pointerEvents="box-none">
        {mic}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: {
    flexDirection: 'row',
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: '100%' },
  dot: { position: 'absolute', bottom: 7, width: 16, height: 3, borderRadius: 2 },
  micAnchor: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  micWrap: {
    shadowColor: '#7C5CFF',
    shadowOpacity: 0.8,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
    borderRadius: 34,
  },
  mic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  // uyandırma kelimesi dinlenirken yeşil halka
  micWake: { borderColor: colors.mint },
});
