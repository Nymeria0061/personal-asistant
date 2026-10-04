import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '../../components/Aurora';
import { PickerField } from '../../components/PickerField';
import { Chip, Glass, GradientButton, SectionTitle, Txt } from '../../components/ui';
import { getPermissionStatus, requestPermission, sendTestNotification, supported } from '../../lib/notifications';
import { resetAll, updateSettings, useAppState } from '../../lib/store';
import { isRecognitionAvailable, speak } from '../../lib/voice';
import { colors, fonts, webNoOutline } from '../../theme';

const REMIND = [0, 5, 10, 15, 30];
const RATES: [string, number][] = [
  ['Yavaş', 0.85],
  ['Normal', 1],
  ['Hızlı', 1.2],
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, tasks, notes } = useAppState();
  const [perm, setPerm] = useState<string>('…');

  useFocusEffect(
    useCallback(() => {
      getPermissionStatus().then(setPerm);
    }, []),
  );

  const askPerm = async () => {
    await requestPermission();
    setPerm(await getPermissionStatus());
  };

  const wipe = () => {
    const doIt = () => resetAll();
    if (Platform.OS === 'web') return doIt();
    Alert.alert('Tüm veriler silinsin mi?', 'Görevler, notlar ve ayarlar kalıcı olarak silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Hepsini sil', style: 'destructive', onPress: doIt },
    ]);
  };

  const voiceOk = isRecognitionAvailable();

  return (
    <View style={{ flex: 1 }}>
      <Aurora intensity={0.5} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 150, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        <Txt weight="extrabold" size={32} style={{ letterSpacing: -1 }}>
          Ayarlar
        </Txt>

        <SectionTitle title="Profil" />
        <Glass style={styles.card}>
          <Row icon="person-circle-outline" label="Adın">
            <TextInput
              value={settings.name}
              onChangeText={(name) => updateSettings({ name })}
              placeholder="İsmin"
              placeholderTextColor={colors.textDim}
              style={styles.nameInput}
            />
          </Row>
        </Glass>

        <SectionTitle title="Bildirimler" />
        <Glass style={styles.card}>
          <Row icon="notifications-outline" label="Bildirim izni" hint={permLabel(perm)}>
            {perm !== 'granted' && supported && <GradientButton small label="İzin ver" onPress={askPerm} />}
            {perm === 'granted' && <Ionicons name="checkmark-circle" size={24} color={colors.mint} />}
          </Row>
          <Divider />
          <Txt weight="semibold" style={{ marginBottom: 10 }}>
            Varsayılan hatırlatma
          </Txt>
          <View style={styles.wrap}>
            {REMIND.map((m) => (
              <Chip key={m} label={m ? `${m} dk önce` : 'Tam vaktinde'} active={settings.remindBefore === m} onPress={() => updateSettings({ remindBefore: m })} />
            ))}
          </View>
          <Divider />
          <Row icon="sunny-outline" label="Sabah özeti" hint="Günün planını her sabah bildirimle gönderir">
            <Switch
              value={settings.dailySummary}
              onValueChange={(dailySummary) => updateSettings({ dailySummary })}
              trackColor={{ true: colors.violet, false: colors.surfaceStrong }}
              thumbColor="#fff"
            />
          </Row>
          {settings.dailySummary && (
            <View style={{ marginTop: 10 }}>
              <PickerField mode="time" value={settings.summaryTime} onChange={(summaryTime) => summaryTime && updateSettings({ summaryTime })} />
            </View>
          )}
          {supported && perm === 'granted' && (
            <Pressable onPress={sendTestNotification} style={styles.link}>
              <Ionicons name="paper-plane-outline" size={16} color={colors.cyan} />
              <Txt color={colors.cyan} weight="semibold" size={14}>
                Deneme bildirimi gönder (3 sn)
              </Txt>
            </Pressable>
          )}
        </Glass>

        <SectionTitle title="Ses" />
        <Glass style={styles.card}>
          <Row icon="mic-outline" label="Sesli komut" hint={voiceOk ? 'Hazır · Türkçe' : 'Bu derlemede yok — development build gerekir'}>
            <Ionicons name={voiceOk ? 'checkmark-circle' : 'information-circle'} size={24} color={voiceOk ? colors.mint : colors.amber} />
          </Row>
          <Divider />
          <Row icon="chatbubble-ellipses-outline" label="Yanıtları sesli oku">
            <Switch value={settings.voiceReply} onValueChange={(voiceReply) => updateSettings({ voiceReply })} trackColor={{ true: colors.violet, false: colors.surfaceStrong }} thumbColor="#fff" />
          </Row>
          <Divider />
          <Row icon="volume-high-outline" label="Hatırlatmaları sesli oku" hint="Uygulama açıkken gelen hatırlatmaları okur">
            <Switch value={settings.speakReminders} onValueChange={(speakReminders) => updateSettings({ speakReminders })} trackColor={{ true: colors.violet, false: colors.surfaceStrong }} thumbColor="#fff" />
          </Row>
          <Divider />
          <Row icon="radio-outline" label="Asistan açılınca dinle">
            <Switch value={settings.autoListen} onValueChange={(autoListen) => updateSettings({ autoListen })} trackColor={{ true: colors.violet, false: colors.surfaceStrong }} thumbColor="#fff" />
          </Row>
          <Divider />
          <Txt weight="semibold" style={{ marginBottom: 10 }}>
            Konuşma hızı
          </Txt>
          <View style={styles.wrap}>
            {RATES.map(([label, rate]) => (
              <Chip
                key={label}
                label={label}
                active={settings.speechRate === rate}
                onPress={() => {
                  updateSettings({ speechRate: rate });
                  setTimeout(() => speak(`Merhaba${settings.name ? ` ${settings.name}` : ''}, ben senin asistanınım.`), 50);
                }}
              />
            ))}
          </View>
        </Glass>

        <SectionTitle title="Veri" />
        <Glass style={styles.card}>
          <Txt color={colors.textMuted} size={14}>
            {tasks.length} görev · {notes.length} not. Tüm veriler yalnızca bu cihazda saklanır.
          </Txt>
          <Pressable onPress={wipe} style={styles.link}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Txt color={colors.danger} weight="semibold" size={14}>
              Tüm verileri sil
            </Txt>
          </Pressable>
        </Glass>

        <Txt size={12} color={colors.textDim} style={{ textAlign: 'center', marginTop: 24 }}>
          Asistanım v{Constants.expoConfig?.version ?? '1.0.0'}
        </Txt>
      </ScrollView>
    </View>
  );
}

function permLabel(p: string) {
  switch (p) {
    case 'granted':
      return 'Açık — hatırlatmalar uygulama kapalıyken de gelir';
    case 'denied':
      return 'Kapalı — telefon ayarlarından açman gerekiyor';
    case 'unsupported':
      return 'Web önizlemede bildirim yok; telefonda çalışır';
    default:
      return 'Hatırlatmalar için izin gerekli';
  }
}

function Row({ icon, label, hint, children }: { icon: keyof typeof Ionicons.glyphMap; label: string; hint?: string; children?: ReactNode }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Txt weight="semibold">{label}</Txt>
        {hint && (
          <Txt size={12} color={colors.textMuted} style={{ marginTop: 2 }}>
            {hint}
          </Txt>
        )}
      </View>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  nameInput: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, minWidth: 120, textAlign: 'right', padding: 0, ...webNoOutline },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
});
