"use client";

import { Type } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/layout/locale-provider";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { useOpenFont } from "@/hooks/use-open-font";
import { fontCategoryLabels, loadFontCatalog } from "@/lib/typography/catalog";
import { defaultFontFilters, filterFonts } from "@/lib/typography/filter";
import { useUiStore } from "@/store/ui-store";
import type { FontFamily } from "@/types/typography";

const MAX_RESULTS = 6;

/** Font results inside the command palette. The catalog loads on first open. */
export function FontCommands({ query, onDone }: { query: string; onDone: () => void }) {
  const { t } = useI18n();
  const openFont = useOpenFont();
  const recordChoice = useUiStore((state) => state.recordChoice);
  const [fonts, setFonts] = useState<FontFamily[]>([]);

  useEffect(() => {
    loadFontCatalog().then(setFonts);
  }, []);

  const results = useMemo(
    () =>
      query.trim().length < 2 ? [] : filterFonts(fonts, { ...defaultFontFilters, query }, []).slice(0, MAX_RESULTS),
    [fonts, query],
  );

  if (results.length === 0) return null;

  return (
    <CommandGroup heading={t("command.group.fonts")}>
      {results.map((font) => (
        <CommandItem
          key={font.family}
          value={`font ${font.family} ${query}`}
          onSelect={() => {
            onDone();
            recordChoice({ kind: "font", id: font.family });
            openFont(font.family);
          }}
        >
          <Type />
          {font.family}
          <span className="ml-auto text-xs text-subtle-foreground">{fontCategoryLabels[font.category]}</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
