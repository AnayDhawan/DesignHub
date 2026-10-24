import { parseRecents, type Choice } from "@/lib/command-palette/choices";

/** Per-viewer UI setting, so it lives in localStorage rather than the IndexedDB stores. */
export const RECENTS_STORAGE_KEY = "designhub:palette-recents";

/** The saved list, or null when storage cannot be read (private window, blocked site data). */
export function readRecents(): Choice[] | null {
  try {
    return parseRecents(window.localStorage.getItem(RECENTS_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeRecents(recents: readonly Choice[]): void {
  try {
    window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents));
  } catch {
    // Storage is blocked or full; the list still works for this visit, it just won't be remembered.
  }
}

export function clearStoredRecents(): void {
  try {
    window.localStorage.removeItem(RECENTS_STORAGE_KEY);
  } catch {
    // Nothing was saved if storage is blocked.
  }
}
