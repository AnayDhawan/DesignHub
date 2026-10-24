import { create } from "zustand";

import { addRecent, type Choice } from "@/lib/command-palette/choices";
import { clearStoredRecents, readRecents, writeRecents } from "@/lib/command-palette/recents-storage";

type UiState = {
  commandOpen: boolean;
  commandQuery: string;
  /** The palette's last choices, newest first. Saved in localStorage (not IndexedDB) and read again on every open. */
  paletteRecents: Choice[];
  shortcutsOpen: boolean;
  /** Set by the command palette; Brand Projects opens its "New project" dialog and clears it. */
  newProjectRequested: boolean;
  openCommand: (query?: string) => void;
  setCommandOpen: (open: boolean) => void;
  setCommandQuery: (query: string) => void;
  recordChoice: (choice: Choice) => void;
  clearRecents: () => void;
  setShortcutsOpen: (open: boolean) => void;
  requestNewProject: () => void;
  clearNewProjectRequest: () => void;
};

export const useUiStore = create<UiState>()((set, get) => ({
  commandOpen: false,
  commandQuery: "",
  paletteRecents: [],
  shortcutsOpen: false,
  newProjectRequested: false,
  // Re-read on open so another tab's choices show up; when storage is blocked, keep this visit's list.
  openCommand: (query = "") =>
    set({ commandOpen: true, commandQuery: query, paletteRecents: readRecents() ?? get().paletteRecents }),
  setCommandOpen: (open) =>
    set(
      open
        ? { commandOpen: true, paletteRecents: readRecents() ?? get().paletteRecents }
        : { commandOpen: false, commandQuery: "" },
    ),
  setCommandQuery: (query) => set({ commandQuery: query }),
  recordChoice: (choice) => {
    const paletteRecents = addRecent(get().paletteRecents, choice);
    writeRecents(paletteRecents);
    set({ paletteRecents });
  },
  clearRecents: () => {
    clearStoredRecents();
    set({ paletteRecents: [] });
  },
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  requestNewProject: () => set({ newProjectRequested: true }),
  clearNewProjectRequest: () => set({ newProjectRequested: false }),
}));
