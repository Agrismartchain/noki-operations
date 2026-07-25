"use client";

import type { NokiTheme } from "@agrismartchain/noki-design-system";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { DEFAULT_NOKI_THEME, isNokiTheme, NOKI_THEME_STORAGE_KEY } from "./constants";

type Listener = () => void;

const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot(): NokiTheme {
  const attribute = document.documentElement.getAttribute("data-noki-theme");
  return isNokiTheme(attribute) ? attribute : DEFAULT_NOKI_THEME;
}

function getServerSnapshot(): NokiTheme {
  return DEFAULT_NOKI_THEME;
}

function applyTheme(theme: NokiTheme) {
  document.documentElement.setAttribute("data-noki-theme", theme);
  notify();
}

interface NokiThemeContextValue {
  theme: NokiTheme;
  setTheme: (theme: NokiTheme) => void;
}

const NokiThemeContext = createContext<NokiThemeContextValue | null>(null);

export function NokiThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemChange(event: MediaQueryListEvent) {
      const hasExplicitPreference = isNokiTheme(window.localStorage.getItem(NOKI_THEME_STORAGE_KEY));
      if (hasExplicitPreference) {
        return;
      }
      applyTheme(event.matches ? "dashboard-dark" : "dashboard-light");
    }

    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  const setTheme = useCallback((nextTheme: NokiTheme) => {
    if (!isNokiTheme(nextTheme)) {
      return;
    }
    window.localStorage.setItem(NOKI_THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <NokiThemeContext.Provider value={value}>{children}</NokiThemeContext.Provider>;
}

export function useNokiTheme(): NokiThemeContextValue {
  const context = useContext(NokiThemeContext);
  if (!context) {
    throw new Error("useNokiTheme must be used within a NokiThemeProvider");
  }
  return context;
}
