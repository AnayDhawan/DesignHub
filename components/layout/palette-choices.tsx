"use client";

import { BookOpen, Check, Home, Keyboard, Languages, Moon, Plus, Sun, Trash2, Type } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { GithubIcon } from "@/components/layout/github-icon";
import { useI18n } from "@/components/layout/locale-provider";
import { useThemeToggle } from "@/components/layout/theme-toggle";
import { CommandGroup, CommandItem, CommandShortcut } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useOpenFont } from "@/hooks/use-open-font";
import { choiceKey, type ActionId, type Choice } from "@/lib/command-palette/choices";
import { localeNames } from "@/lib/i18n/locales";
import { getStudio } from "@/lib/navigation";
import { siteConfig } from "@/lib/site";
import { useUiStore } from "@/store/ui-store";

/** One row of the palette: how a choice looks and what it does, in the current language and theme. */
export type ChoiceView = {
  key: string;
  /** What the search matches. */
  value: string;
  icon: ReactNode;
  label: string;
  /** Set when the label is in a language other than the interface's. */
  lang?: string;
  ariaLabel?: string;
  checked?: boolean;
  keys?: string[];
  run: () => void;
};

/**
 * Turns a choice into a row. Choosing a row closes the palette, remembers the choice and runs it, so
 * the Studios group, the Actions group and the Recent group all behave the same way.
 */
export function usePaletteChoices(onDone: () => void): (choice: Choice) => ChoiceView {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const { isDark, toggle } = useThemeToggle();
  const openFont = useOpenFont();
  const recordChoice = useUiStore((state) => state.recordChoice);
  const setShortcutsOpen = useUiStore((state) => state.setShortcutsOpen);
  const requestNewProject = useUiStore((state) => state.requestNewProject);

  function actionView(id: ActionId): Omit<ChoiceView, "key" | "run"> & { action: () => void } {
    switch (id) {
      case "new-project":
        return {
          value: "new brand project create",
          icon: <Plus />,
          label: t("command.newProject"),
          action: () => {
            requestNewProject();
            router.push("/projects");
          },
        };
      case "toggle-theme":
        return {
          value: `toggle theme dark light mode ${t("theme.toggle")}`,
          icon: isDark ? <Sun /> : <Moon />,
          label: t(isDark ? "theme.toLight" : "theme.toDark"),
          keys: ["⌥", "T"],
          action: toggle,
        };
      case "shortcuts":
        return {
          value: `keyboard shortcuts help ${t("command.shortcuts")}`,
          icon: <Keyboard />,
          label: t("command.shortcuts"),
          keys: ["?"],
          action: () => setShortcutsOpen(true),
        };
      case "github":
        return {
          value: `github source code star ${t("command.github")}`,
          icon: <GithubIcon />,
          label: t("command.github"),
          action: () => window.open(siteConfig.github, "_blank"),
        };
      case "roadmap":
        return {
          value: `roadmap future plans ${t("nav.roadmap")}`,
          icon: <BookOpen />,
          label: t("nav.roadmap"),
          action: () => window.open(`${siteConfig.github}/blob/main/ROADMAP.md`, "_blank"),
        };
    }
  }

  function describe(choice: Choice): Omit<ChoiceView, "key" | "run"> & { action: () => void } {
    switch (choice.kind) {
      case "studio": {
        if (choice.id === "home") {
          return {
            value: `home start ${t("nav.home")}`,
            icon: <Home />,
            label: t("nav.home"),
            keys: ["G", "H"],
            action: () => router.push("/"),
          };
        }
        const studio = getStudio(choice.id);
        const Icon = studio.icon;
        return {
          value: `${studio.title} ${t(`studio.${studio.id}.title`)} ${studio.description}`,
          icon: <Icon />,
          label: t(`studio.${studio.id}.title`),
          keys: ["G", studio.shortcut.toUpperCase()],
          action: () => router.push(studio.href),
        };
      }
      case "action":
        return actionView(choice.id);
      case "font":
        return {
          value: `recent font ${choice.id}`,
          icon: <Type />,
          label: choice.id,
          action: () => openFont(choice.id),
        };
      case "language": {
        const current = choice.id === locale;
        const name = localeNames[choice.id];
        return {
          value: `recent language ${name}`,
          icon: <Languages />,
          label: name,
          lang: choice.id,
          ariaLabel: current ? `${name}, ${t("command.currentLanguage")}` : name,
          checked: current,
          action: () => setLocale(choice.id),
        };
      }
    }
  }

  return (choice) => {
    const { action, ...view } = describe(choice);
    return {
      ...view,
      key: choiceKey(choice),
      run: () => {
        onDone();
        recordChoice(choice);
        action();
      },
    };
  };
}

export function ChoiceItem({ view }: { view: ChoiceView }) {
  return (
    <CommandItem value={view.value} aria-label={view.ariaLabel} onSelect={view.run}>
      {view.icon}
      {view.lang ? <span lang={view.lang}>{view.label}</span> : view.label}
      {view.checked ? <Check className="ml-auto" aria-hidden /> : null}
      {view.keys ? (
        <CommandShortcut>
          {view.keys.map((key) => (
            <Kbd key={key}>{key}</Kbd>
          ))}
        </CommandShortcut>
      ) : null}
    </CommandItem>
  );
}

/** The remembered choices, with a row to forget them. The palette shows it only before anything is typed. */
export function RecentGroup({ views }: { views: ChoiceView[] }) {
  const { t } = useI18n();
  const clearRecents = useUiStore((state) => state.clearRecents);

  return (
    <CommandGroup heading={t("command.group.recent")}>
      {views.map((view) => (
        <ChoiceItem key={view.key} view={view} />
      ))}
      <CommandItem value="clear recent choices forget history" onSelect={clearRecents}>
        <Trash2 />
        {t("command.clearRecent")}
      </CommandItem>
    </CommandGroup>
  );
}
