import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '../../components/Aurora';
import { TaskRow } from '../../components/TaskRow';
import { Glass, SectionTitle, Txt } from '../../components/ui';
import { addDays, fromISODate, toISODate, trUpper } from '../../lib/parser';
import { dayName, formatLongDate, isDone, relativeDayLabel, tasksForDate } from '../../lib/schedule';
import { clearCompletedOneTime, useAppState } from '../../lib/store';
import { useNow } from '../../lib/useNow';
import { colors, gradients, radius } from '../../theme';

const DAYS = 21;

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const state = useAppState();
  const now = useNow(60000);
  const todayKey = toISODate(now);
  const [selected, setSelected] = useState(todayKey);

  const days = useMemo(() => {
    const today = fromISODate(todayKey);
    return Array.from({ length: DAYS }, (_, i) => addDays(today, i));
  }, [todayKey]);
  const counts = useMemo(
    () => Object.fromEntries(days.map((d) => [toISODate(d), tasksForDate(state, toISODate(d)).length])),
    [days, state],
  );
  const list = tasksForDate(state, selected);
  const recurring = state.tasks.filter((t) => t.repeat !== 'none');
  const hasCompletedOneTime = state.tasks.some((t) => t.repeat === 'none' && isDone(state, t, t.date));

  return (
    <View style={{ flex: 1 }}>
      <Aurora intensity={0.7} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Txt weight="extrabold" size={32} style={{ letterSpacing: -1 }}>
            Planım
          </Txt>
          <Pressable onPress={() => router.push({ pathname: '/task', params: { date: selected } })}>
            <LinearGradient colors={gradients.accent} style={styles.add}>
              <Ionicons name="add" size={24} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>

        <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {days.map((d) => {
            const iso = toISODate(d);
            const active = iso === selected;
            const n = counts[iso];
            const inner = (
              <>
                <Txt size={12} weight="semibold" color={active ? '#fff' : colors.textMuted}>
                  {dayName(d, true)}
                </Txt>
                <Txt size={22} weight="extrabold" color={active ? '#fff' : colors.text}>
                  {d.getDate()}
                </Txt>
                <View style={styles.dots}>
                  {Array.from({ length: Math.min(n, 3) }).map((_, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: active ? '#fff' : colors.pink }]} />
                  ))}
                </View>
              </>
            );
            return (
              <Pressable key={iso} onPress={() => setSelected(iso)}>
                {active ? (
                  <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.day}>
                    {inner}
                  </LinearGradient>
                ) : (
                  <View style={[styles.day, styles.dayIdle]}>{inner}</View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20 }}>
          <SectionTitle title={`${capitalize(relativeDayLabel(selected, now))} · ${formatLongDate(fromISODate(selected))}`} />
          {list.length === 0 ? (
            <Glass style={styles.empty}>
              <Txt color={colors.textMuted}>Bu gün için görev yok.</Txt>
            </Glass>
          ) : (
            list.map((t) => <TaskRow key={t.id} task={t} date={selected} done={isDone(state, t, selected)} />)
          )}

          {recurring.length > 0 && (
            <>
              <SectionTitle title={`Rutinlerim · ${recurring.length}`} />
              {recurring.map((t) => (
                <TaskRow key={t.id} task={t} date={selected} done={isDone(state, t, selected)} />
              ))}
            </>
          )}

          {hasCompletedOneTime && (
            <Pressable onPress={clearCompletedOneTime} style={styles.clear}>
              <Ionicons name="sparkles" size={16} color={colors.textMuted} />
              <Txt color={colors.textMuted} weight="semibold" size={13}>
                Tamamlanmış tek seferlik görevleri temizle
              </Txt>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function capitalize(s: string) {
  return trUpper(s.charAt(0)) + s.slice(1);
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18 },
  add: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  day: { width: 58, height: 84, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  empty: { padding: 22, alignItems: 'center' },
  clear: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, padding: 12 },
});
