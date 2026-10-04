import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '../../components/Aurora';
import { Txt } from '../../components/ui';
import { trLower } from '../../lib/parser';
import { addNote, deleteNote, updateNote, useAppState } from '../../lib/store';
import type { Note } from '../../lib/types';
import { colors, fonts, gradients, NOTE_COLORS, radius, webNoOutline } from '../../theme';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { notes } = useAppState();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  const sorted = useMemo(() => {
    const q = trLower(query.trim());
    return [...notes]
      .filter((n) => !q || trLower(n.text).includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
  }, [notes, query]);

  // İki sütunlu "masonry" düzeni
  const columns: Note[][] = [[], []];
  sorted.forEach((n, i) => columns[i % 2].push(n));

  const save = () => {
    if (!text.trim()) return;
    addNote(text.trim());
    setText('');
  };

  return (
    <View style={{ flex: 1 }}>
      <Aurora intensity={0.6} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 150, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Txt weight="extrabold" size={32} style={{ letterSpacing: -1, marginBottom: 16 }}>
          Notlarım
        </Txt>

        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Aklına geleni yaz… (ya da asistana “not al …” de)"
            placeholderTextColor={colors.textDim}
            multiline
            style={styles.composerInput}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable onPress={save} disabled={!text.trim()} style={{ opacity: text.trim() ? 1 : 0.4 }}>
              <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                <Ionicons name="add" size={18} color="#fff" />
                <Txt weight="bold" size={14}>
                  Kaydet
                </Txt>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {notes.length > 3 && (
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Notlarda ara"
              placeholderTextColor={colors.textDim}
              style={styles.searchInput}
            />
          </View>
        )}

        {sorted.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, gap: 8 }}>
            <Txt size={40}>📝</Txt>
            <Txt color={colors.textMuted}>{query ? 'Eşleşen not yok.' : 'Henüz not yok.'}</Txt>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {columns.map((col, ci) => (
              <View key={ci} style={{ flex: 1, gap: 12 }}>
                {col.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function NoteCard({ note }: { note: Note }) {
  const c = NOTE_COLORS[note.color % NOTE_COLORS.length];
  const remove = () => {
    if (Platform.OS === 'web') {
      deleteNote(note.id);
      return;
    }
    Alert.alert('Not silinsin mi?', note.text.slice(0, 80), [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteNote(note.id) },
    ]);
  };
  const date = new Date(note.createdAt);
  return (
    <Pressable onLongPress={remove}>
      <LinearGradient colors={c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.note}>
        <Txt size={15} weight="medium" style={{ lineHeight: 21 }}>
          {note.text}
        </Txt>
        <View style={styles.noteFooter}>
          <Txt size={11} color={colors.textMuted}>
            {date.getDate()}.{date.getMonth() + 1} · {String(date.getHours()).padStart(2, '0')}:{String(date.getMinutes()).padStart(2, '0')}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable hitSlop={8} onPress={() => updateNote(note.id, { pinned: !note.pinned })}>
              <Ionicons name={note.pinned ? 'pin' : 'pin-outline'} size={16} color={note.pinned ? colors.amber : colors.textMuted} />
            </Pressable>
            <Pressable hitSlop={8} onPress={remove}>
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  composer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
    marginBottom: 18,
  },
  composerInput: { color: colors.text, fontFamily: fonts.medium, fontSize: 15, minHeight: 56, textAlignVertical: 'top', ...webNoOutline },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 14, paddingVertical: 10, ...webNoOutline },
  note: { borderRadius: radius.md, padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border },
  noteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
