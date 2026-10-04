import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { guessCategory } from './categories';
import { addDays, startOfDay, toISODate } from './parser';
import { doneKey } from './schedule';
import { DEFAULT_SETTINGS, type AppState, type ChatMessage, type Note, type Settings, type Task } from './types';

const STORAGE_KEY = 'asistan/v1';
const MAX_CHAT = 60;

let state: AppState = { tasks: [], notes: [], done: {}, chat: [], settings: DEFAULT_SETTINGS };
let hydrated = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function getState(): AppState {
  return state;
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  listeners.forEach((l) => l());
  if (hydrated) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
    }, 300);
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => hydrated);
}

export async function hydrate(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<AppState>;
      state = {
        tasks: saved.tasks ?? [],
        notes: saved.notes ?? [],
        done: pruneDone(saved.done ?? {}),
        chat: saved.chat ?? [],
        settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      };
    }
  } catch {
    // bozuk veri: temiz başla
  }
  hydrated = true;
  listeners.forEach((l) => l());
}

/** 90 günden eski tamamlanma kayıtlarını atar (tekrarlayan görevler için birikir). */
function pruneDone(done: Record<string, number>): Record<string, number> {
  const cutoff = toISODate(addDays(startOfDay(new Date()), -90));
  return Object.fromEntries(Object.entries(done).filter(([k]) => (k.split('|')[1] ?? '') >= cutoff));
}

// ---------- Görevler ----------

export type NewTask = Pick<Task, 'title' | 'date' | 'time' | 'repeat'> & Partial<Pick<Task, 'note' | 'category' | 'remindBefore'>>;

export function addTask(input: NewTask): Task {
  const task: Task = {
    id: uid(),
    note: '',
    remindBefore: null,
    category: input.category ?? guessCategory(input.title),
    createdAt: Date.now(),
    ...input,
  };
  setState((s) => ({ ...s, tasks: [...s.tasks, task] }));
  return task;
}

export function updateTask(id: string, patch: Partial<Task>) {
  setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
}

export function deleteTask(id: string) {
  setState((s) => ({
    ...s,
    tasks: s.tasks.filter((t) => t.id !== id),
    done: Object.fromEntries(Object.entries(s.done).filter(([k]) => !k.startsWith(`${id}|`))),
  }));
}

export function setDone(taskId: string, date: string, value: boolean) {
  setState((s) => {
    const done = { ...s.done };
    if (value) done[doneKey(taskId, date)] = Date.now();
    else delete done[doneKey(taskId, date)];
    return { ...s, done };
  });
}

export function clearCompletedOneTime() {
  setState((s) => ({
    ...s,
    tasks: s.tasks.filter((t) => !(t.repeat === 'none' && s.done[doneKey(t.id, t.date)])),
  }));
}

// ---------- Notlar ----------

export function addNote(text: string): Note {
  const note: Note = { id: uid(), text, pinned: false, color: Math.floor(Math.random() * 5), createdAt: Date.now() };
  setState((s) => ({ ...s, notes: [note, ...s.notes] }));
  return note;
}

export function updateNote(id: string, patch: Partial<Note>) {
  setState((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));
}

export function deleteNote(id: string) {
  setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
}

// ---------- Sohbet & ayarlar ----------

export function pushChat(from: ChatMessage['from'], text: string) {
  const msg: ChatMessage = { id: uid(), from, text, at: Date.now() };
  setState((s) => ({ ...s, chat: [...s.chat, msg].slice(-MAX_CHAT) }));
}

export function clearChat() {
  setState((s) => ({ ...s, chat: [] }));
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function resetAll() {
  setState(() => ({ tasks: [], notes: [], done: {}, chat: [], settings: DEFAULT_SETTINGS }));
}
