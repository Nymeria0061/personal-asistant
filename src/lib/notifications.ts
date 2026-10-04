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

export const supported = Platform.OS !== 'web';

export type ReminderData = { kind: 'task'; taskId: string; date: string } | { kind: 'summary' };

export async function setupNotifications() {
  if (!supported) return;

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
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestPermission(): Promise<boolean> {
  if (!supported) return false;
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
  if (!supported) return;
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
  if (!supported) return () => {};

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
