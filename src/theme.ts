import { Platform } from 'react-native';

export const colors = {
  bg: '#07051A',
  bg2: '#120C33',
  surface: 'rgba(255,255,255,0.06)',
  surfaceStrong: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',
  text: '#F5F3FF',
  textMuted: '#A9A3CC',
  textDim: '#6E6894',
  violet: '#7C5CFF',
  pink: '#FF5CA8',
  cyan: '#3DD6F5',
  mint: '#34E5A6',
  amber: '#FFB347',
  danger: '#FF5C7A',
};

export const gradients = {
  background: ['#07051A', '#140B3A', '#0A0722'] as const,
  accent: ['#7C5CFF', '#FF5CA8'] as const,
  cool: ['#3DD6F5', '#7C5CFF'] as const,
  orb: ['#3DD6F5', '#7C5CFF', '#FF5CA8'] as const,
  success: ['#34E5A6', '#3DD6F5'] as const,
};

export const NOTE_COLORS: [string, string][] = [
  ['rgba(124,92,255,0.28)', 'rgba(124,92,255,0.08)'],
  ['rgba(255,92,168,0.26)', 'rgba(255,92,168,0.07)'],
  ['rgba(61,214,245,0.24)', 'rgba(61,214,245,0.06)'],
  ['rgba(52,229,166,0.22)', 'rgba(52,229,166,0.06)'],
  ['rgba(255,179,71,0.24)', 'rgba(255,179,71,0.06)'],
];

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export const radius = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999 };

// Web önizlemede tarayıcının odak çerçevesini gizler (yerelde etkisizdir).
export const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {};
