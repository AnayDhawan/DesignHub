import { afterEach, describe, expect, it, vi } from "vitest";

import type { Choice } from "@/lib/command-palette/choices";
import {
  clearStoredRecents,
  readRecents,
  RECENTS_STORAGE_KEY,
  writeRecents,
} from "@/lib/command-palette/recents-storage";

const colors: Choice = { kind: "studio", id: "colors" };
const inter: Choice = { kind: "font", id: "Inter" };

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

function denied(): never {
  throw new DOMException("denied", "SecurityError");
}

/** Storage that throws on every use, as a browser does when site data is blocked. */
const blockedStorage = { getItem: denied, setItem: denied, removeItem: denied };

afterEach(() => vi.unstubAllGlobals());

describe("recents storage", () => {
  it("reads an empty list when nothing was saved", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage() });
    expect(readRecents()).toEqual([]);
  });

  it("writes the list and reads it back", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    writeRecents([inter, colors]);
    expect(storage.data.has(RECENTS_STORAGE_KEY)).toBe(true);
    expect(readRecents()).toEqual([inter, colors]);
  });

  it("clears the saved list", () => {
    const storage = memoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    writeRecents([colors]);
    clearStoredRecents();
    expect(storage.data.has(RECENTS_STORAGE_KEY)).toBe(false);
    expect(readRecents()).toEqual([]);
  });

  it("ignores a saved value that is not a list of choices", () => {
    vi.stubGlobal("window", { localStorage: memoryStorage({ [RECENTS_STORAGE_KEY]: "{oops" }) });
    expect(readRecents()).toEqual([]);
  });

  it("reports null when storage is blocked, and never throws on write or clear", () => {
    vi.stubGlobal("window", { localStorage: blockedStorage });
    expect(readRecents()).toBeNull();
    expect(() => writeRecents([colors])).not.toThrow();
    expect(() => clearStoredRecents()).not.toThrow();
  });

  it("reports null when localStorage cannot even be reached", () => {
    vi.stubGlobal("window", {
      get localStorage(): never {
        return denied();
      },
    });
    expect(readRecents()).toBeNull();
    expect(() => writeRecents([colors])).not.toThrow();
  });

  it("reports null outside a browser", () => {
    expect(readRecents()).toBeNull();
  });
});
