"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setTheme } from "./use-theme";

/** Light/dark switch. The icon is swapped with CSS, so it never mismatches on hydration. */
export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Alternar entre tema claro e escuro"
      title="Alternar tema"
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}
