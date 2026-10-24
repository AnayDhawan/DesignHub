"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { useSelectFont } from "@/hooks/use-select-font";
import { useTypographyStore } from "@/store/typography-store";

/** Opens a font in the Typography Studio's browse tab, as the command palette does. */
export function useOpenFont(): (family: string) => void {
  const router = useRouter();
  const selectFont = useSelectFont();
  const setTab = useTypographyStore((state) => state.setTab);

  return useCallback(
    (family: string) => {
      selectFont(family);
      setTab("browse");
      router.push("/typography");
    },
    [router, selectFont, setTab],
  );
}
