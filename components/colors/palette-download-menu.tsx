"use client";

import {
  Brush,
  ChevronDown,
  Download,
  FileText,
  ImageDown,
  Loader2,
  Paintbrush,
  Palette,
  SwatchBook,
  type LucideIcon,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useId, useState } from "react";
import { toast } from "sonner";

import { useI18n } from "@/components/layout/locale-provider";
import { Button } from "@/components/ui/button";
import { namedPalette } from "@/lib/color/export";
import { paletteGroups, type PaletteFile, type PaletteFileId } from "@/lib/color/palette-files";
import { downloadBlob } from "@/lib/download";
import { errorMessage } from "@/lib/i18n/errors";
import { rasterize } from "@/lib/export/raster";
import { useBrandStore } from "@/store/brand-store";
import { useColorStore } from "@/store/color-store";

const icons: Record<PaletteFileId, LucideIcon> = {
  sketch: Palette,
  procreate: Brush,
  ase: SwatchBook,
  gpl: Palette,
  krita: Paintbrush,
  paintnet: Palette,
  markdown: FileText,
  png: ImageDown,
};

const itemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0";

/** One menu for every palette file, grouped by the kind of tool that opens it. */
export function PaletteDownloadMenu({ includeShades }: { includeShades: boolean }) {
  const { t, plural } = useI18n();
  const swatches = useColorStore((state) => state.swatches);
  const format = useColorStore((state) => state.format);
  const shadeOptions = useColorStore((state) => state.shadeOptions);
  const brandName = useBrandStore((state) => state.profile.name);
  const [downloading, setDownloading] = useState(false);
  const idPrefix = useId();

  async function download(file: PaletteFile) {
    if (swatches.length === 0 || downloading) return;
    const palette = namedPalette(
      swatches.map((swatch) => swatch.color),
      shadeOptions,
    );
    const content = file.build({ palette, includeShades, format, name: brandName.trim() || undefined });

    let blob: Blob;
    if (file.raster && typeof content.data === "string") {
      setDownloading(true);
      try {
        const image = await rasterize(content.data, 2);
        blob = new Blob([image.bytes.slice().buffer], { type: file.mime });
      } catch (error) {
        toast.error(errorMessage(error, t, "colors.export.pngFailed"));
        return;
      } finally {
        setDownloading(false);
      }
    } else {
      blob = new Blob([content.data], { type: file.mime });
    }

    downloadBlob(blob, file.filename(brandName));
    const notes = [
      content.shadesDropped ? t("colors.export.shadesDropped") : "",
      content.colorsDropped > 0 ? plural("colors.export.colorsDropped", content.colorsDropped) : "",
    ].filter(Boolean);
    toast.success(t(file.ready), {
      description:
        notes.length && file.limit
          ? [t(file.limit.message, { limit: file.limit.count }), ...notes].join(" ")
          : undefined,
    });
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button size="sm" variant="outline" disabled={swatches.length === 0} aria-busy={downloading}>
          {downloading ? <Loader2 className="animate-spin" /> : <Download />}
          {t("colors.export.menu")}
          <ChevronDown className="opacity-50" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-h-(--radix-dropdown-menu-content-available-height) w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg outline-none animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {paletteGroups.map((group, index) => {
            const headingId = `${idPrefix}-${group.id}`;
            return (
              <div key={group.id}>
                {index > 0 ? <DropdownMenu.Separator className="my-1 h-px bg-border" /> : null}
                <DropdownMenu.Group aria-labelledby={headingId}>
                  <DropdownMenu.Label
                    id={headingId}
                    className="px-2.5 py-1.5 text-xs font-medium text-subtle-foreground"
                  >
                    {t(group.label)}
                  </DropdownMenu.Label>
                  {group.files.map((file) => {
                    const Icon = icons[file.id];
                    return (
                      <DropdownMenu.Item
                        key={file.id}
                        disabled={downloading}
                        className={itemClass}
                        onSelect={() => void download(file)}
                      >
                        <Icon aria-hidden />
                        {t(file.label)}
                        <span className="ml-auto text-xs text-subtle-foreground">.{file.extension}</span>
                      </DropdownMenu.Item>
                    );
                  })}
                </DropdownMenu.Group>
              </div>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
