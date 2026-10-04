// Uyandırma kelimesi: uygulama açıkken arka planda "Asistan" demeni bekler.
// Duyunca asistan ekranını açar; asistan "Efendim" der ve komutu dinler.
// "Asistan, bugün ne var?" gibi tek nefeste söylenen komutlar doğrudan yanıtlanır.
//
// Sınır: telefonun kendi konuşma tanıyıcısı kullanıldığı için yalnızca uygulama ön plandayken
// (ekran açık) çalışır. Uygulama kapalıyken dinlemek için yerel bir uyandırma motoru gerekir.

import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { findWakePhrase } from './parser';
import { getState, subscribe } from './store';
import { claimMic, getRecognizer, isSpeaking, micOwner, subscribeSpeaking } from './voice';

export type WakeStatus = 'off' | 'listening' | 'paused' | 'denied' | 'unavailable';

// Kelimeden sonra bu kadar bekleyip devamı gelmezse "Efendim" denir.
const FOLLOW_UP_MS = 1100;

let status: WakeStatus = 'off';
const statusListeners = new Set<() => void>();
let pauseCount = 0;
let running = false;
let denied = false;
let appActive = AppState.currentState === 'active' || Platform.OS === 'web';
let restartTimer: ReturnType<typeof setTimeout> | undefined;
let followUpTimer: ReturnType<typeof setTimeout> | undefined;
let failures = 0;
let sessionStartedAt = 0;

function setStatus(s: WakeStatus) {
  if (status === s) return;
  status = s;
  statusListeners.forEach((l) => l());
}

export function useWakeStatus(): WakeStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => status,
  );
}

function enabled() {
  return getState().settings.wakeWord;
}

function computeIdleStatus(): WakeStatus {
  if (!enabled()) return 'off';
  if (!getRecognizer()) return 'unavailable';
  if (denied) return 'denied';
  return 'paused';
}

function canRun() {
  return enabled() && !denied && !!getRecognizer() && pauseCount === 0 && appActive && !isSpeaking() && micOwner() !== 'command';
}

function stopSession() {
  clearTimeout(followUpTimer);
  if (running && micOwner() === 'wake') {
    claimMic(null);
    getRecognizer()?.abort();
  }
  running = false;
  setStatus(computeIdleStatus());
}

function startSession() {
  clearTimeout(restartTimer);
  if (running || !canRun()) {
    if (!running) setStatus(computeIdleStatus());
    return;
  }
  const r = getRecognizer()!;
  const phrase = getState().settings.wakePhrase || 'Asistan';
  running = true;
  sessionStartedAt = Date.now();
  claimMic('wake');
  setStatus('listening');
  try {
    r.start({
      lang: 'tr-TR',
      interimResults: true,
      continuous: true,
      addsPunctuation: false,
      contextualStrings: [phrase, `hey ${phrase}`],
    });
  } catch {
    running = false;
    claimMic(null);
    scheduleRestart(true);
  }
}

function scheduleRestart(failed = false) {
  clearTimeout(restartTimer);
  if (failed) failures++;
  else if (Date.now() - sessionStartedAt > 5000) failures = 0;
  // art arda hata olursa giderek daha uzun bekle (en fazla 30 sn)
  const delay = failures ? Math.min(30000, 1000 * 2 ** failures) : 350;
  restartTimer = setTimeout(startSession, delay);
}

function trigger(remainder: string) {
  clearTimeout(followUpTimer);
  stopSession();
  const params = remainder.split(' ').filter(Boolean).length >= 2 ? { q: remainder } : { wake: '1' };
  router.push({ pathname: '/assistant', params });
}

/** Asistan ekranı açıkken (mikrofonu o kullanır) uyandırma dinlemesini durdurur. */
export function pauseWake() {
  pauseCount++;
  stopSession();
}

export function resumeWake() {
  pauseCount = Math.max(0, pauseCount - 1);
  scheduleRestart();
}

/** İlk açılışta izin ister; reddedilirse false döner. */
export async function requestWakePermission(): Promise<boolean> {
  const r = getRecognizer();
  if (!r) return false;
  const { granted } = await r.requestPermissionsAsync();
  denied = !granted;
  return granted;
}

export function startWakeService(): () => void {
  const r = getRecognizer();
  if (!r) {
    setStatus(computeIdleStatus());
    return () => {};
  }

  const subs = [
    r.addListener('result', (e) => {
      if (micOwner() !== 'wake') return;
      const text = e.results[0]?.transcript ?? '';
      const match = findWakePhrase(text, getState().settings.wakePhrase || 'Asistan');
      if (!match) return;
      clearTimeout(followUpTimer);
      if (e.isFinal || match.remainder.split(' ').filter(Boolean).length >= 3) {
        trigger(match.remainder);
      } else {
        // devamı gelebilir ("asistan… yarın 9'da…"); kısa bir süre bekle
        followUpTimer = setTimeout(() => trigger(match.remainder), FOLLOW_UP_MS);
      }
    }),
    r.addListener('error', (e) => {
      if (micOwner() !== 'wake') return;
      running = false;
      claimMic(null);
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        denied = true;
        setStatus('denied');
        return;
      }
      scheduleRestart(e.error !== 'no-speech' && e.error !== 'aborted');
    }),
    r.addListener('end', () => {
      if (micOwner() !== 'wake') return;
      running = false;
      claimMic(null);
      scheduleRestart();
    }),
  ];

  const appSub = AppState.addEventListener('change', (s) => {
    appActive = s === 'active';
    if (appActive) scheduleRestart();
    else stopSession();
  });

  const unsubSpeaking = subscribeSpeaking((speaking) => {
    if (speaking) stopSession();
    else scheduleRestart();
  });

  let last = getState().settings;
  const unsubStore = subscribe(() => {
    const s = getState().settings;
    if (s.wakeWord === last.wakeWord && s.wakePhrase === last.wakePhrase) return;
    last = s;
    stopSession();
    if (s.wakeWord) {
      denied = false;
      failures = 0;
      scheduleRestart();
    }
  });

  scheduleRestart();

  return () => {
    clearTimeout(restartTimer);
    stopSession();
    subs.forEach((x) => x.remove());
    appSub.remove();
    unsubSpeaking();
    unsubStore();
  };
}
