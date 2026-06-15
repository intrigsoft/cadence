import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Ephemeral client-only UI state (the only state the frontend owns).

function persisted<T>(key: string, initial: T) {
  let start = initial;
  if (browser) {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      try {
        start = JSON.parse(raw) as T;
      } catch {
        /* ignore */
      }
    }
  }
  const store = writable<T>(start);
  if (browser) store.subscribe((v) => localStorage.setItem(key, JSON.stringify(v)));
  return store;
}

export const assistantOpen = persisted<boolean>('cadence_assistant_open', true);
export const searchQuery = writable<string>('');

// --- toasts (bottom-center, auto-dismiss) -----------------------------------
export type ToastTone = 'info' | 'deny' | 'warn';
export interface Toast {
  id: string;
  text: string;
  tone: ToastTone;
}
export const toasts = writable<Toast[]>([]);

export function toast(text: string, tone: ToastTone = 'info') {
  const id = browser ? crypto.randomUUID() : String(Math.round(performance.now()));
  toasts.update((t) => [...t, { id, text, tone }]);
  if (browser) setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 4200);
}
