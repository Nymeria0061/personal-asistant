import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '../../components/Aurora';
import { ProgressRing } from '../../components/ProgressRing';
import { QuickAdd } from '../../components/QuickAdd';
import { TaskRow } from '../../components/TaskRow';
import { Glass, SectionTitle, Txt } from '../../components/ui';
import { VoiceOrb } from '../../components/VoiceOrb';
import { CATEGORY_MAP } from '../../lib/categories';
import { toISODate, trUpper } from '../../lib/parser';
import { formatLongDate, greeting, isDone, nextOccurrence, overdueTasks, relativeDayLabel, tasksForDate, untilLabel } from '../../lib/schedule';
import { useAppState } from '../../lib/store';
import { useNow } from '../../lib/useNow';
import { colors, gradients, radius } from '../../theme';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const state = useAppState();
  const now = useNow();
  const today = toISODate(now);
  const [reply, setReply] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const tasks = useMemo(() => tasksForDate(state, today), [state, today]);
  const open = tasks.filter((t) => !isDone(state, t, today));
  const completed = tasks.filter((t) => isDone(state, t, today));
  const overdue = useMemo(() => overdueTasks(state, today), [state, today]);
  const next = useMemo(() => nextOccurrence(state, now), [state, now]);

  const [dayNum, ...rest] = formatLongDate(now).split(' ');
  const name = state.settings.name;

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 150, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Başlık */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Txt weight="semibold" color={colors.textMuted} size={15}>
              {greeting(now)}
              {name ? `, ${name}` : ''} 👋
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
              <Txt weight="extrabold" size={44} style={{ letterSpacing: -1.5 }}>
                {dayNum}
              </Txt>
              <View>
                <Txt weight="bold" size={18}>
                  {rest[0]}
                </Txt>
                <Txt weight="medium" size={14} color={colors.textMuted}>
                  {rest[1]}
                </Txt>
              </View>
            </View>
          </View>
          <ProgressRing done={completed.length} total={tasks.length} />
        </View>

        {/* Kahraman kart: sıradaki + hızlı ekleme */}
        <View style={styles.heroWrap}>
          <LinearGradient colors={['rgba(124,92,255,0.65)', 'rgba(255,92,168,0.35)', 'rgba(61,214,245,0.45)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBorder}>
            <View style={styles.hero}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Pressable onPress={() => router.push('/assistant')} style={{ marginLeft: -18, marginVertical: -18 }}>
                  <VoiceOrb size={48} />
                </Pressable>
                <View style={{ flex: 1, marginLeft: -10 }}>
                  {next ? (
                    <>
                      <Txt size={12} weight="bold" color={colors.cyan} style={{ letterSpacing: 1 }}>
                        SIRADAKİ · {trUpper(untilLabel(next.at, now))}
                      </Txt>
                      <Txt size={18} weight="bold" numberOfLines={1} style={{ marginTop: 2 }}>
                        {CATEGORY_MAP[next.task.category].emoji} {next.task.title}
                      </Txt>
                      <Txt size={13} color={colors.textMuted} weight="medium">
                        {next.date === today ? 'Bugün' : relativeDayLabel(next.date, now)} · {next.task.time}
                      </Txt>
                    </>
                  ) : (
                    <>
                      <Txt size={12} weight="bold" color={colors.cyan} style={{ letterSpacing: 1 }}>
                        ASİSTANIN HAZIR
                      </Txt>
                      <Txt size={17} weight="bold" style={{ marginTop: 2 }}>
                        Ne hatırlatmamı istersin?
                      </Txt>
                      <Txt size={13} color={colors.textMuted}>
                        Yaz ya da mikrofona dokunup söyle.
                      </Txt>
                    </>
                  )}
                </View>
              </View>
              <View style={{ marginTop: 16 }}>
                <QuickAdd onReply={setReply} />
              </View>
              {reply && <ReplyBubble text={reply} onClose={() => setReply(null)} />}
            </View>
          </LinearGradient>
        </View>

        {overdue.length > 0 && (
          <>
            <SectionTitle
              title={`Gecikmiş · ${overdue.length}`}
              right={<Ionicons name="alert-circle" size={18} color={colors.danger} />}
            />
            {overdue.map((t) => (
              <TaskRow key={t.id} task={t} date={t.date} done={false} showDate />
            ))}
          </>
        )}

        <SectionTitle title={`Bugün · ${open.length}`} />
        {open.length === 0 ? (
          <Glass style={styles.empty}>
            <Txt size={34}>{tasks.length ? '🎉' : '🌿'}</Txt>
            <Txt weight="bold" size={17} style={{ textAlign: 'center' }}>
              {tasks.length ? 'Bugünlük hepsi tamam!' : 'Bugün sakin görünüyor'}
            </Txt>
            <Txt color={colors.textMuted} size={14} style={{ textAlign: 'center' }}>
              {tasks.length ? 'Harika iş çıkardın. Biraz dinlenmeyi hak ettin.' : 'Aşağıdaki mikrofona dokun ve “yarın 9’da ilaç içmeyi hatırlat” de.'}
            </Txt>
          </Glass>
        ) : (
          open.map((t) => <TaskRow key={t.id} task={t} date={today} done={false} />)
        )}

        {completed.length > 0 && (
          <>
            <Pressable onPress={() => setShowDone((v) => !v)}>
              <SectionTitle
                title={`Tamamlanan · ${completed.length}`}
                right={<Ionicons name={showDone ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />}
              />
            </Pressable>
            {showDone && completed.map((t) => <TaskRow key={t.id} task={t} date={today} done />)}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ReplyBubble({ text, onClose }: { text: string; onClose: () => void }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
    const t = setTimeout(onClose, 7000);
    return () => clearTimeout(t);
  }, [text, anim, onClose]);
  return (
    <Animated.View
      style={[
        styles.reply,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
      ]}
    >
      <LinearGradient colors={gradients.cool} style={styles.replyDot} />
      <Txt size={14} weight="medium" style={{ flex: 1 }}>
        {text}
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  heroWrap: {
    borderRadius: radius.xl,
    shadowColor: '#7C5CFF',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  heroBorder: { borderRadius: radius.xl, padding: 1.5 },
  hero: { borderRadius: radius.xl - 1.5, backgroundColor: 'rgba(14,9,40,0.88)', padding: 18 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28, paddingHorizontal: 24 },
  reply: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(61,214,245,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(61,214,245,0.25)',
  },
  replyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
});
