/**
 * Dark mode preference, persisted in localStorage and mirrored onto <html class="dark">
 */
import { useCallback, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.DARK_MODE) === 'true';
  } catch {
    return false;
  }
}

function writePreference(enabled: boolean): void {
  document.documentElement.classList.toggle('dark', enabled);
  try {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(enabled));
  } catch {
    // Storage unavailable: the preference only lasts for this session.
  }
  listeners.forEach((listener) => listener());
}

export function useDarkMode(): [boolean, () => void] {
  // The server snapshot is light mode; the inline script in layout.tsx has already applied
  // the stored class before hydration, so there is no flash.
  const darkMode = useSyncExternalStore(subscribe, readPreference, () => false);
  const toggle = useCallback(() => writePreference(!readPreference()), []);
  return [darkMode, toggle];
}
