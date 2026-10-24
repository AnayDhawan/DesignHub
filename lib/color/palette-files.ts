import {
  adobeSwatchExchange,
  gimpPalette,
  kritaPalette,
  markdownPalette,
  paintNetColorLimit,
  paintNetPalette,
  paletteSvg,
  procreateSwatches,
  procreateSwatchLimit,
  sketchPalette,
  type NamedColor,
} from "@/lib/color/export";
import type { PlainMessageKey } from "@/lib/i18n/translate";
import { slugify } from "@/lib/logo/pack";
import type { ColorFormat } from "@/types/color";

export type PaletteFileId = "sketch" | "procreate" | "ase" | "gpl" | "krita" | "paintnet" | "markdown" | "png";

/** What a palette file is built from. */
export type PaletteSource = {
  palette: NamedColor[];
  includeShades: boolean;
  /** The notation of the Markdown table's value column. */
  format: ColorFormat;
  /** The brand name, for formats that carry a palette name. */
  name?: string;
};

export type PaletteFileContent = {
  /** The bytes of the file. For a raster file this is the SVG that is drawn to the image. */
  data: string | Uint8Array<ArrayBuffer>;
  /** Shades were asked for but didn't fit in the format's slots. */
  shadesDropped: boolean;
  /** Base colors left out because they didn't fit. */
  colorsDropped: number;
};

/** The message that explains a format's slot limit, shown when something was left out. */
type LimitMessage = "colors.export.procreateLimit" | "colors.export.paintnetLimit";

export type PaletteFile = {
  id: PaletteFileId;
  /** Message for the menu entry. */
  label: PlainMessageKey;
  /** Message for the toast shown once the download starts. */
  ready: PlainMessageKey;
  /** The file extension, without the dot. */
  extension: string;
  mime: string;
  /** Drawn to a PNG in the browser instead of written as is. */
  raster?: boolean;
  limit?: { message: LimitMessage; count: number };
  filename: (brandName: string) => string;
  build: (source: PaletteSource) => PaletteFileContent;
};

export type PaletteGroup = {
  id: "design" | "open" | "documents";
  /** Message for the group heading. */
  label: PlainMessageKey;
  files: PaletteFile[];
};

/** `<brand>-colors.<extension>`, the name every file downloaded from the menu has had. */
const brandFile = (extension: string) => (brandName: string) =>
  `${slugify(brandName.trim() || "brand")}-colors.${extension}`;

const plain = (data: PaletteFileContent["data"]): PaletteFileContent => ({
  data,
  shadesDropped: false,
  colorsDropped: 0,
});

const sketch: PaletteFile = {
  id: "sketch",
  label: "colors.export.sketch",
  ready: "colors.export.sketchReady",
  extension: "sketchpalette",
  mime: "application/json",
  filename: brandFile("sketchpalette"),
  build: ({ palette, includeShades }) => plain(sketchPalette(palette, includeShades)),
};

const procreate: PaletteFile = {
  id: "procreate",
  label: "colors.export.procreate",
  ready: "colors.export.procreateReady",
  extension: "swatches",
  mime: "application/zip",
  limit: { message: "colors.export.procreateLimit", count: procreateSwatchLimit },
  filename: brandFile("swatches"),
  build: ({ palette, includeShades, name }) => {
    const { bytes, shadesDropped, colorsDropped } = procreateSwatches(palette, includeShades, name);
    return { data: bytes, shadesDropped, colorsDropped };
  },
};

const ase: PaletteFile = {
  id: "ase",
  label: "colors.export.ase",
  ready: "colors.export.aseReady",
  extension: "ase",
  mime: "application/octet-stream",
  filename: brandFile("ase"),
  build: ({ palette, includeShades }) => plain(adobeSwatchExchange(palette, includeShades)),
};

/** GIMP, Inkscape and Krita all read the same .gpl, so one entry covers GIMP and Inkscape. */
const gpl: PaletteFile = {
  id: "gpl",
  label: "colors.export.gpl",
  ready: "colors.export.gplReady",
  extension: "gpl",
  mime: "text/plain;charset=utf-8",
  filename: () => "palette.gpl",
  build: ({ palette, includeShades, name }) => plain(gimpPalette(palette, includeShades, name)),
};

const krita: PaletteFile = {
  id: "krita",
  label: "colors.export.krita",
  ready: "colors.export.kritaReady",
  extension: "kpl",
  mime: "application/zip",
  filename: brandFile("kpl"),
  build: ({ palette, includeShades, name }) => plain(kritaPalette(palette, includeShades, name)),
};

const paintnet: PaletteFile = {
  id: "paintnet",
  label: "colors.export.paintnet",
  ready: "colors.export.paintnetReady",
  extension: "txt",
  mime: "text/plain",
  limit: { message: "colors.export.paintnetLimit", count: paintNetColorLimit },
  filename: brandFile("txt"),
  build: ({ palette, includeShades, name }) => {
    const { text, shadesDropped, colorsDropped } = paintNetPalette(palette, includeShades, name);
    return { data: text, shadesDropped, colorsDropped };
  },
};

const markdown: PaletteFile = {
  id: "markdown",
  label: "colors.export.markdown",
  ready: "colors.export.markdownReady",
  extension: "md",
  mime: "text/markdown;charset=utf-8",
  filename: () => "palette.md",
  build: ({ palette, format, includeShades }) => plain(markdownPalette(palette, format, includeShades)),
};

const png: PaletteFile = {
  id: "png",
  label: "colors.export.png",
  ready: "colors.export.pngReady",
  extension: "png",
  mime: "image/png",
  raster: true,
  filename: brandFile("png"),
  build: ({ palette }) => plain(paletteSvg(palette)),
};

/** The palette downloads, grouped by the kind of tool that opens them, in the order the menu shows them. */
export const paletteGroups: PaletteGroup[] = [
  { id: "design", label: "colors.export.group.design", files: [sketch, procreate, ase] },
  { id: "open", label: "colors.export.group.open", files: [gpl, krita, paintnet] },
  { id: "documents", label: "colors.export.group.documents", files: [markdown, png] },
];

export const paletteFiles: PaletteFile[] = paletteGroups.flatMap((group) => group.files);

/**
 * The formats of `colorExports()` that stay in the code view. The others (GIMP, Sketch and Markdown) are
 * palette files and are downloaded from the menu.
 */
export const codeExportIds: readonly string[] = ["css", "tailwind", "json", "svg"];
