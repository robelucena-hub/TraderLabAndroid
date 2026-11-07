"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useIsDark } from "@/components/theme/use-theme";

function Toaster(props: ToasterProps) {
  const isDark = useIsDark();
  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
