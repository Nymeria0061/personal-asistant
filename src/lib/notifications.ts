import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { CATEGORY_MAP } from './categories';
import { addDays, startOfDay, toISODate, withLocative } from './parser';
import { isDone, tasksForDate, upcomingOccurrences } from './schedule';
import { getState, setDone, subscribe } from './store';
import type { AppState } from './types';
import { speak } from './voice';

// iOS en fazla 64 bekleyen bildirime izin verir; özet ve erteleme için pay bırakıyoruz.
const MAX_TASK_NOTIFICATIONS = 52;
const SUMMARY_DAYS = 7;
const WINDOW_DAYS = 30;
const SNOOZE_MINUTES = 10;

const CHANNEL_ID = 'reminders';
const CATEGORY_ID = 'reminder';
const PREFIX_TASK = 'task:';
const PREFIX_SUMMARY = 'summary:';

const native = Platform.OS !== 'web';
const webApi = () => !native && typeof window !== 'undefined' && 'Notification' in window;

/** Telefonda yerel bildirimler; bilgisayarda (web) sekme açıkken tarayıcı bildirimleri. */
export const supported = native || webApi();

export type ReminderData = { kind: 'task'; taskId: string; date: string } | { kind: 'summary' };

export async function setupNotifications() {
  if (!native) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Hatırlatmalar',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#7C5CFF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'default',
    });
  }

  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: 'done', buttonTitle: '✅ Tamamlandı', options: { opensAppToForeground: false } },
    { identifier: 'snooze', buttonTitle: `⏰ ${SNOOZE_MINUTES} dk ertele`, options: { opensAppToForeground: false } },
  ]);
}

export async function getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unsupported'> {
  if (!supported) return 'unsupported';
  if (!native) return window.Notification.permission === 'default' ? 'undetermined' : window.Notification.permission;
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
  if (!native) return (await window.Notification.requestPermission()) === 'granted';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const { granted } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return granted;
}

function summaryBody(state: AppState, date: string): string | null {
  const tasks = tasksForDate(state, date).filter((t) => !isDone(state, t, date));
  if (!tasks.length) return null;
  const list = tasks
    .slice(0, 4)
    .map((t) => (t.time ? `${t.time} ${t.title}` : t.title))
    .join(' • ');
  const more = tasks.length > 4 ? ` +${tasks.length - 4}` : '';
  return `Bugün ${tasks.length} görevin var: ${list}${more}`;
}

/**
 * Tüm planlı bildirimleri durumdan yeniden üretir. Tekrarlayan tetikleyiciler yerine
 * önümüzdeki günlerin her gerçekleşmesi ayrı planlanır; böylece tamamlanan bir gün sessiz kalır.
 */
export async function rescheduleAll(state: AppState = getState()) {
  if (!native) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX_TASK) || n.identifier.startsWith(PREFIX_SUMMARY))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const now = new Date();
  const jobs: Promise<unknown>[] = [];

  const occurrences = upcomingOccurrences(state, now, WINDOW_DAYS);
  let count = 0;
  for (const occ of occurrences) {
    if (count >= MAX_TASK_NOTIFICATIONS) break;
    const before = occ.task.remindBefore ?? state.settings.remindBefore;
    const fireAt = new Date(occ.at.getTime() - before * 60000);
    if (fireAt <= now) continue;
    const cat = CATEGORY_MAP[occ.task.category];
    const when = before ? `${before} dk sonra · ${occ.task.time}` : withLocative(occ.task.time);
    jobs.push(
      Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX_TASK}${occ.task.id}:${occ.date}`,
        content: {
          title: `${cat?.emoji ?? '⏰'} ${occ.task.title}`,
          body: occ.task.note ? `${when} — ${occ.task.note}` : `Hatırlatma: ${when}`,
          sound: 'default',
          categoryIdentifier: CATEGORY_ID,
          data: { kind: 'task', taskId: occ.task.id, date: occ.date } satisfies ReminderData,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: CHANNEL_ID },
      }),
    );
    count++;
  }

  if (state.settings.dailySummary) {
    const [h, m] = state.settings.summaryTime.split(':').map(Number);
    for (let i = 0; i < SUMMARY_DAYS; i++) {
      const day = addDays(startOfDay(now), i);
      const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
      if (at <= now) continue;
      const body = summaryBody(state, toISODate(day));
      if (!body) continue;
      jobs.push(
        Notifications.scheduleNotificationAsync({
          identifier: `${PREFIX_SUMMARY}${toISODate(day)}`,
          content: {
            title: `☀️ ${state.settings.name ? `Günaydın ${state.settings.name}` : 'Günün planı hazır'}`,
            body,
            sound: 'default',
            data: { kind: 'summary' } satisfies ReminderData,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_ID },
        }),
      );
    }
  }

  await Promise.all(jobs);
}

async function snooze(notification: Notifications.Notification) {
  const { title, body, data } = notification.request.content;
  await Notifications.scheduleNotificationAsync({
    identifier: `snooze:${Date.now()}`,
    content: { title, body: `Ertelendi · ${body ?? ''}`, sound: 'default', categoryIdentifier: CATEGORY_ID, data },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: SNOOZE_MINUTES * 60,
      channelId: CHANNEL_ID,
    },
  });
}

export async function handleResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as ReminderData | undefined;
  if (response.actionIdentifier === 'done' && data?.kind === 'task') {
    setDone(data.taskId, data.date, true);
  } else if (response.actionIdentifier === 'snooze') {
    await snooze(response.notification);
  }
  await Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
}

export async function sendTestNotification() {
  if (!supported) return;
  if (!native) {
    setTimeout(() => showWebNotification('✨ Asistanın burada', 'Bildirimler çalışıyor. Bu sekme açık kaldıkça hatırlatmalarını göndereceğim.'), 3000);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✨ Asistanın burada',
      body: 'Bildirimler çalışıyor. Hatırlatmalarını zamanında göndereceğim.',
      sound: 'default',
      categoryIdentifier: CATEGORY_ID,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: CHANNEL_ID },
  });
}

/**
 * Uygulama ömrü boyunca dinleyicileri bağlar ve durum değiştikçe bildirimleri yeniden planlar.
 * Temizleme fonksiyonu döner.
 */
export function startNotificationService(): () => void {
  if (!native) return supported ? startWebReminders() : () => {};

  let timer: ReturnType<typeof setTimeout> | undefined;
  let last: AppState | null = null;
  const schedule = () => {
    const s = getState();
    if (last && last.tasks === s.tasks && last.done === s.done && last.settings === s.settings) return;
    last = s;
    clearTimeout(timer);
    timer = setTimeout(() => rescheduleAll(s).catch(() => {}), 600);
  };
  const unsubscribe = subscribe(schedule);
  schedule();

  const received = Notifications.addNotificationReceivedListener((n) => {
    const { settings } = getState();
    if (!settings.speakReminders) return;
    const { title, body } = n.request.content;
    speak(`${stripEmoji(title ?? '')}. ${stripEmoji(body ?? '')}`);
  });
  const responded = Notifications.addNotificationResponseReceivedListener((r) => {
    handleResponse(r).catch(() => {});
  });
  // Uygulama bir bildirim düğmesiyle soğuk başlatıldıysa
  const last0 = Notifications.getLastNotificationResponse();
  if (last0) handleResponse(last0).catch(() => {});

  return () => {
    clearTimeout(timer);
    unsubscribe();
    received.remove();
    responded.remove();
  };
}

export function stripEmoji(s: string): string {
  return s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').trim();
}

// ---------- Web (bilgisayar) ----------
// Tarayıcıda zamanlanmış bildirim API'si yok; sekme açıkken dakikada birkaç kez kontrol edip
// zamanı gelen hatırlatmaları gösteririz. Gösterilenler tekrar gösterilmesin diye saklanır.

const FIRED_KEY = 'asistan/fired';
const LATE_WINDOW_MS = 10 * 60000;

function loadFired(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(FIRED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function markFired(key: string) {
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify([...loadFired(), key].slice(-300)));
  } catch {
    // depolama kapalıysa yalnızca bu oturumda tekrar gösterebiliriz
  }
}

function showWebNotification(title: string, body: string) {
  if (window.Notification.permission !== 'granted') return;
  try {
    const n = new window.Notification(title, { body, tag: title });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // bazı tarayıcılar yalnızca service worker üzerinden bildirime izin verir
  }
  if (getState().settings.speakReminders) speak(`${stripEmoji(title)}. ${stripEmoji(body)}`);
}

function checkWebReminders() {
  const state = getState();
  const now = new Date();
  const fired = new Set(loadFired());

  for (const occ of upcomingOccurrences(state, new Date(now.getTime() - LATE_WINDOW_MS - 3600e3), 2)) {
    const before = occ.task.remindBefore ?? state.settings.remindBefore;
    const fireAt = occ.at.getTime() - before * 60000;
    const key = `${PREFIX_TASK}${occ.task.id}:${occ.date}`;
    if (fireAt > now.getTime() || now.getTime() - fireAt > LATE_WINDOW_MS || fired.has(key)) continue;
    markFired(key);
    const cat = CATEGORY_MAP[occ.task.category];
    const when = before ? `${before} dk sonra · ${occ.task.time}` : withLocative(occ.task.time);
    showWebNotification(`${cat?.emoji ?? '⏰'} ${occ.task.title}`, occ.task.note ? `${when} — ${occ.task.note}` : `Hatırlatma: ${when}`);
  }

  if (state.settings.dailySummary) {
    const today = toISODate(now);
    const key = `${PREFIX_SUMMARY}${today}`;
    const [h, m] = state.settings.summaryTime.split(':').map(Number);
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime();
    if (now.getTime() >= at && now.getTime() - at < 2 * 3600e3 && !fired.has(key)) {
      markFired(key);
      const body = summaryBody(state, today);
      if (body) showWebNotification(`☀️ ${state.settings.name ? `Günaydın ${state.settings.name}` : 'Günün planı hazır'}`, body);
    }
  }
}

function startWebReminders(): () => void {
  checkWebReminders();
  const id = setInterval(checkWebReminders, 20000);
  const onVisible = () => document.visibilityState === 'visible' && checkWebReminders();
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
