"use client";

import { useMemo, useState } from "react";

import { PaletteDownloadMenu } from "@/components/colors/palette-download-menu";
import { PalettePreview } from "@/components/colors/palette-preview";
import { ExportPanel } from "@/components/export/export-panel";
import { useI18n } from "@/components/layout/locale-provider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toHex } from "@/lib/color/color";
import { colorExports } from "@/lib/color/export";
import { gradientCss } from "@/lib/color/gradient";
import { codeExportIds } from "@/lib/color/palette-files";
import type { PlainMessageKey } from "@/lib/i18n/translate";
import { useBrandStore } from "@/store/brand-store";
import { useColorStore } from "@/store/color-store";

const formatLabels: Partial<Record<string, PlainMessageKey>> = {
  css: "colors.export.format.css",
  json: "colors.export.format.json",
  svg: "colors.export.format.svg",
};

export function ColorExport() {
  const { t } = useI18n();
  const swatches = useColorStore((state) => state.swatches);
  const gradient = useColorStore((state) => state.gradient);
  const format = useColorStore((state) => state.format);
  const shadeOptions = useColorStore((state) => state.shadeOptions);
  const brandName = useBrandStore((state) => state.profile.name);
  const [includeShades, setIncludeShades] = useState(true);

  // The code view holds the code formats; the palette files are downloaded from the menu.
  const formats = useMemo(
    () =>
      colorExports({
        colors: swatches.map((swatch) => swatch.color),
        gradient,
        format,
        includeShades,
        shadeOptions,
        name: brandName.trim() || undefined,
      })
        .filter((item) => codeExportIds.includes(item.id))
        .map((item) => {
          // Only the tab label is translated; the file contents stay in English.
          const key = formatLabels[item.id];
          return key ? { ...item, label: t(key) } : item;
        }),
    [swatches, gradient, format, includeShades, shadeOptions, brandName, t],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-10 flex-1 overflow-hidden rounded-md border" aria-hidden>
          {swatches.map((swatch) => (
            <span key={swatch.id} className="flex-1" style={{ background: toHex(swatch.color) }} />
          ))}
          <span className="w-24" style={{ background: gradientCss(gradient) }} />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="export-shades" checked={includeShades} onCheckedChange={setIncludeShades} />
          <Label htmlFor="export-shades">{t("colors.export.shades")}</Label>
        </div>
        <PaletteDownloadMenu includeShades={includeShades} />
      </div>
      <p className="text-xs text-subtle-foreground">{t("colors.export.notation", { format: format.toUpperCase() })}</p>
      <PalettePreview />
      <ExportPanel formats={formats} label={t("colors.export.formatLabel")} />
    </div>
  );
}
