import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aurora } from '../components/Aurora';
import { Txt } from '../components/ui';
import { VoiceOrb, type OrbMode } from '../components/VoiceOrb';
import { respond, SUGGESTIONS } from '../lib/assistant';
import { clearChat, getState, useAppState } from '../lib/store';
import { speak, stopSpeaking, useSpeechRecognition } from '../lib/voice';
import { colors, fonts, gradients, radius, webNoOutline } from '../theme';

export default function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const { chat, settings } = useAppState();
  const [speaking, setSpeaking] = useState(false);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const handle = useCallback((input: string) => {
    const reply = respond(input, { speak: false });
    if (reply && getState().settings.voiceReply) {
      setSpeaking(true);
      speak(reply, () => setSpeaking(false));
    }
  }, []);

  const sr = useSpeechRecognition(handle);

  // Açılışta otomatik dinlemeye başla
  useEffect(() => {
    if (settings.autoListen && sr.status === 'idle') {
      const t = setTimeout(() => sr.start(), 350);
      return () => clearTimeout(t);
    }
    // yalnızca ilk açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [chat.length, sr.transcript]);

  const toggleMic = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (sr.listening) sr.stop();
    else {
      stopSpeaking();
      setSpeaking(false);
      sr.start();
    }
  };

  const send = (value = text) => {
    if (!value.trim()) return;
    handle(value);
    setText('');
  };

  const mode: OrbMode = sr.listening ? 'listening' : speaking ? 'speaking' : 'idle';
  const recent = chat.slice(-20);
  const compact = recent.length > 0;

  const status = sr.listening
    ? sr.transcript || 'Dinliyorum…'
    : speaking
      ? 'Konuşuyorum…'
      : sr.status === 'unavailable'
        ? 'Yaz ya da klavyedeki 🎤 ile söyle'
        : sr.status === 'denied'
          ? 'Mikrofon izni gerekli'
          : 'Konuşmak için küreye dokun';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora intensity={1.15} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="chevron-down" size={24} color={colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Txt weight="bold" size={16}>
            Asistan
          </Txt>
          <Txt size={11} color={colors.mint} weight="semibold">
            ● çevrimiçi
          </Txt>
        </View>
        <Pressable onPress={clearChat} style={styles.iconBtn} hitSlop={10}>
          <Ionicons name="refresh" size={20} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 10, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {!compact && (
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Txt weight="extrabold" size={28} style={{ textAlign: 'center', letterSpacing: -0.6 }}>
              Merhaba{settings.name ? ` ${settings.name}` : ''}!{'\n'}Sana nasıl yardım edebilirim?
            </Txt>
          </View>
        )}
        {recent.map((m) => (
          <View key={m.id} style={[styles.bubbleRow, m.from === 'user' && { justifyContent: 'flex-end' }]}>
            {m.from === 'user' ? (
              <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.userBubble]}>
                <Txt size={15} weight="medium">
                  {m.text}
                </Txt>
              </LinearGradient>
            ) : (
              <View style={[styles.bubble, styles.botBubble]}>
                <Txt size={15} style={{ lineHeight: 21 }}>
                  {m.text}
                </Txt>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={toggleMic} disabled={sr.status === 'unavailable'}>
          <VoiceOrb size={compact ? 84 : 150} mode={mode} volume={sr.volume} />
        </Pressable>
        <Txt
          weight={sr.listening && sr.transcript ? 'bold' : 'semibold'}
          size={sr.listening && sr.transcript ? 18 : 14}
          color={sr.listening && sr.transcript ? colors.text : colors.textMuted}
          style={{ textAlign: 'center', paddingHorizontal: 30, marginTop: compact ? -10 : -20, minHeight: 24 }}
          numberOfLines={3}
        >
          {status}
        </Txt>
      </View>

      {!sr.listening && (
        <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => send(s)} style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}>
              <Txt size={13} weight="medium" color={colors.text}>
                {s}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.inputBox}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Bir şey yaz…"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            submitBehavior="submit"
          />
          {!!text.trim() && (
            <Pressable onPress={() => send()} hitSlop={8}>
              <LinearGradient colors={gradients.accent} style={styles.send}>
                <Ionicons name="arrow-up" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>
          )}
        </View>
        {sr.status !== 'unavailable' && (
          <Pressable onPress={toggleMic} hitSlop={6}>
            <LinearGradient colors={sr.listening ? (['#FF5C7A', '#FF5CA8'] as const) : gradients.orb} style={styles.mic}>
              <Ionicons name={sr.listening ? 'stop' : 'mic'} size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '84%', paddingVertical: 11, paddingHorizontal: 15, borderRadius: 20 },
  userBubble: { borderBottomRightRadius: 6 },
  botBubble: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 6 },
  suggestions: { gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4 },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(7,5,26,0.6)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingLeft: 18,
    paddingRight: 6,
    minHeight: 52,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15, paddingVertical: 12, ...webNoOutline },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  mic: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
