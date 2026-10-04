import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { respond } from '../lib/assistant';
import { CATEGORY_MAP, guessCategory } from '../lib/categories';
import { detectIntent } from '../lib/parser';
import { relativeDayLabel, repeatLabel } from '../lib/schedule';
import { colors, fonts, gradients, radius, webNoOutline } from '../theme';
import { Txt } from './ui';

/**
 * Doğal dille hızlı ekleme. Yazarken ne anlaşıldığını canlı olarak gösterir.
 */
export function QuickAdd({ onReply }: { onReply?: (reply: string) => void }) {
  const [text, setText] = useState('');
  const intent = useMemo(() => (text.trim().length > 1 ? detectIntent(text) : null), [text]);

  const submit = () => {
    if (!text.trim()) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const reply = respond(text, { speak: false });
    onReply?.(reply);
    setText('');
  };

  return (
    <View>
      <View style={styles.box}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Yarın 9'da ilaç içmeyi hatırlat…"
          placeholderTextColor={colors.textDim}
          style={styles.input}
          onSubmitEditing={submit}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
        />
        {text.trim() ? (
          <Pressable onPress={submit} hitSlop={8}>
            <LinearGradient colors={gradients.accent} style={styles.iconBtn}>
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/assistant')} hitSlop={8} style={[styles.iconBtn, styles.micIdle]}>
            <Ionicons name="mic" size={20} color={colors.text} />
          </Pressable>
        )}
      </View>
      {intent && <Preview intent={intent} />}
    </View>
  );
}

function Preview({ intent }: { intent: ReturnType<typeof detectIntent> }) {
  const chips: { icon?: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [];
  if (intent.type === 'add') {
    if (!intent.title) return null;
    const cat = CATEGORY_MAP[guessCategory(intent.title)];
    chips.push({ label: `${cat.emoji} ${cat.label}`, color: cat.colors[0] });
    chips.push({ icon: 'calendar', label: relativeDayLabel(intent.date), color: colors.cyan });
    if (intent.time) chips.push({ icon: 'alarm', label: intent.time, color: colors.pink });
    if (intent.repeat !== 'none') chips.push({ icon: 'repeat', label: repeatLabel(intent), color: colors.mint });
  } else if (intent.type === 'note') {
    chips.push({ icon: 'document-text', label: 'Not olarak kaydedilecek', color: colors.amber });
  } else if (intent.type === 'list' || intent.type === 'week') {
    chips.push({ icon: 'list', label: 'Planını göstereceğim', color: colors.cyan });
  } else if (intent.type === 'done') {
    chips.push({ icon: 'checkmark-circle', label: 'Görevi tamamlayacağım', color: colors.mint });
  } else if (intent.type === 'delete') {
    chips.push({ icon: 'trash', label: 'Görevi sileceğim', color: colors.danger });
  } else return null;

  return (
    <View style={styles.preview}>
      {intent.type === 'add' && (
        <Txt weight="semibold" size={13} color={colors.text} numberOfLines={1} style={{ marginRight: 4 }}>
          “{intent.title}”
        </Txt>
      )}
      {chips.map((c) => (
        <View key={c.label} style={[styles.pchip, { borderColor: `${c.color}55` }]}>
          {c.icon && <Ionicons name={c.icon} size={12} color={c.color} />}
          <Txt size={12} weight="semibold" color={c.color}>
            {c.label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7,5,26,0.55)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15, paddingVertical: 8, ...webNoOutline },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  micIdle: { backgroundColor: colors.surfaceStrong },
  preview: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4 },
  pchip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
