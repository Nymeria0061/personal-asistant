/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectIntent, matchScore, parseTask, withLocative } from '../src/lib/parser.ts';

// 2026-10-07 Çarşamba 14:30
const NOW = new Date(2026, 9, 7, 14, 30);

const cases: [string, { title: string; date: string; time: string; repeat?: string }][] = [
  ["yarın sabah 9'da ilaç içmeyi hatırlat", { title: 'İlaç içmeyi', date: '2026-10-08', time: '09:00' }],
  ['her gün saat 22:00 dişlerimi fırçala', { title: 'Dişlerimi fırçala', date: '2026-10-07', time: '22:00', repeat: 'daily' }],
  ["akşam 8'de annemi ara", { title: 'Annemi ara', date: '2026-10-07', time: '20:00' }],
  ['10 dakika sonra çamaşırları as', { title: 'Çamaşırları as', date: '2026-10-07', time: '14:40' }],
  ['yarım saat sonra fırını kapat', { title: 'Fırını kapat', date: '2026-10-07', time: '15:00' }],
  ["her pazartesi 10'da haftalık toplantı", { title: 'Haftalık toplantı', date: '2026-10-12', time: '10:00', repeat: 'weekly' }],
  ['hafta içi sabah 7 buçukta spor', { title: 'Spor', date: '2026-10-07', time: '07:30', repeat: 'weekdays' }],
  ['cuma günü faturayı öde', { title: 'Faturayı öde', date: '2026-10-09', time: '' }],
  ['cumartesi market alışverişi', { title: 'Market alışverişi', date: '2026-10-10', time: '' }],
  ['15 ekim doktor randevusu saat 11.30', { title: 'Doktor randevusu', date: '2026-10-15', time: '11:30' }],
  ['süt al', { title: 'Süt al', date: '2026-10-07', time: '' }],
  ["saat 9'da kitap oku", { title: 'Kitap oku', date: '2026-10-08', time: '09:00' }],
  ["saat 3'te kargo gelecek", { title: 'Kargo gelecek', date: '2026-10-07', time: '15:00' }],
  ['bu akşam film izle', { title: 'Film izle', date: '2026-10-07', time: '19:00' }],
  ['her sabah vitamin al', { title: 'Vitamin al', date: '2026-10-07', time: '09:00', repeat: 'daily' }],
  ['akşam bir kahve iç', { title: 'Bir kahve iç', date: '2026-10-07', time: '19:00' }],
  ['saat dokuzda toplantı', { title: 'Toplantı', date: '2026-10-08', time: '09:00' }],
  ['gece 11de ilacını iç', { title: 'İlacını iç', date: '2026-10-07', time: '23:00' }],
  ['her ay kirayı öde', { title: 'Kirayı öde', date: '2026-10-07', time: '', repeat: 'monthly' }],
  ['bana yarın 14:00 dişçiye gitmeyi hatırlatır mısın', { title: 'Dişçiye gitmeyi', date: '2026-10-08', time: '14:00' }],
  ['pazar günü öğlen annemlere git', { title: 'Annemlere git', date: '2026-10-11', time: '12:00' }],
  ['2 saat sonra yemeği ocaktan al', { title: 'Yemeği ocaktan al', date: '2026-10-07', time: '16:30' }],
];

for (const [input, expected] of cases) {
  test(`parseTask: ${input}`, () => {
    const r = parseTask(input, NOW);
    assert.deepEqual(r, { repeat: 'none', ...expected });
  });
}

test('detectIntent: listeleme', () => {
  assert.deepEqual(detectIntent('bugün ne var?', NOW), { type: 'list', offset: 0 });
  assert.deepEqual(detectIntent('yarın neler var', NOW), { type: 'list', offset: 1 });
  assert.deepEqual(detectIntent('görevlerim', NOW), { type: 'list', offset: 0 });
  assert.deepEqual(detectIntent('bu hafta planım ne', NOW), { type: 'week' });
});

test('detectIntent: not', () => {
  assert.deepEqual(detectIntent('not al wifi şifresi 1234', NOW), { type: 'note', text: 'Wifi şifresi 1234' });
  assert.deepEqual(detectIntent('notlarımı oku', NOW), { type: 'readNotes' });
});

test('detectIntent: tamamla / sil', () => {
  assert.deepEqual(detectIntent('ilacımı içtim bitti', NOW), { type: 'done', query: 'ilacımı içtim' });
  assert.deepEqual(detectIntent('tamamla süt al', NOW), { type: 'done', query: 'süt al' });
  assert.deepEqual(detectIntent('sil market', NOW), { type: 'delete', query: 'market' });
});

test('detectIntent: ekleme (yarın içeren ama soru olmayan)', () => {
  const r = detectIntent("yarın 9'da toplantı", NOW);
  assert.equal(r.type, 'add');
});

test('withLocative', () => {
  assert.equal(withLocative('09:00'), "09:00'da");
  assert.equal(withLocative('15:00'), "15:00'te");
  assert.equal(withLocative('20:00'), "20:00'de");
  assert.equal(withLocative('10:30'), "10:30'da");
  assert.equal(withLocative('07:45'), "07:45'te");
  assert.equal(withLocative('12:40'), "12:40'ta");
});

test('matchScore', () => {
  assert.ok(matchScore('ilacımı', 'İlaç iç') >= 1);
  assert.equal(matchScore('market', 'Annemi ara'), 0);
});

test('findWakePhrase', async () => {
  const { findWakePhrase } = await import('../src/lib/parser.ts');
  assert.deepEqual(findWakePhrase('Asistan', 'asistan'), { remainder: '' });
  assert.deepEqual(findWakePhrase('hey asistanım', 'asistan'), { remainder: '' });
  assert.deepEqual(findWakePhrase('Asistan bugün ne var', 'asistan'), { remainder: 'bugün ne var' });
  assert.deepEqual(findWakePhrase('tamam Lara yarın 9da ilaç', 'Lara'), { remainder: 'yarın 9da ilaç' });
  assert.deepEqual(findWakePhrase('hey Siri', 'asistan'), null);
  assert.deepEqual(findWakePhrase('asistanlık işleri', 'asistan'), { remainder: 'işleri' });
  assert.equal(findWakePhrase('larangeli', 'lara')?.remainder, '');
  assert.equal(findWakePhrase('klara', 'lara'), null);
});
