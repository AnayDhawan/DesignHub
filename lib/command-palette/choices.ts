import { isLocale, type Locale } from "@/lib/i18n/locales";
import { studios, type StudioId } from "@/lib/navigation";

/** How many recent choices the palette remembers and shows. */
export const RECENT_LIMIT = 5;

const MAX_FONT_LENGTH = 120;

export type StudioChoiceId = StudioId | "home";

/** The palette actions that can be a recent choice. The first three are the ones shown on open. */
export const actionIds = ["new-project", "toggle-theme", "shortcuts", "github", "roadmap"] as const;

export type ActionId = (typeof actionIds)[number];

/**
 * Something a person picked in the command palette, in a form that survives a reload. It holds only
 * ids and names, never labels, so the palette words it again in the current language and theme.
 * Choices that depend on the moment (undo, switching to a project, an icon search, a download) are
 * not remembered.
 */
export type Choice =
  | { kind: "studio"; id: StudioChoiceId }
  | { kind: "action"; id: ActionId }
  | { kind: "font"; id: string }
  | { kind: "language"; id: Locale };

/** What the palette lists before anything is typed: the actions that open it to a short, useful list. */
export const idleActionIds: readonly ActionId[] = ["new-project", "toggle-theme", "shortcuts"];

/** What the palette lists in its Actions group once something is typed. Brand actions have their own group. */
export const searchActionIds: readonly ActionId[] = ["toggle-theme", "shortcuts", "github", "roadmap"];

const studioChoiceIds: readonly StudioChoiceId[] = ["home", ...studios.map((studio) => studio.id)];

export function choiceKey(choice: Choice): string {
  return `${choice.kind}:${choice.id}`;
}

function isStudioChoiceId(value: string): value is StudioChoiceId {
  return (studioChoiceIds as readonly string[]).includes(value);
}

function isActionId(value: string): value is ActionId {
  return (actionIds as readonly string[]).includes(value);
}

/** Puts a choice first, drops its earlier entry and keeps the newest `limit`. Returns a new list. */
export function addRecent(recents: readonly Choice[], choice: Choice, limit = RECENT_LIMIT): Choice[] {
  const key = choiceKey(choice);
  return [choice, ...recents.filter((item) => choiceKey(item) !== key)].slice(0, limit);
}

function toChoice(value: unknown): Choice | null {
  if (typeof value !== "object" || value === null) return null;
  const { kind, id } = value as { kind?: unknown; id?: unknown };
  if (typeof id !== "string") return null;
  if (kind === "studio") return isStudioChoiceId(id) ? { kind, id } : null;
  if (kind === "action") return isActionId(id) ? { kind, id } : null;
  if (kind === "language") return isLocale(id) ? { kind, id } : null;
  if (kind === "font") return id.length > 0 && id.length <= MAX_FONT_LENGTH ? { kind, id } : null;
  return null;
}

/**
 * Reads the stored list. Anything that is not a valid choice (a studio that no longer exists, a
 * hand-edited value, a different shape) is dropped instead of breaking the palette.
 */
export function parseRecents(raw: string | null, limit = RECENT_LIMIT): Choice[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const recents: Choice[] = [];
  for (const entry of value) {
    const choice = toChoice(entry);
    if (!choice || seen.has(choiceKey(choice))) continue;
    seen.add(choiceKey(choice));
    recents.push(choice);
  }
  return recents.slice(0, limit);
}

export type PaletteSelection = {
  /** The remembered choices to list first, newest first. Empty once something is typed. */
  recents: Choice[];
  /** The Studios group. A studio that is already under Recent is not listed twice. */
  studios: StudioChoiceId[];
  actions: ActionId[];
  /** Whether the long tail (languages, fonts, brand actions, icon search) is offered. */
  search: boolean;
};

/**
 * Decides what the palette lists. With nothing typed it is the recent choices, the studios and three
 * actions, so it opens short. With a query it is every group, and the person's own words pick from them.
 * Any typed character counts, a space included, because cmdk filters on the raw text.
 */
export function selectPaletteItems(query: string, recents: readonly Choice[]): PaletteSelection {
  if (query !== "") {
    return { recents: [], studios: [...studioChoiceIds], actions: [...searchActionIds], search: true };
  }
  const shown = recents.slice(0, RECENT_LIMIT);
  const listed = new Set(shown.map(choiceKey));
  return {
    recents: shown,
    studios: studioChoiceIds.filter((id) => !listed.has(`studio:${id}`)),
    actions: idleActionIds.filter((id) => !listed.has(`action:${id}`)),
    search: false,
  };
}

/** How many rows a selection renders in the groups it decides, with the row that clears the recents. */
export function selectionSize(selection: PaletteSelection): number {
  const clear = selection.recents.length > 0 ? 1 : 0;
  return selection.recents.length + clear + selection.studios.length + selection.actions.length;
}
