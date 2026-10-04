import type { Repeat } from './parser';

export type CategoryId = 'personal' | 'work' | 'health' | 'shopping' | 'home' | 'social';

export interface Task {
  id: string;
  title: string;
  note?: string;
  date: string; // YYYY-MM-DD — tek seferlik görevin günü / tekrarlayanın başlangıcı
  time: string; // HH:MM veya '' (saatsiz)
  repeat: Repeat;
  category: CategoryId;
  /** dakika; null → ayarlardaki varsayılan */
  remindBefore: number | null;
  createdAt: number;
}

export interface Note {
  id: string;
  text: string;
  pinned: boolean;
  color: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  at: number;
}

export interface Settings {
  name: string;
  onboarded: boolean;
  remindBefore: number;
  dailySummary: boolean;
  summaryTime: string; // HH:MM
  voiceReply: boolean;
  speakReminders: boolean;
  autoListen: boolean;
  speechRate: number;
}

export interface AppState {
  tasks: Task[];
  notes: Note[];
  /** `${taskId}|${YYYY-MM-DD}` → tamamlanma zamanı */
  done: Record<string, number>;
  chat: ChatMessage[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  name: '',
  onboarded: false,
  remindBefore: 0,
  dailySummary: true,
  summaryTime: '08:00',
  voiceReply: true,
  speakReminders: true,
  autoListen: true,
  speechRate: 1,
};
