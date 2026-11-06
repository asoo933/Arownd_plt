import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const STORAGE_KEY = "arownd-theme";
const LEGACY_STORAGE_KEY = "sooqy-theme";

interface ThemeContextValue {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemResolved(): Resolved {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme: Theme): Resolved {
  return theme === "system" ? systemResolved() : theme;
}

function apply(resolved: Resolved, theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");

  // In automatic mode the stylesheet follows prefers-color-scheme directly.
  // Explicit modes set data-theme and override the operating-system preference.
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const canvas = getComputedStyle(root).getPropertyValue("--color-bg-canvas").trim();
    if (canvas) meta.setAttribute("content", canvas);
  }
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Storage may be unavailable in private browsing or restricted contexts.
  }
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use the same theme context for SSR and the first client render.
  // Stored preferences are restored after hydration to avoid React #418.
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<Resolved>("dark");

  useEffect(() => {
    const storedTheme = readStoredTheme();
    if (storedTheme !== theme) {
      setThemeState(storedTheme);
      return;
    }

    const update = () => {
      const next = resolve(theme);
      setResolved(next);
      apply(next, theme);
    };

    update();
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    return;
  }, [theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Theme still changes for the current session if storage is unavailable.
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
