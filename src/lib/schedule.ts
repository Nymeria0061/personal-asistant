import { addDays, fromISODate, startOfDay, toISODate, trLower } from './parser';
import type { AppState, Task } from './types';

export const doneKey = (taskId: string, date: string) => `${taskId}|${date}`;

/** Görev verilen günde gerçekleşiyor mu? */
export function occursOn(task: Task, date: string): boolean {
  if (date < task.date) return false;
  const d = fromISODate(date);
  const start = fromISODate(task.date);
  switch (task.repeat) {
    case 'none':
      return date === task.date;
    case 'daily':
      return true;
    case 'weekdays':
      return d.getDay() >= 1 && d.getDay() <= 5;
    case 'weekly':
      return d.getDay() === start.getDay();
    case 'monthly': {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return d.getDate() === Math.min(start.getDate(), lastDay);
    }
  }
}

export function isDone(state: AppState, task: Task, date: string): boolean {
  return Boolean(state.done[doneKey(task.id, date)]);
}

export function byTime(a: Task, b: Task): number {
  if (a.time && b.time) return a.time.localeCompare(b.time);
  if (a.time) return -1;
  if (b.time) return 1;
  return a.createdAt - b.createdAt;
}

export function tasksForDate(state: AppState, date: string): Task[] {
  return state.tasks.filter((t) => occursOn(t, date)).sort(byTime);
}

/** Tarihi geçmiş ve tamamlanmamış tek seferlik görevler. */
export function overdueTasks(state: AppState, today: string): Task[] {
  return state.tasks
    .filter((t) => t.repeat === 'none' && t.date < today && !isDone(state, t, t.date))
    .sort((a, b) => a.date.localeCompare(b.date) || byTime(a, b));
}

export function taskDateTime(task: Task, date: string): Date | null {
  if (!task.time) return null;
  const [h, m] = task.time.split(':').map(Number);
  const d = fromISODate(date);
  d.setHours(h, m, 0, 0);
  return d;
}

export interface Occurrence {
  task: Task;
  date: string;
  at: Date;
}

/** Şu andan itibaren saatli, tamamlanmamış gerçekleşmeler (zamana göre sıralı). */
export function upcomingOccurrences(state: AppState, now: Date, days: number): Occurrence[] {
  const out: Occurrence[] = [];
  const today = startOfDay(now);
  for (let i = 0; i < days; i++) {
    const date = toISODate(addDays(today, i));
    for (const task of state.tasks) {
      if (!task.time || !occursOn(task, date) || isDone(state, task, date)) continue;
      const at = taskDateTime(task, date)!;
      if (at > now) out.push({ task, date, at });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function nextOccurrence(state: AppState, now: Date): Occurrence | null {
  return upcomingOccurrences(state, now, 8)[0] ?? null;
}

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const TR_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function dayName(d: Date, short = false): string {
  return (short ? TR_DAYS_SHORT : TR_DAYS)[d.getDay()];
}

export function formatLongDate(d: Date): string {
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${dayName(d)}`;
}

/** "bugün", "yarın", "cuma", "15 Ekim Perşembe" */
export function relativeDayLabel(date: string, now: Date = new Date()): string {
  const today = startOfDay(now);
  const d = fromISODate(date);
  const diff = Math.round((d.getTime() - today.getTime()) / 864e5);
  if (diff === 0) return 'bugün';
  if (diff === 1) return 'yarın';
  if (diff === -1) return 'dün';
  if (diff > 1 && diff < 7) return trLower(dayName(d));
  return formatLongDate(d);
}

export const REPEAT_LABELS: Record<Task['repeat'], string> = {
  none: 'Bir kez',
  daily: 'Her gün',
  weekdays: 'Hafta içi',
  weekly: 'Her hafta',
  monthly: 'Her ay',
};

export function repeatLabel(task: Pick<Task, 'repeat' | 'date'>): string {
  if (task.repeat === 'weekly') return `Her ${trLower(dayName(fromISODate(task.date)))}`;
  if (task.repeat === 'monthly') return `Her ayın ${fromISODate(task.date).getDate()}'i`;
  return REPEAT_LABELS[task.repeat];
}

/** "2 sa 15 dk sonra" */
export function untilLabel(at: Date, now: Date = new Date()): string {
  const mins = Math.round((at.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return 'şimdi';
  if (mins < 60) return `${mins} dk sonra`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h} sa ${m} dk sonra` : `${h} saat sonra`;
  const days = Math.round(h / 24);
  return `${days} gün sonra`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}
