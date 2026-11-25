// Light / dark theme. By default the game follows the device setting; once the
// player presses the theme button, their choice is remembered.
// index.html applies a remembered choice before the page is drawn.

export type Theme = "light" | "dark";
export const THEME_KEY = "sanakenno:theme";

export function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme;
  if (chosen === "light" || chosen === "dark") return chosen;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage can be blocked (e.g. private browsing). The theme still changes for now.
  }
}
