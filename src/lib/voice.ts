import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getState } from './store';
import { chooseVoice, isTurkish, type VoiceInfo } from './voices';

type SRModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

// Konuşma tanıma yerel bir modül gerektirir: Expo Go'da yoktur, development build'de vardır.
// Modül yoksa uygulama çökmesin diye tembel ve korumalı yüklenir.
let recognizer: SRModule | null | undefined;
export function getRecognizer(): SRModule | null {
  if (recognizer !== undefined) return recognizer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    recognizer = (require('expo-speech-recognition') as typeof import('expo-speech-recognition')).ExpoSpeechRecognitionModule;
  } catch {
    recognizer = null;
  }
  return recognizer;
}

// Mikrofonu aynı anda iki dinleyici kullanır: uyandırma kelimesi servisi ('wake') ve asistan
// ekranındaki komut dinleme ('command'). Olaylar ortak olduğu için her dinleyici yalnızca
// mikrofon kendisindeyken tepki verir.
export type MicOwner = 'wake' | 'command' | null;
let owner: MicOwner = null;
export const micOwner = () => owner;
export function claimMic(o: MicOwner) {
  owner = o;
}

// Asistan konuşurken uyandırma dinlemesi durur (kendi sesini duymasın diye).
let speaking = false;
let speakToken = 0;
const speakingListeners = new Set<(speaking: boolean) => void>();
export const isSpeaking = () => speaking;
export function subscribeSpeaking(fn: (speaking: boolean) => void): () => void {
  speakingListeners.add(fn);
  return () => speakingListeners.delete(fn);
}
function setSpeaking(v: boolean) {
  if (speaking === v) return;
  speaking = v;
  speakingListeners.forEach((fn) => fn(v));
}

export function isRecognitionAvailable(): boolean {
  const r = getRecognizer();
  if (!r) return false;
  try {
    return r.isRecognitionAvailable();
  } catch {
    return false;
  }
}

let voices: VoiceInfo[] = [];

/** Cihazdaki sesleri bir kez yükler (web'de sesler gecikmeli gelir, tekrar denenir). */
export async function loadVoices(): Promise<VoiceInfo[]> {
  for (let i = 0; i < 3 && !voices.length; i++) {
    try {
      voices = await Speech.getAvailableVoicesAsync();
    } catch {
      voices = [];
    }
    if (!voices.length) await new Promise((r) => setTimeout(r, 700));
  }
  return voices.filter(isTurkish);
}

export function speak(text: string, onDone?: () => void, override?: { voiceId?: string | null }) {
  const clean = text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/[“”"]/g, '')
    .replace(/•/g, ',')
    .trim();
  if (!clean) return;
  const { settings } = getState();
  const choice = chooseVoice(voices, settings.voiceGender, override?.voiceId !== undefined ? override.voiceId : settings.voiceId);
  Speech.stop();
  const token = ++speakToken;
  const done = () => {
    if (token === speakToken) setSpeaking(false);
    onDone?.();
  };
  setSpeaking(true);
  Speech.speak(clean, {
    language: 'tr-TR',
    voice: choice.identifier,
    rate: settings.speechRate,
    pitch: choice.pitch,
    onDone: done,
    onStopped: done,
    onError: done,
  });
}

export function stopSpeaking() {
  speakToken++;
  Speech.stop();
  setSpeaking(false);
}

export type ListenStatus = 'idle' | 'listening' | 'unavailable' | 'denied' | 'error';

/**
 * Türkçe konuşma tanıma kancası. `volume` 0..1 arası, küre animasyonu için.
 */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [status, setStatus] = useState<ListenStatus>(() => (getRecognizer() ? 'idle' : 'unavailable'));
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const finalRef = useRef('');
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  useEffect(() => {
    const r = getRecognizer();
    if (!r) return;
    const subs = [
      r.addListener('start', () => {
        if (owner !== 'command') return;
        finalRef.current = '';
        setTranscript('');
        setStatus('listening');
      }),
      r.addListener('result', (e) => {
        if (owner !== 'command') return;
        const text = e.results[0]?.transcript ?? '';
        setTranscript(text);
        if (e.isFinal) finalRef.current = text;
      }),
      r.addListener('volumechange', (e) => {
        if (owner !== 'command') return;
        setVolume(Math.max(0, Math.min(1, (e.value + 2) / 12)));
      }),
      r.addListener('error', (e) => {
        if (owner !== 'command') return;
        setStatus(e.error === 'not-allowed' ? 'denied' : e.error === 'no-speech' ? 'idle' : 'error');
      }),
      r.addListener('end', () => {
        if (owner !== 'command') return;
        claimMic(null);
        setVolume(0);
        setStatus((s) => (s === 'listening' ? 'idle' : s));
        const text = finalRef.current.trim();
        finalRef.current = '';
        if (text) onFinalRef.current(text);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const start = useCallback(async () => {
    const r = getRecognizer();
    if (!r) {
      setStatus('unavailable');
      return;
    }
    stopSpeaking();
    const perm = await r.requestPermissionsAsync();
    if (!perm.granted) {
      setStatus('denied');
      return;
    }
    setTranscript('');
    const fromWake = owner === 'wake';
    claimMic('command');
    if (fromWake) {
      // uyandırma dinlemesi hâlâ açıksa önce kapat
      r.abort();
      await new Promise((res) => setTimeout(res, 250));
    }
    r.start({
      lang: 'tr-TR',
      interimResults: true,
      continuous: false,
      addsPunctuation: false,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
    });
  }, []);

  const stop = useCallback(() => {
    if (owner === 'command') getRecognizer()?.stop();
  }, []);

  return { status, transcript, volume, start, stop, listening: status === 'listening' };
}
