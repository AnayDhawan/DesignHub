"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, type ReactNode } from "react";

import { FontCommands } from "@/components/layout/font-commands";
import { IconCommands } from "@/components/layout/icon-commands";
import { LanguageCommands } from "@/components/layout/language-commands";
import { useI18n } from "@/components/layout/locale-provider";
import { ChoiceItem, RecentGroup, usePaletteChoices } from "@/components/layout/palette-choices";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useHotkey } from "@/hooks/use-hotkeys";
import { selectPaletteItems } from "@/lib/command-palette/choices";
import { useUiStore } from "@/store/ui-store";

// Brand actions read projects and brand stores; load them only when something is typed.
const BrandCommands = dynamic(() => import("@/components/layout/brand-commands").then((m) => m.BrandCommands), {
  ssr: false,
});

export function CommandPalette({ children }: { children?: ReactNode }) {
  const open = useUiStore((state) => state.commandOpen);
  const query = useUiStore((state) => state.commandQuery);
  const recents = useUiStore((state) => state.paletteRecents);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const setQuery = useUiStore((state) => state.setCommandQuery);
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const view = usePaletteChoices(() => setOpen(false));
  // Empty query: recent choices, the studios and three actions. A query: every group.
  const selection = selectPaletteItems(query, recents);

  useHotkey("mod+k", () => setOpen(!open), { allowInInputs: true });
  useHotkey("/", () => setOpen(true));

  // Fetch the brand actions while the palette is open, so they are ready by the first keystroke.
  useEffect(() => {
    if (open) void import("@/components/layout/brand-commands");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showClose={false}
        className="top-[15vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(event) => {
          // Radix selects the input's text on focus, which would swallow a handed-off query.
          event.preventDefault();
          const input = inputRef.current;
          if (!input) return;
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }}
      >
        <DialogTitle className="sr-only">{t("command.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("command.description")}</DialogDescription>
        <Command loop>
          <CommandInput ref={inputRef} value={query} onValueChange={setQuery} placeholder={t("command.placeholder")} />
          <CommandList>
            <CommandEmpty>{t("command.empty", { query })}</CommandEmpty>
            {selection.recents.length > 0 ? (
              <>
                <RecentGroup views={selection.recents.map(view)} />
                <CommandSeparator />
              </>
            ) : null}
            {open && selection.search ? <LanguageCommands query={query} onDone={() => setOpen(false)} /> : null}
            {children}
            {open && selection.search ? <FontCommands query={query} onDone={() => setOpen(false)} /> : null}
            {open && selection.search ? <BrandCommands onDone={() => setOpen(false)} /> : null}
            <CommandGroup heading={t("command.group.studios")}>
              {selection.studios.map((id) => (
                <ChoiceItem key={id} view={view({ kind: "studio", id })} />
              ))}
            </CommandGroup>
            {selection.actions.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("command.group.actions")}>
                  {selection.actions.map((id) => (
                    <ChoiceItem key={id} view={view({ kind: "action", id })} />
                  ))}
                </CommandGroup>
              </>
            ) : null}
            {/* Last on purpose: its value always contains the whole query, and cmdk keeps groups in
                source order, so anywhere earlier it would be picked over real matches. */}
            {open && selection.search ? <IconCommands query={query} onDone={() => setOpen(false)} /> : null}
          </CommandList>
          <footer className="flex h-10 items-center gap-4 border-t px-4 text-[11px] text-subtle-foreground">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> {t("command.hint.navigate")}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> {t("command.hint.select")}
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd> {t("command.hint.close")}
            </span>
          </footer>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
