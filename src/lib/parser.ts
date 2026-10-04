// Türkçe doğal dil ayrıştırıcı.
// "yarın sabah 9'da ilaç içmeyi hatırlat" → { title: "İlaç içmeyi", date, time: "09:00", repeat: "none" }
//
// Not: Hermes'te Unicode özellik kaçışları (\p{L}) ve lookbehind'a güvenmemek için
// harf sınıfı açıkça yazıldı ve kelime başı, metnin başına eklenen boşlukla eşleştirilir.

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface ParsedTask {
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM veya ''
  repeat: Repeat;
}

export type Intent =
  | { type: 'empty' }
  | { type: 'help' }
  | { type: 'greet' }
  | { type: 'list'; offset: number }
  | { type: 'week' }
  | { type: 'readNotes' }
  | { type: 'note'; text: string }
  | { type: 'done'; query: string }
  | { type: 'delete'; query: string }
  | ({ type: 'add' } & ParsedTask);

const LET = 'a-zçğıöşüâîû';
const L = `[${LET}]`;
const END = `(?![${LET}\\d])`;
const S = '\\s'; // kelime başı: metin her zaman boşlukla başlar

// getDay() sırasıyla
export const DAY_NAMES = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];
export const MONTH_NAMES = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];

// Uzun adlar önce (cumartesi > cuma, pazartesi > pazar)
const DAY_RE = 'pazartesi|cumartesi|çarşamba|perşembe|salı|cuma|pazar';
const MONTH_RE = MONTH_NAMES.join('|');

const UNITS: Record<string, number> = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const TENS: Record<string, number> = { on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50 };
const UNIT_RE = Object.keys(UNITS).join('|');
const TEN_RE = Object.keys(TENS).join('|');
const NUM_RE = `(?:\\d{1,2}|(?:${TEN_RE})(?:\\s*(?:${UNIT_RE}))?|${UNIT_RE})`;

const POD_RE = 'öğleden\\s+sonra|sabah|öğlen|öğle|akşam|gece';
const POD_TAIL = `(?:\\s+(${POD_RE})${L}*)?`;

type Pod = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night' | 'exact';

export function wordToNum(str: string | undefined | null): number | null {
  if (str == null) return null;
  const s = str.trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const m = s.match(new RegExp(`^(?:(${TEN_RE})\\s*)?(${UNIT_RE})?$`));
  if (!m || (!m[1] && !m[2])) return null;
  return (m[1] ? TENS[m[1]] : 0) + (m[2] ? UNITS[m[2]] : 0);
}

// Hermes yerel ayara duyarlı büyük/küçük harf dönüşümü yapmayabilir; Türkçe İ/ı elle eşlenir.
export function trLower(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().replace(/i̇/g, 'i');
}

export function trUpper(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}

export function normalize(text: string): string {
  return trLower(String(text || ''))
    .replace(/[’`´]/g, "'")
    .replace(/[,;!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function podFromWord(w: string | undefined): Pod | null {
  if (!w) return null;
  if (w.startsWith('sabah')) return 'morning';
  if (w.startsWith('öğleden')) return 'afternoon';
  if (w.startsWith('öğle')) return 'noon';
  if (w.startsWith('akşam')) return 'evening';
  if (w.startsWith('gece')) return 'night';
  return null;
}

const POD_DEFAULT: Record<Exclude<Pod, 'exact'>, number> = { morning: 9, noon: 12, afternoon: 15, evening: 19, night: 22 };

function adjustHour(h: number, pod: Pod | null): number {
  switch (pod) {
    case 'exact':
      return h;
    case 'morning':
      return h === 12 ? 0 : h;
    case 'noon':
    case 'afternoon':
      return h <= 6 ? h + 12 : h;
    case 'evening':
      return h < 12 ? h + 12 : h;
    case 'night':
      return h >= 5 && h < 12 ? h + 12 : h === 12 ? 0 : h;
    default:
      // "saat 3'te" günlük konuşmada büyük olasılıkla öğleden sonradır
      return h >= 1 && h <= 6 ? h + 12 : h;
  }
}

/** Görev cümlesini ayrıştırır. */
export function parseTask(input: string, now: Date = new Date()): ParsedTask {
  let s = ` ${normalize(input)} `;
  const today = startOfDay(now);
  let date: Date | null = null;
  let hour: number | null = null;
  let minute = 0;
  let repeat: Repeat = 'none';
  let pod: Pod | null = null;
  let relative = false;

  // Eşleşmeyi metinden çıkarır; fn false dönerse eşleşme geri alınır.
  const take = (pattern: string, fn: (m: RegExpMatchArray) => void | false): boolean => {
    const m = s.match(new RegExp(pattern));
    if (!m || m.index === undefined) return false;
    if (fn(m) === false) return false;
    s = `${s.slice(0, m.index)} ${s.slice(m.index + m[0].length)}`;
    return true;
  };
  const setPod = (w: string | undefined) => {
    const p = podFromWord(w);
    if (p) pod = p;
  };
  const nextWeekday = (target: number, allowToday: boolean) => {
    const diff = (target - today.getDay() + 7) % 7;
    return addDays(today, diff === 0 && !allowToday ? 7 : diff);
  };

  // 1) Göreli zaman: "10 dakika sonra", "yarım saat sonra", "2 buçuk saat sonra"
  take(`${S}(?:(${NUM_RE}|yarım)\\s*)?(buçuk\\s*)?(dakika|dk|saat)\\s*(?:sonra|içinde)${END}`, (m) => {
    let n = m[1] === 'yarım' ? 0.5 : m[1] ? wordToNum(m[1]) ?? 1 : 1;
    if (m[2]) n += 0.5;
    const at = new Date(now.getTime() + n * (m[3] === 'saat' ? 3600e3 : 60e3));
    date = startOfDay(at);
    hour = at.getHours();
    minute = at.getMinutes();
    relative = true;
  });

  // 2) Tekrar
  take(`${S}her\\s*gün${L}*${POD_TAIL}`, (m) => { repeat = 'daily'; setPod(m[1]); }) ||
    take(`${S}her\\s+(${POD_RE})${L}*`, (m) => { repeat = 'daily'; setPod(m[1]); }) ||
    take(`${S}(?:günlük|günde\\s+bir)${END}`, () => { repeat = 'daily'; }) ||
    take(`${S}(?:hafta\\s*iç(?:i|leri)|iş\\s*günleri)${L}*${POD_TAIL}`, (m) => { repeat = 'weekdays'; setPod(m[1]); }) ||
    take(`${S}her\\s+(${DAY_RE})${L}*(?:\\s+gün${L}*)?${POD_TAIL}`, (m) => {
      repeat = 'weekly';
      date = nextWeekday(DAY_NAMES.indexOf(m[1]), true);
      setPod(m[2]);
    }) ||
    take(`${S}(?:her\\s*hafta|haftalık)${L}*`, () => { repeat = 'weekly'; }) ||
    take(`${S}(?:her\\s*ay|aylık)${L}*`, () => { repeat = 'monthly'; });

  // 3) Tarih
  if (!date) {
    take(`${S}bu\\s+(${POD_RE})${L}*`, (m) => { date = today; setPod(m[1]); }) ||
      take(`${S}(?:yarından\\s+sonra|öbür\\s*gün${L}*|ertesi\\s*gün${L}*)${POD_TAIL}`, (m) => { date = addDays(today, 2); setPod(m[1]); }) ||
      take(`${S}yarın${L}*${POD_TAIL}`, (m) => { date = addDays(today, 1); setPod(m[1]); }) ||
      take(`${S}bugün${L}*${POD_TAIL}`, (m) => { date = today; setPod(m[1]); }) ||
      take(`${S}(${NUM_RE})\\s*gün\\s*sonra${L}*`, (m) => { date = addDays(today, wordToNum(m[1]) || 1); }) ||
      take(`${S}(\\d{1,2})\\s*(${MONTH_RE})${L}*`, (m) => {
        const day = parseInt(m[1], 10);
        const month = MONTH_NAMES.indexOf(m[2]);
        let d = new Date(today.getFullYear(), month, day);
        if (d < today) d = new Date(today.getFullYear() + 1, month, day);
        date = d;
      }) ||
      take(`${S}ayın\\s*(\\d{1,2})${L}*`, (m) => {
        const day = parseInt(m[1], 10);
        let d = new Date(today.getFullYear(), today.getMonth(), day);
        if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
        date = d;
      });
  }
  let nextWeek = false;
  take(`${S}(?:haftaya|gelecek\\s+hafta|önümüzdeki\\s+hafta)${END}`, () => { nextWeek = true; });
  if (!date) {
    take(`${S}(${DAY_RE})${L}*(?:\\s+gün${L}*)?${POD_TAIL}`, (m) => {
      date = nextWeekday(DAY_NAMES.indexOf(m[1]), false);
      setPod(m[2]);
    });
  }
  if (!date && nextWeek) date = addDays(today, 7);

  // 4) Saat
  if (hour === null) {
    // "akşam 8'de", "sabah saat 9 buçukta", "öğleden sonra 3'te"
    take(`${S}(${POD_RE})${L}*\\s+(saat\\s+)?(${NUM_RE})(?:[:.](\\d{2}))?('?${L}+)?(\\s*buçuk${L}*)?${END}`, (m) => {
      const h = wordToNum(m[3]);
      if (h === null || h > 24) return false;
      // "akşam bir kahve iç" → "bir" saat değil; yazıyla sayı için ek veya "saat" gerekir
      if (!/^\d/.test(m[3]) && !m[2] && !m[5] && !m[6]) return false;
      setPod(m[1]);
      hour = h;
      minute = m[4] ? parseInt(m[4], 10) : m[6] ? 30 : 0;
    });
  }
  if (hour === null) {
    take(`${S}(?:saat\\s+)?(\\d{1,2})[:.](\\d{2})(?:'?${L}*)?`, (m) => {
      const h = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      if (h > 23 || mm > 59) return false;
      hour = h;
      minute = mm;
      if (!pod) pod = 'exact';
    });
  }
  if (hour === null) {
    take(`${S}saat\\s+(${NUM_RE})(?:'?${L}*)?(\\s*buçuk${L}*)?`, (m) => {
      const h = wordToNum(m[1]);
      if (h === null || h > 24) return false;
      hour = h;
      minute = m[2] ? 30 : 0;
    });
  }
  if (hour === null) {
    take(`${S}(\\d{1,2})(?:'?(?:de|da|te|ta)${END}|\\s*buçuk${L}*)`, (m) => {
      const h = parseInt(m[1], 10);
      if (h > 24) return false;
      hour = h;
      minute = /buçuk/.test(m[0]) ? 30 : 0;
    });
  }
  // Cümle başında tek başına gün dilimi: "sabah ilaç iç"
  if (pod === null) take(`^${S}(${POD_RE})${L}*`, (m) => { setPod(m[1]); });

  let h = hour as number | null;
  const p = pod as Pod | null;
  if (h !== null && !relative) h = adjustHour(h, p);
  if (h === 24) h = 0;
  if (h === null && p && p !== 'exact') h = POD_DEFAULT[p];

  // 5) Varsayılan tarih: saati geçmişse yarına at
  let d = date as Date | null;
  if (!d) {
    d = today;
    if (h !== null && repeat === 'none' && new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, minute) <= now) {
      d = addDays(today, 1);
    }
  }

  return {
    title: cleanTitle(s),
    date: toISODate(d),
    time: h === null ? '' : `${pad(h)}:${pad(minute)}`,
    repeat,
  };
}

const FILLERS = [
  'bana',
  'lütfen',
  `bir\\s+hatırlatma\\s+(?:kur|oluştur|ekle)${L}*`,
  `hatırlatma\\s+(?:kur|oluştur|ekle)${L}*`,
  `hatırlat${L}*(?:\\s+mı[sş]ın|\\s+mi[sş]in)?`,
  `unutmamam\\s+gerek${L}*`,
  `unutma${L}*`,
  `(?:görevi?|görev\\s+olarak)\\s+ekle${L}*`,
  `listeye\\s+ekle${L}*`,
  `ekle(?:r\\s+mi[sş]in|yin)?`,
  `kaydet${L}*`,
  'saat',
];

export function cleanTitle(raw: string): string {
  let t = ` ${raw} `;
  for (const f of FILLERS) t = t.replace(new RegExp(`${S}${f}${END}`, 'g'), ' ');
  t = t
    .replace(/^\s*(?:yeni\s+)?görev\s*:?\s*/, ' ')
    .replace(new RegExp(`${S}(?:diye|için|ve)\\s*$`), ' ')
    .replace(new RegExp(`^\\s*(?:ve|de|da)${END}`), ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.:'-]+|[\s.:'-]+$/g, '')
    .trim();
  return capitalize(t);
}

export function capitalize(t: string): string {
  return t ? trUpper(t.charAt(0)) + t.slice(1) : '';
}

/** Sesli/yazılı komutun niyetini belirler. */
export function detectIntent(input: string, now: Date = new Date()): Intent {
  const s = normalize(input).replace(/[.]+$/g, '').trim();
  if (!s) return { type: 'empty' };

  if (/^(?:yardım|ne(?:ler)? yapabilirsin|nasıl kullan|komutlar)/.test(s)) return { type: 'help' };
  if (/^(?:merhaba|selam|günaydın|iyi akşamlar|iyi geceler|hey|nasılsın)$/.test(s)) return { type: 'greet' };

  const ask = `\\s(?:ne var|neler var|neler|plan${L}*|görev${L}*|program${L}*|yapacak${L}*|işler${L}*)${END}`;
  if (new RegExp(`(?:^|\\s)yarın${L}*.*${ask}`).test(s)) return { type: 'list', offset: 1 };
  if (new RegExp(`(?:^|\\s)bu\\s*hafta${L}*.*${ask}`).test(s)) return { type: 'week' };
  if (
    new RegExp(`(?:^|\\s)bu\\s*gün${L}*.*${ask}`).test(s) ||
    /^(?:görevlerim|görevleri (?:oku|listele|say)|listele|planım|programım|ne var|neler var|bugün)$/.test(s)
  ) {
    return { type: 'list', offset: 0 };
  }

  if (/^not(?:lar[a-zçğıöşü]*)?\s+(?:oku|göster|listele|neler)|^notlarım[ı]?(?:\s+oku)?$/.test(s)) return { type: 'readNotes' };
  const note =
    s.match(/^(?:şunu\s+)?not\s+(?:al|et|ekle|yaz)\s*:?\s*(.+)$/) ||
    s.match(/^not\s*:\s*(.+)$/) ||
    s.match(/^(.+?)\s+(?:diye\s+)?not\s+(?:al|et)$/);
  if (note) return { type: 'note', text: capitalize(note[1].trim().replace(/^[:\-\s]+/, '')) };

  const done =
    s.match(/^(?:tamamla|bitir|işaretle)\s+(.+)$/) ||
    s.match(/^(.+?)\s+(?:yaptım|bitti|tamamladım|tamamlandı|hallettim|hallettim|tamamlandı olarak işaretle)$/);
  if (done) return { type: 'done', query: done[1] };

  const del =
    s.match(/^(?:sil|kaldır|iptal et)\s+(.+)$/) ||
    s.match(/^(.+?)\s+(?:görevini\s+|hatırlatmasını\s+)?(?:sil|kaldır|iptal et)$/);
  if (del) return { type: 'delete', query: del[1] };

  return { type: 'add', ...parseTask(input, now) };
}

/** "09:00" → "09:00'da" (Türkçe ses uyumuna göre). */
export function withLocative(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const units: Record<number, string> = { 1: "'de", 2: "'de", 3: "'te", 4: "'te", 5: "'te", 6: "'da", 7: "'de", 8: "'de", 9: "'da" };
  const tens: Record<number, string> = { 0: "'da", 1: "'da", 2: "'de", 3: "'da", 4: "'ta", 5: "'de" };
  let suffix: string;
  if (m % 10) suffix = units[m % 10];
  else if (m) suffix = tens[m / 10];
  else if (h % 10) suffix = units[h % 10];
  else suffix = tens[h / 10] ?? "'da";
  return time + suffix;
}

/** Sorgu ile başlık arasındaki ortak kelime köklerini sayar (Türkçe ekleri tolere eder). */
export function matchScore(query: string, title: string): number {
  const words = (x: string) => normalize(x).split(/[^a-zçğıöşüâîû\d]+/).filter((w) => w.length > 1);
  const similar = (a: string, b: string) => {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    const shorter = Math.min(a.length, b.length);
    return shorter <= 2 ? a === b : i >= 3 && i >= shorter * 0.6;
  };
  const t = words(title);
  let score = 0;
  for (const w of words(query)) if (t.some((x) => similar(w, x))) score++;
  return score;
}
