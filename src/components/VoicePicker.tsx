import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { updateSettings, useAppState } from '../lib/store';
import { loadVoices, speak } from '../lib/voice';
import { displayName, guessGender, type VoiceGender, type VoiceInfo } from '../lib/voices';
import { colors, gradients, radius } from '../theme';
import { Chip, Txt } from './ui';

const GENDERS: [VoiceGender, string][] = [
  ['female', '👩 Kadın'],
  ['male', '👨 Erkek'],
  ['auto', '✨ Otomatik'],
];

const sample = (name: string) => `Merhaba${name ? ` ${name}` : ''}, ben senin asistanınım. Bugün neyi hatırlatayım?`;

/** Asistan sesinin cinsiyetini seçtirir ve cihazdaki Türkçe sesleri dinletip seçtirir. */
export function VoicePicker({ showList = true }: { showList?: boolean }) {
  const { settings } = useAppState();
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    loadVoices().then((v) => alive && setVoices(v));
    return () => {
      alive = false;
    };
  }, []);

  const chooseGender = (voiceGender: VoiceGender) => {
    updateSettings({ voiceGender, voiceId: null });
    // ayar kaydedildikten sonra yeni sesle konuş
    setTimeout(() => speak(sample(settings.name)), 50);
  };

  const chooseVoice = (v: VoiceInfo) => {
    const gender = guessGender(v);
    updateSettings({ voiceId: v.identifier, ...(gender ? { voiceGender: gender } : {}) });
    speak(sample(settings.name), undefined, { voiceId: v.identifier });
  };

  const visible = showAll ? voices : voices.slice(0, 6);

  return (
    <View>
      <View style={styles.wrap}>
        {GENDERS.map(([g, label]) => (
          <Chip key={g} label={label} active={!settings.voiceId && settings.voiceGender === g} onPress={() => chooseGender(g)} />
        ))}
      </View>

      {showList && voices.length > 1 && (
        <View style={{ marginTop: 14, gap: 8 }}>
          <Txt size={12} color={colors.textMuted}>
            Telefonundaki Türkçe sesler. Dinlemek ve seçmek için dokun:
          </Txt>
          {visible.map((v, i) => {
            const active = settings.voiceId === v.identifier;
            const g = guessGender(v);
            return (
              <Pressable key={v.identifier} onPress={() => chooseVoice(v)} style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { opacity: 0.8 }]}>
                {active ? (
                  <LinearGradient colors={gradients.accent} style={styles.radio}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </LinearGradient>
                ) : (
                  <View style={[styles.radio, styles.radioIdle]} />
                )}
                <View style={{ flex: 1 }}>
                  <Txt weight="semibold" size={14}>
                    {displayName(v, i)}
                    {g ? `  ${g === 'female' ? '👩' : '👨'}` : ''}
                  </Txt>
                  {v.quality === 'Enhanced' && (
                    <Txt size={11} color={colors.cyan}>
                      Yüksek kalite
                    </Txt>
                  )}
                </View>
                <Ionicons name="play-circle" size={26} color={active ? colors.pink : colors.textMuted} />
              </Pressable>
            );
          })}
          {voices.length > 6 && (
            <Pressable onPress={() => setShowAll((s) => !s)} style={{ paddingVertical: 6 }}>
              <Txt size={13} weight="semibold" color={colors.cyan}>
                {showAll ? 'Daha az göster' : `Tüm sesleri göster (${voices.length})`}
              </Txt>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: { borderColor: 'rgba(255,92,168,0.6)', backgroundColor: 'rgba(124,92,255,0.12)' },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  radioIdle: { borderWidth: 2, borderColor: colors.textDim },
});
