import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { updateSettings, useAppState } from '../lib/store';
import { isRecognitionAvailable } from '../lib/voice';
import { requestWakePermission, useWakeStatus } from '../lib/wake';
import { colors, fonts, radius, webNoOutline } from '../theme';
import { Txt } from './ui';

const STATUS_TEXT = {
  off: '',
  listening: '👂 Şu an dinliyor',
  paused: '⏸ Asistan ekranı açıkken ya da konuşurken durur',
  denied: '⚠️ Mikrofon izni gerekli — telefon ayarlarından izin ver',
  unavailable: '⚠️ Bu derlemede sesli komut yok',
} as const;

/** "Asistan" deyince uyanıp "Efendim" demesi için ayarlar. */
export function WakeSettings() {
  const { settings } = useAppState();
  const status = useWakeStatus();
  const [phrase, setPhrase] = useState(settings.wakePhrase);
  const available = isRecognitionAvailable();

  const toggle = async (on: boolean) => {
    if (on && !(await requestWakePermission())) return;
    updateSettings({ wakeWord: on });
  };

  return (
    <View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Txt weight="semibold">Seslenince uyan</Txt>
          <Txt size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
            “{settings.wakePhrase || 'Asistan'}” dediğinde “Efendim” der ve seni dinler. Uygulama açıkken çalışır.
          </Txt>
        </View>
        <Switch
          value={settings.wakeWord}
          onValueChange={toggle}
          disabled={!available}
          trackColor={{ true: colors.violet, false: colors.surfaceStrong }}
          thumbColor="#fff"
        />
      </View>
      {settings.wakeWord && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <View style={styles.inputRow}>
            <Txt size={13} color={colors.textMuted}>
              Uyandırma kelimesi
            </Txt>
            <TextInput
              value={phrase}
              onChangeText={setPhrase}
              onEndEditing={() => updateSettings({ wakePhrase: phrase.trim() || 'Asistan' })}
              onBlur={() => updateSettings({ wakePhrase: phrase.trim() || 'Asistan' })}
              placeholder="Asistan"
              placeholderTextColor={colors.textDim}
              style={styles.input}
            />
          </View>
          {!!STATUS_TEXT[status] && (
            <Txt size={12} color={status === 'listening' ? colors.mint : colors.textMuted}>
              {STATUS_TEXT[status]}
            </Txt>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: { flex: 1, textAlign: 'right', color: colors.text, fontFamily: fonts.bold, fontSize: 15, padding: 0, ...webNoOutline },
});
