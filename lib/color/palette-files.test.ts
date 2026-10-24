import { readdirSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { fromHex } from "@/lib/color/color";
import { colorExports, namedPalette } from "@/lib/color/export";
import {
  codeExportIds,
  paletteFiles,
  paletteGroups,
  type PaletteFile,
  type PaletteSource,
} from "@/lib/color/palette-files";
import { defaultShadeOptions } from "@/lib/color/shades";
import { defaultGradient } from "@/lib/color/gradient";
import { en } from "@/lib/i18n/messages/en";

/**
 * Every palette file the Color Studio menu offers, byte for byte, for one fixed palette with and without
 * shades. A change to a generator that alters a file shows up as a diff of these files: accept it with
 * `pnpm vitest run lib/color -u` and read the diff like any other change. Binary files are written as
 * a hex dump with the text beside it; the PNG is the SVG it is drawn from, because drawing needs a browser.
 */
const DIR = join(__dirname, "__snapshots__");
const BRAND = "Acme Labs";

const palette = namedPalette([fromHex("#6366f1"), fromHex("#f59e0b")], defaultShadeOptions);
const variants = [
  { name: "base", includeShades: false },
  { name: "shades", includeShades: true },
] as const;

const sourceFor = (includeShades: boolean): PaletteSource => ({
  palette,
  includeShades,
  format: "hex",
  name: BRAND,
});

function hexdump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const row = bytes.subarray(offset, offset + 16);
    const hex = [...row].map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
    const text = [...row].map((byte) => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : ".")).join("");
    lines.push(`${offset.toString(16).padStart(8, "0")}  ${hex.padEnd(47)}  |${text}|`);
  }
  return `${lines.join("\n")}\n`;
}

const contents = (file: PaletteFile, includeShades: boolean): string => {
  const { data } = file.build(sourceFor(includeShades));
  return typeof data === "string" ? data : hexdump(data);
};

/** `.txt` is added so no tool mistakes a snapshot for source: tsc, ESLint and Prettier must leave them alone. */
const fileFor = (variant: string, file: PaletteFile) => `${variant}.${file.filename(BRAND)}.txt`;

describe("palette files", () => {
  // A ZIP records the time it was written, so the clock stands still. The date is built from local parts so
  // the stored time is the same in every time zone.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  describe.each(variants)("$name palette", ({ name, includeShades }) => {
    test.each(paletteFiles.map((file) => [file.id, file] as const))("%s is unchanged", async (_id, file) => {
      await expect(contents(file, includeShades)).toMatchFileSnapshot(`./__snapshots__/${fileFor(name, file)}`);
    });
  });

  test("the snapshot folder has a file for every palette file and variant, and nothing left from a removed one", () => {
    const expected = variants.flatMap(({ name }) => paletteFiles.map((file) => fileFor(name, file)));
    expect(readdirSync(DIR).sort()).toEqual(expected.sort());
  });

  test("builds the same file twice", () => {
    for (const file of paletteFiles) expect(contents(file, true), file.id).toBe(contents(file, true));
  });
});

describe("the download menu groups", () => {
  test("hold the files from the issue, in order, under the names it gives", () => {
    expect(paletteGroups.map((group) => [en[group.label], group.files.map((file) => file.id)])).toEqual([
      ["Design apps", ["sketch", "procreate", "ase"]],
      ["Open tools", ["gpl", "krita", "paintnet"]],
      ["Documents", ["markdown", "png"]],
    ]);
  });

  test("put every palette file in exactly one group", () => {
    const ids = paletteGroups.flatMap((group) => group.files.map((file) => file.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(["ase", "gpl", "krita", "markdown", "paintnet", "png", "procreate", "sketch"]);
    expect(paletteFiles.map((file) => file.id)).toEqual(ids);
  });

  test("leave no export of the code view without a place: it is code or a palette file, not both", () => {
    const exportIds = colorExports({
      colors: [fromHex("#6366f1")],
      gradient: defaultGradient,
      format: "hex",
      includeShades: true,
      shadeOptions: defaultShadeOptions,
    }).map((item) => item.id);
    const menuIds: string[] = paletteFiles.map((file) => file.id);
    for (const id of exportIds) expect(codeExportIds.includes(id) !== menuIds.includes(id), id).toBe(true);
    for (const id of codeExportIds) expect(exportIds, id).toContain(id);
  });

  test("use messages that exist, and an extension that matches the file name", () => {
    for (const file of paletteFiles) {
      expect(en[file.label], file.id).toBeTypeOf("string");
      expect(en[file.ready], file.id).toBeTypeOf("string");
      expect(file.filename(BRAND).endsWith(`.${file.extension}`), file.id).toBe(true);
    }
    for (const group of paletteGroups) expect(en[group.label], group.id).toBeTypeOf("string");
  });

  test("keep each file's name", () => {
    expect(paletteFiles.map((file) => [file.id, file.filename(BRAND)])).toEqual([
      ["sketch", "acme-labs-colors.sketchpalette"],
      ["procreate", "acme-labs-colors.swatches"],
      ["ase", "acme-labs-colors.ase"],
      ["gpl", "palette.gpl"],
      ["krita", "acme-labs-colors.kpl"],
      ["paintnet", "acme-labs-colors.txt"],
      ["markdown", "palette.md"],
      ["png", "acme-labs-colors.png"],
    ]);
    expect(paletteFiles.find((file) => file.id === "ase")?.filename("  ")).toBe("brand-colors.ase");
  });

  test("download the same GIMP, Sketch and Markdown text as the code view did", () => {
    const input = {
      colors: [fromHex("#6366f1"), fromHex("#f59e0b")],
      gradient: defaultGradient,
      format: "rgb" as const,
      includeShades: true,
      shadeOptions: defaultShadeOptions,
      name: BRAND,
    };
    const named = namedPalette(input.colors, input.shadeOptions);
    const source: PaletteSource = { palette: named, includeShades: true, format: "rgb", name: BRAND };
    const code = colorExports(input);
    for (const [id, exportId] of [
      ["gpl", "gpl"],
      ["sketch", "sketch"],
      ["markdown", "markdown"],
    ] as const) {
      const file = paletteFiles.find((item) => item.id === id);
      expect(file?.build(source).data, id).toBe(code.find((item) => item.id === exportId)?.code);
    }
  });

  test("report what a format with a slot limit left out", () => {
    const many = namedPalette(
      Array.from({ length: 40 }, (_, index) => fromHex(`#${(index * 6000 + 4096).toString(16).padStart(6, "0")}`)),
      defaultShadeOptions,
    );
    const procreate = paletteFiles.find((file) => file.id === "procreate");
    const result = procreate?.build({ palette: many, includeShades: true, format: "hex" });
    expect(result?.shadesDropped).toBe(true);
    expect(result?.colorsDropped).toBe(10);
    expect(procreate?.limit).toEqual({ message: "colors.export.procreateLimit", count: 30 });
  });
});
