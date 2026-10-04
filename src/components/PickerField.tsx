import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { fromISODate, pad, toISODate } from '../lib/parser';
import { formatLongDate } from '../lib/schedule';
import { colors, fonts, radius, webNoOutline } from '../theme';
import { Txt } from './ui';

type Mode = 'date' | 'time';

function toDate(mode: Mode, value: string): Date {
  if (mode === 'date') return value ? fromISODate(value) : new Date();
  const d = new Date();
  if (value) {
    const [h, m] = value.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
  }
  return d;
}

function fromDate(mode: Mode, d: Date): string {
  return mode === 'date' ? toISODate(d) : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Platforma uygun tarih/saat seçici. Android'de sistem diyaloğu, iOS'ta satır içi
 * kompakt seçici, web'de metin alanı kullanılır.
 */
export function PickerField({
  mode,
  value,
  onChange,
  placeholder,
  clearable,
}: {
  mode: Mode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  clearable?: boolean;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const icon = mode === 'date' ? 'calendar-outline' : 'alarm-outline';
  const label = value ? (mode === 'date' ? formatLongDate(fromISODate(value)) : value) : placeholder ?? '—';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.field}>
        <Ionicons name={icon} size={18} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={mode === 'date' ? 'YYYY-AA-GG' : 'SS:DD'}
          placeholderTextColor={colors.textDim}
          style={styles.webInput}
        />
      </View>
    );
  }

  const handle = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type === 'set' && d) onChange(fromDate(mode, d));
    if (Platform.OS === 'ios' && e.type !== 'set') setIosOpen(false);
  };

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(mode, value), mode, is24Hour: true, onChange: handle });
    } else {
      setIosOpen((v) => !v);
    }
  };

  return (
    <View>
      <Pressable onPress={open} style={styles.field}>
        <Ionicons name={icon} size={18} color={value ? colors.cyan : colors.textMuted} />
        <Txt weight="semibold" color={value ? colors.text : colors.textMuted} style={{ flex: 1 }}>
          {label}
        </Txt>
        {clearable && !!value && (
          <Pressable hitSlop={10} onPress={() => onChange('')}>
            <Ionicons name="close-circle" size={18} color={colors.textDim} />
          </Pressable>
        )}
      </Pressable>
      {Platform.OS === 'ios' && iosOpen && (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          display={mode === 'date' ? 'inline' : 'spinner'}
          themeVariant="dark"
          locale="tr-TR"
          accentColor={colors.violet}
          onChange={handle}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  webInput: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, padding: 0, ...webNoOutline },
});
