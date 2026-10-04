import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '../components/Aurora';
import { PickerField } from '../components/PickerField';
import { Chip, GradientButton, Txt } from '../components/ui';
import { CATEGORIES, guessCategory } from '../lib/categories';
import { toISODate, trUpper, type Repeat } from '../lib/parser';
import { REPEAT_LABELS } from '../lib/schedule';
import { addTask, deleteTask, getState, updateTask } from '../lib/store';
import type { CategoryId } from '../lib/types';
import { colors, fonts, radius, webNoOutline } from '../theme';

const REMIND_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Varsayılan', value: null },
  { label: 'Tam vaktinde', value: 0 },
  { label: '5 dk önce', value: 5 },
  { label: '15 dk önce', value: 15 },
  { label: '30 dk önce', value: 30 },
  { label: '1 saat önce', value: 60 },
];

export default function TaskEditor() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const existing = params.id ? getState().tasks.find((t) => t.id === params.id) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(existing?.date ?? params.date ?? toISODate(new Date()));
  const [time, setTime] = useState(existing?.time ?? '');
  const [repeat, setRepeat] = useState<Repeat>(existing?.repeat ?? 'none');
  const [category, setCategory] = useState<CategoryId | null>(existing?.category ?? null);
  const [remindBefore, setRemindBefore] = useState<number | null>(existing?.remindBefore ?? null);

  const effectiveCategory = category ?? guessCategory(title);

  const save = () => {
    if (!title.trim()) return;
    const data = { title: title.trim(), note: note.trim(), date, time, repeat, category: effectiveCategory, remindBefore };
    if (existing) updateTask(existing.id, data);
    else addTask(data);
    router.back();
  };

  const remove = () => {
    if (!existing) return;
    const doIt = () => {
      deleteTask(existing.id);
      router.back();
    };
    if (Platform.OS === 'web') return doIt();
    Alert.alert('Görev silinsin mi?', existing.title, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: doIt },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora intensity={0.5} />
      <View style={[styles.top, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.text} />
        </Pressable>
        <Txt weight="bold" size={17}>
          {existing ? 'Görevi düzenle' : 'Yeni görev'}
        </Txt>
        {existing ? (
          <Pressable onPress={remove} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 6 }} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Ne yapman gerekiyor?"
          placeholderTextColor={colors.textDim}
          style={styles.title}
          autoFocus={!existing}
          multiline
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Not ekle (isteğe bağlı)"
          placeholderTextColor={colors.textDim}
          style={styles.note}
          multiline
        />

        <Label text="Kategori" />
        <View style={styles.wrap}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={`${c.emoji} ${c.label}`} active={effectiveCategory === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </View>

        <Label text={repeat === 'none' ? 'Tarih' : 'Başlangıç'} />
        <PickerField mode="date" value={date} onChange={(v) => v && setDate(v)} />

        <Label text="Saat" />
        <PickerField mode="time" value={time} onChange={setTime} placeholder="Saat yok (gün içinde)" clearable />

        <Label text="Tekrar" />
        <View style={styles.wrap}>
          {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => (
            <Chip key={r} label={REPEAT_LABELS[r]} active={repeat === r} onPress={() => setRepeat(r)} />
          ))}
        </View>

        {!!time && (
          <>
            <Label text="Hatırlatma" />
            <View style={styles.wrap}>
              {REMIND_OPTIONS.map((o) => (
                <Chip key={o.label} label={o.label} active={remindBefore === o.value} onPress={() => setRemindBefore(o.value)} />
              ))}
            </View>
          </>
        )}

        <GradientButton
          label={existing ? 'Kaydet' : 'Görevi ekle'}
          icon={<Ionicons name="checkmark" size={20} color="#fff" />}
          onPress={save}
          disabled={!title.trim()}
          style={{ marginTop: 28 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }: { text: string }) {
  return (
    <Txt weight="bold" size={12} color={colors.textMuted} style={styles.label}>
      {trUpper(text)}
    </Txt>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 26, paddingVertical: 6, ...webNoOutline },
  note: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    minHeight: 48,
    ...webNoOutline,
  },
  label: { marginTop: 20, marginBottom: 8, letterSpacing: 1.2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
