import { CATEGORY_MAP } from './categories';
import { addDays, detectIntent, matchScore, startOfDay, toISODate, trLower, withLocative } from './parser';
import { isDone, overdueTasks, relativeDayLabel, repeatLabel, tasksForDate } from './schedule';
import { addNote, addTask, deleteTask, getState, pushChat, setDone } from './store';
import type { Task } from './types';
import { speak } from './voice';

export const SUGGESTIONS = [
  'Bugün ne var?',
  "Yarın sabah 9'da ilaç içmeyi hatırlat",
  "Her gün 22:00'de dişlerimi fırçala",
  '30 dakika sonra çamaşırları as',
  'Not al: wifi şifresi kapının arkasında',
  'Yarın neler var?',
];

export const HELP_TEXT =
  'Bana doğal konuşarak görev ekleyebilirsin: "yarın 9\'da ilaç içmeyi hatırlat", "her pazartesi 10\'da toplantı", ' +
  '"yarım saat sonra fırını kapat". "Bugün ne var?" diye sorabilir, "not al ..." diyerek not bırakabilir, ' +
  '"süt al bitti" diyerek bir görevi tamamlayabilirsin. Ayarlardan "Seslenince uyan"ı açarsan "Asistan" demen yeterli, "Efendim" diye cevap veririm.';

function describeWhen(t: Pick<Task, 'date' | 'time' | 'repeat'>): string {
  if (t.repeat !== 'none') {
    const r = trLower(repeatLabel(t));
    return t.time ? `${r} saat ${withLocative(t.time)}` : r;
  }
  const day = relativeDayLabel(t.date);
  return t.time ? `${day} saat ${withLocative(t.time)}` : day;
}

function listForDay(offset: number): string {
  const state = getState();
  const date = toISODate(addDays(startOfDay(new Date()), offset));
  const label = offset === 0 ? 'Bugün' : 'Yarın';
  const tasks = tasksForDate(state, date);
  const open = tasks.filter((t) => !isDone(state, t, date));
  const overdue = offset === 0 ? overdueTasks(state, date) : [];

  if (!tasks.length && !overdue.length) {
    return offset === 0 ? 'Bugün için planlanmış bir şey yok. Keyfini çıkar! 🌿' : 'Yarın için henüz bir şey yok.';
  }
  if (!open.length && !overdue.length) return `${offset === 0 ? 'Bugünkü' : 'Yarınki'} ${tasks.length} görevin hepsi tamam. Harikasın! 🎉`;

  const items = open.map((t) => (t.time ? `${withLocative(t.time)} ${t.title}` : t.title));
  let text = `${label} ${open.length} görevin var: ${items.join(', ')}.`;
  if (overdue.length) text += ` Ayrıca ${overdue.length} gecikmiş görevin var: ${overdue.map((t) => t.title).join(', ')}.`;
  return text;
}

function weekSummary(): string {
  const state = getState();
  const today = startOfDay(new Date());
  const parts: string[] = [];
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const date = toISODate(addDays(today, i));
    const open = tasksForDate(state, date).filter((t) => !isDone(state, t, date));
    if (open.length) {
      total += open.length;
      parts.push(`${relativeDayLabel(date)} ${open.length}`);
    }
  }
  return total ? `Önümüzdeki 7 günde ${total} görev var. ${parts.join(', ')}.` : 'Önümüzdeki hafta boş görünüyor.';
}

function findTask(query: string): Task | null {
  const state = getState();
  const today = toISODate(new Date());
  const candidates = [...tasksForDate(state, today).filter((t) => !isDone(state, t, today)), ...overdueTasks(state, today), ...state.tasks];
  let best: Task | null = null;
  let bestScore = 0;
  for (const t of candidates) {
    const sc = matchScore(query, t.title);
    if (sc > bestScore) {
      best = t;
      bestScore = sc;
    }
  }
  return best;
}

/**
 * Kullanıcı mesajını işler, gerekli eylemi yapar ve yanıtı döner.
 * Yanıt sohbet geçmişine eklenir ve (ayar açıksa) sesli okunur.
 */
export function respond(input: string, opts: { speak?: boolean } = {}): string {
  const text = input.trim();
  if (!text) return '';
  pushChat('user', text);
  const reply = think(text);
  pushChat('assistant', reply);
  if (opts.speak ?? getState().settings.voiceReply) speak(reply);
  return reply;
}

function think(text: string): string {
  const intent = detectIntent(text);
  const { settings } = getState();
  switch (intent.type) {
    case 'empty':
      return 'Seni dinliyorum.';
    case 'help':
      return HELP_TEXT;
    case 'greet':
      return `Merhaba${settings.name ? ` ${settings.name}` : ''}! ${listForDay(0)}`;
    case 'list':
      return listForDay(intent.offset);
    case 'week':
      return weekSummary();
    case 'readNotes': {
      const notes = getState().notes;
      if (!notes.length) return 'Henüz hiç notun yok.';
      const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
      return `Son notların: ${sorted.slice(0, 5).map((n) => n.text).join('. ')}.`;
    }
    case 'note':
      if (!intent.text) return 'Neyi not almamı istersin?';
      addNote(intent.text);
      return `Not aldım: “${intent.text}” 📝`;
    case 'done': {
      const task = findTask(intent.query);
      if (!task) return 'Bu isimde bir görev bulamadım.';
      const date = task.repeat === 'none' ? task.date : toISODate(new Date());
      setDone(task.id, date, true);
      return `Harika! “${task.title}” tamamlandı. ✅`;
    }
    case 'delete': {
      const task = findTask(intent.query);
      if (!task) return 'Silinecek görevi bulamadım.';
      deleteTask(task.id);
      return `“${task.title}” silindi.`;
    }
    case 'add': {
      if (!intent.title) return 'Neyi hatırlatmamı istersin? Örneğin: “yarın 9’da ilaç içmeyi hatırlat”.';
      const task = addTask({ title: intent.title, date: intent.date, time: intent.time, repeat: intent.repeat });
      const emoji = CATEGORY_MAP[task.category].emoji;
      const when = describeWhen(task);
      return task.time
        ? `Tamam! ${emoji} “${task.title}” için ${when} hatırlatacağım.`
        : `${emoji} “${task.title}” ${when} listene eklendi.`;
    }
  }
}
