// Ses seçimi. Cihazların ses listesinde cinsiyet bilgisi yok; bilinen ses adlarından tahmin ederiz.
// Tahmin edilemeyen seslerde istenen tona perde (pitch) ile yaklaşırız; kullanıcı ayrıca
// ayarlardan sesleri tek tek dinleyip seçebilir.

export type VoiceGender = 'female' | 'male' | 'auto';

export interface VoiceInfo {
  identifier: string;
  name: string;
  language: string;
  quality?: string;
}

// iOS: Yelda (kadın), Cem (erkek) · Windows/Edge: Emel, Ahmet · Chrome: "Google Türkçe" (kadın)
// Google Cloud adlandırması: Standard/Wavenet A, C, D kadın; B, E erkek.
const FEMALE = ['female', 'kadın', 'yelda', 'emel', 'filiz', 'seda', 'zeynep', 'elif', 'ayşe', 'ayse', 'google türkçe', 'standard-a', 'standard-c', 'standard-d', 'wavenet-a', 'wavenet-c', 'wavenet-d', 'neural2-a'];
const MALE = ['male', 'erkek', 'cem', 'ahmet', 'tolga', 'standard-b', 'standard-e', 'wavenet-b', 'wavenet-e'];

export function isTurkish(v: VoiceInfo): boolean {
  return v.language.toLowerCase().replace('_', '-').startsWith('tr');
}

export function guessGender(v: VoiceInfo): 'female' | 'male' | null {
  const n = `${v.name} ${v.identifier}`.toLowerCase();
  // "female" içinde "male" geçtiği için önce kadın listesine bakılır
  if (FEMALE.some((k) => n.includes(k))) return 'female';
  if (MALE.some((k) => new RegExp(`(^|[^a-zçğıöşü])${k}([^a-zçğıöşü]|$)`).test(n))) return 'male';
  return null;
}

const qualityRank = (v: VoiceInfo) => (v.quality === 'Enhanced' ? 1 : 0);

/**
 * Konuşma için ses ve perdeyi belirler.
 * - Kullanıcı belirli bir ses seçtiyse o kullanılır.
 * - Yoksa istenen cinsiyette bilinen bir Türkçe ses aranır (gelişmiş kalite önce).
 * - Bulunamazsa sistem sesi, perde ile istenen tona yaklaştırılarak kullanılır.
 */
export function chooseVoice(voices: VoiceInfo[], gender: VoiceGender, voiceId: string | null): { identifier?: string; pitch: number } {
  const tr = voices.filter(isTurkish);
  const picked = voiceId ? tr.find((v) => v.identifier === voiceId) : undefined;
  if (picked) return { identifier: picked.identifier, pitch: 1 };
  if (gender === 'auto') return { pitch: 1.05 };

  const match = tr.filter((v) => guessGender(v) === gender).sort((a, b) => qualityRank(b) - qualityRank(a))[0];
  if (match) return { identifier: match.identifier, pitch: gender === 'female' ? 1.05 : 0.97 };

  // Hiçbir sesin cinsiyeti bilinmiyorsa tonu yalnızca hafifçe kaydırırız; asıl çözüm listeden seçmek.
  const neutral = tr.find((v) => guessGender(v) === null);
  return { identifier: neutral?.identifier, pitch: gender === 'female' ? 1.15 : 0.88 };
}

/** Listede gösterilecek okunur ad: "tr-tr-x-cfs-local" gibi kodlar yerine "Ses 2". */
export function displayName(v: VoiceInfo, index: number): string {
  const looksLikeCode = /^[a-z]{2}[-_][a-z]{2}[-_]x[-_]/i.test(v.name) || !/[a-zçğıöşü]{3}/i.test(v.name);
  if (looksLikeCode) return `Ses ${index + 1}`;
  // "Microsoft Emel Online (Natural) - Turkish (Turkey)" → "Emel"
  return v.name
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s+-\s+.*$/, '')
    .replace(/^Microsoft\s+/, '')
    .replace(/\s+Online$/, '')
    .trim();
}
