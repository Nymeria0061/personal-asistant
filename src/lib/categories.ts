import { normalize } from './parser';
import type { CategoryId } from './types';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  colors: [string, string];
  keywords: string[];
}

export const CATEGORIES: Category[] = [
  {
    id: 'health',
    label: 'Sağlık',
    emoji: '💊',
    colors: ['#34E5A6', '#13B8A6'],
    keywords: ['ilaç', 'ilac', 'doktor', 'hastane', 'diş', 'vitamin', 'spor', 'yürüyüş', 'koş', 'su iç', 'egzersiz', 'yoga', 'antrenman', 'randevu', 'tansiyon', 'şeker ölç', 'uyku'],
  },
  {
    id: 'work',
    label: 'İş',
    emoji: '💼',
    colors: ['#5B8CFF', '#7C5CFF'],
    keywords: ['toplantı', 'mail', 'e-posta', 'eposta', 'rapor', 'sunum', 'proje', 'müşteri', 'patron', 'ofis', 'iş ', 'görüşme', 'teklif', 'fatura kes', 'ders', 'ödev', 'sınav'],
  },
  {
    id: 'shopping',
    label: 'Alışveriş',
    emoji: '🛒',
    colors: ['#FFB347', '#FF7A59'],
    keywords: ['market', 'al ', 'satın', 'alışveriş', 'sipariş', 'ekmek', 'süt', 'kargo', 'eczane'],
  },
  {
    id: 'home',
    label: 'Ev',
    emoji: '🏠',
    colors: ['#FFD25C', '#FF9F43'],
    keywords: ['fatura', 'kira', 'çamaşır', 'bulaşık', 'temizl', 'süpür', 'çiçek', 'sula', 'çöp', 'yemek yap', 'fırın', 'ütü', 'aidat', 'tamir'],
  },
  {
    id: 'social',
    label: 'Sosyal',
    emoji: '💬',
    colors: ['#FF5CA8', '#FF7AD9'],
    keywords: ['ara', 'anne', 'baba', 'arkadaş', 'doğum günü', 'kutla', 'hediye', 'buluş', 'mesaj', 'ziyaret', 'düğün', 'yemeğe'],
  },
  {
    id: 'personal',
    label: 'Kişisel',
    emoji: '✨',
    colors: ['#A78BFA', '#7C5CFF'],
    keywords: [],
  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<CategoryId, Category>;

/** Başlıktan kategori tahmini — kullanıcı istemeden görevleri renklendirir. */
export function guessCategory(title: string): CategoryId {
  const t = ` ${normalize(title)} `;
  for (const c of CATEGORIES) {
    if (c.keywords.some((k) => t.includes(` ${k}`))) return c.id;
  }
  return 'personal';
}
