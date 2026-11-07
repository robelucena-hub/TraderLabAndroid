/**
 * Inline script that applies the saved theme before the first paint (no flash).
 * Saved choice wins; otherwise the operating system preference is used.
 */
export const THEME_STORAGE_KEY = "estudei-theme";

const script = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
