import { describe, expect, it } from "vitest";

import {
  addRecent,
  choiceKey,
  parseRecents,
  RECENT_LIMIT,
  selectionSize,
  selectPaletteItems,
  type Choice,
} from "@/lib/command-palette/choices";
import { studios } from "@/lib/navigation";

const colors: Choice = { kind: "studio", id: "colors" };
const typography: Choice = { kind: "studio", id: "typography" };
const theme: Choice = { kind: "action", id: "toggle-theme" };
const inter: Choice = { kind: "font", id: "Inter" };
const spanish: Choice = { kind: "language", id: "es" };

/** Five different choices, the most the palette remembers. */
const five: Choice[] = [colors, typography, theme, inter, spanish];

describe("addRecent", () => {
  it("puts the newest choice first", () => {
    expect(addRecent([colors], typography)).toEqual([typography, colors]);
  });

  it("moves a repeated choice to the front instead of listing it twice", () => {
    expect(addRecent([colors, typography, theme], theme)).toEqual([theme, colors, typography]);
  });

  it("treats the same id under another kind as a different choice", () => {
    const font: Choice = { kind: "font", id: "colors" };
    expect(addRecent([colors], font)).toEqual([font, colors]);
  });

  it("keeps the last five and forgets the oldest", () => {
    const six = addRecent(five, { kind: "studio", id: "export" });
    expect(six).toHaveLength(RECENT_LIMIT);
    expect(six[0]).toEqual({ kind: "studio", id: "export" });
    expect(six).not.toContainEqual(spanish);
  });

  it("does not change the list it was given", () => {
    const before = [colors];
    addRecent(before, typography);
    expect(before).toEqual([colors]);
  });
});

describe("parseRecents", () => {
  it("returns an empty list for nothing, damaged JSON or the wrong shape", () => {
    expect(parseRecents(null)).toEqual([]);
    expect(parseRecents("")).toEqual([]);
    expect(parseRecents("{not json")).toEqual([]);
    expect(parseRecents('{"kind":"studio","id":"colors"}')).toEqual([]);
    expect(parseRecents('"colors"')).toEqual([]);
  });

  it("reads back what was written", () => {
    expect(parseRecents(JSON.stringify(five))).toEqual(five);
  });

  it("drops entries that are not valid choices and keeps the rest", () => {
    const raw = JSON.stringify([
      colors,
      { kind: "studio", id: "removed-studio" },
      { kind: "action", id: "format-disk" },
      { kind: "language", id: "xx" },
      { kind: "font", id: "" },
      { kind: "font", id: 42 },
      { kind: "folder", id: "colors" },
      null,
      "colors",
      typography,
    ]);
    expect(parseRecents(raw)).toEqual([colors, typography]);
  });

  it("drops repeats and keeps only the newest five", () => {
    const raw = JSON.stringify([colors, colors, ...five, { kind: "studio", id: "export" }]);
    const parsed = parseRecents(raw);
    expect(parsed).toHaveLength(RECENT_LIMIT);
    expect(new Set(parsed.map(choiceKey)).size).toBe(RECENT_LIMIT);
    expect(parsed[0]).toEqual(colors);
  });

  it("accepts the home entry and every studio", () => {
    const all: Choice[] = [
      { kind: "studio", id: "home" },
      ...studios.map((studio): Choice => ({ kind: "studio", id: studio.id })),
    ];
    expect(parseRecents(JSON.stringify(all), all.length)).toEqual(all);
  });
});

describe("selectPaletteItems with nothing typed", () => {
  it("lists the recent choices, the studios and three actions", () => {
    const selection = selectPaletteItems("", [typography]);
    expect(selection.search).toBe(false);
    expect(selection.recents).toEqual([typography]);
    expect(selection.actions).toEqual(["new-project", "toggle-theme", "shortcuts"]);
    expect(selection.studios).toContain("home");
    expect(selection.studios).not.toContain("typography");
    for (const studio of studios) {
      if (studio.id !== "typography") expect(selection.studios).toContain(studio.id);
    }
  });

  it("is short with no history: the studios and three actions", () => {
    const selection = selectPaletteItems("", []);
    expect(selection.recents).toEqual([]);
    expect(selection.studios).toHaveLength(studios.length + 1);
    expect(selectionSize(selection)).toBe(studios.length + 1 + 3);
  });

  it("lists a choice once: a recent studio or action is not repeated in its group", () => {
    const selection = selectPaletteItems("", [colors, theme]);
    expect(selection.studios).not.toContain("colors");
    expect(selection.actions).toEqual(["new-project", "shortcuts"]);
  });

  it("leaves out the long tail of languages, fonts, icons and brand actions", () => {
    expect(selectPaletteItems("", five).search).toBe(false);
  });

  it("shows fewer than 30 rows even with a full history", () => {
    const selection = selectPaletteItems("", five);
    expect(selection.recents).toHaveLength(RECENT_LIMIT);
    expect(selectionSize(selection)).toBeLessThan(30);
  });

  it("shows fewer than 30 rows for a history of fonts, which hides nothing from the other groups", () => {
    const fonts: Choice[] = ["Inter", "Lora", "Manrope", "Fraunces", "Roboto"].map((id) => ({ kind: "font", id }));
    const selection = selectPaletteItems("", fonts);
    expect(selection.studios).toHaveLength(studios.length + 1);
    expect(selectionSize(selection)).toBeLessThan(30);
  });

  it("never lists more than five recents, whatever it is given", () => {
    const many = Array.from({ length: 12 }, (_, index): Choice => ({ kind: "font", id: `Font ${index}` }));
    expect(selectPaletteItems("", many).recents).toHaveLength(RECENT_LIMIT);
  });
});

describe("selectPaletteItems with a query", () => {
  it("offers every group and no recents", () => {
    const selection = selectPaletteItems("typo", five);
    expect(selection.search).toBe(true);
    expect(selection.recents).toEqual([]);
    expect(selection.studios).toHaveLength(studios.length + 1);
    expect(selection.studios).toContain("typography");
    expect(selection.actions).toEqual(["toggle-theme", "shortcuts", "github", "roadmap"]);
  });

  it("counts a single character, a space too, as typed", () => {
    expect(selectPaletteItems("t", []).search).toBe(true);
    expect(selectPaletteItems(" ", []).search).toBe(true);
  });

  it("keeps the new project action in the Brand group, not in Actions", () => {
    expect(selectPaletteItems("new", []).actions).not.toContain("new-project");
  });
});
