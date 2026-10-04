import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';

import { CATEGORY_MAP } from '../lib/categories';
import { relativeDayLabel, repeatLabel } from '../lib/schedule';
import { setDone } from '../lib/store';
import type { Task } from '../lib/types';
import { colors, radius } from '../theme';
import { Txt } from './ui';

export function TaskRow({ task, date, done, showDate }: { task: Task; date: string; done: boolean; showDate?: boolean }) {
  const cat = CATEGORY_MAP[task.category] ?? CATEGORY_MAP.personal;
  const [pop] = useState(() => new Animated.Value(1));

  const toggle = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(done ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(pop, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }),
    ]).start();
    setDone(task.id, date, !done);
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/task', params: { id: task.id } })}
      style={({ pressed }) => [styles.row, done && styles.rowDone, pressed && { transform: [{ scale: 0.985 }] }]}
    >
      <LinearGradient colors={cat.colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.accent} />

      <View style={styles.timeCol}>
        {task.time ? (
          <Txt weight="extrabold" size={15} color={done ? colors.textDim : colors.text}>
            {task.time}
          </Txt>
        ) : (
          <Txt size={20}>{cat.emoji}</Txt>
        )}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Txt weight="semibold" size={16} color={done ? colors.textDim : colors.text} style={done && styles.strike} numberOfLines={2}>
          {task.time ? `${cat.emoji}  ` : ''}
          {task.title}
        </Txt>
        <View style={styles.meta}>
          {showDate && (
            <Txt size={12} color={colors.textMuted} weight="medium">
              {relativeDayLabel(date)}
            </Txt>
          )}
          {task.repeat !== 'none' && (
            <View style={styles.metaItem}>
              <Ionicons name="repeat" size={12} color={colors.cyan} />
              <Txt size={12} color={colors.cyan} weight="medium">
                {repeatLabel(task)}
              </Txt>
            </View>
          )}
          {!!task.note && (
            <Txt size={12} color={colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>
              {task.note}
            </Txt>
          )}
        </View>
      </View>

      <Pressable onPress={toggle} hitSlop={12}>
        <Animated.View style={{ transform: [{ scale: pop }] }}>
          {done ? (
            <LinearGradient colors={['#34E5A6', '#3DD6F5']} style={styles.check}>
              <Ionicons name="checkmark" size={18} color="#07051A" />
            </LinearGradient>
          ) : (
            <View style={[styles.check, styles.checkIdle, { borderColor: cat.colors[0] }]} />
          )}
        </Animated.View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingRight: 16,
    paddingLeft: 18,
    marginBottom: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rowDone: { opacity: 0.6 },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  timeCol: { width: 48, alignItems: 'center' },
  strike: { textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  check: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  checkIdle: { borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.03)' },
});
