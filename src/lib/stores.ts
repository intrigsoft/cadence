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
