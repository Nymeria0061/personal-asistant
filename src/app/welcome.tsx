import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '../components/Aurora';
import { GradientButton, Txt } from '../components/ui';
import { VoiceOrb } from '../components/VoiceOrb';
import { VoicePicker } from '../components/VoicePicker';
import { requestPermission } from '../lib/notifications';
import { getState, updateSettings } from '../lib/store';
import { speak } from '../lib/voice';
import { colors, fonts, radius, webNoOutline } from '../theme';

const FEATURES: [keyof typeof Ionicons.glyphMap, string, string][] = [
  ['mic', 'Konuşarak ekle', '“Yarın 9’da ilaç içmeyi hatırlat” demen yeterli'],
  ['notifications', 'Zamanında hatırlatır', 'Uygulama kapalı olsa bile bildirim gelir'],
  ['repeat', 'Rutinlerini takip eder', 'Her gün, hafta içi, her pazartesi…'],
];

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(getState().settings.name);

  const start = async () => {
    updateSettings({ name: name.trim(), onboarded: true });
    await requestPermission().catch(() => false);
    speak(`Hoş geldin${name.trim() ? ` ${name.trim()}` : ''}! Ben senin kişisel asistanınım. Neyi hatırlatmamı istersin?`);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora intensity={1.2} />
      <View style={[styles.wrap, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <View style={{ alignItems: 'center' }}>
          <VoiceOrb size={130} />
          <Txt weight="extrabold" size={34} style={{ textAlign: 'center', letterSpacing: -1, marginTop: -10 }}>
            Asistanım
          </Txt>
          <Txt color={colors.textMuted} size={16} style={{ textAlign: 'center', marginTop: 6 }}>
            Unutmaman gereken her şey, tek bir sesle.
          </Txt>
        </View>

        <View style={{ gap: 14 }}>
          {FEATURES.map(([icon, title, desc]) => (
            <View key={title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name={icon} size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt weight="bold">{title}</Txt>
                <Txt size={13} color={colors.textMuted}>
                  {desc}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 14 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Sana nasıl hitap edeyim?"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            returnKeyType="done"
          />
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Txt size={13} color={colors.textMuted}>
              Asistanının sesi
            </Txt>
            <VoicePicker showList={false} />
          </View>
          <GradientButton label="Başlayalım" icon={<Ionicons name="sparkles" size={18} color="#fff" />} onPress={start} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  feature: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(124,92,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.5)',
  },
  input: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 15,
    textAlign: 'center',
    ...webNoOutline,
  },
});
