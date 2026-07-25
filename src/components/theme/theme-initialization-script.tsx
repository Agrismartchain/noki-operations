import { DEFAULT_NOKI_THEME, NOKI_THEMES, NOKI_THEME_STORAGE_KEY } from "./constants";

const themeInitScript = `
(function () {
  try {
    var STORAGE_KEY = ${JSON.stringify(NOKI_THEME_STORAGE_KEY)};
    var THEMES = ${JSON.stringify(NOKI_THEMES)};
    var DEFAULT_THEME = ${JSON.stringify(DEFAULT_NOKI_THEME)};
    var stored = window.localStorage.getItem(STORAGE_KEY);
    var theme = THEMES.indexOf(stored) !== -1
      ? stored
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dashboard-dark"
          : DEFAULT_THEME);
    document.documentElement.setAttribute("data-noki-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-noki-theme", ${JSON.stringify(DEFAULT_NOKI_THEME)});
  }
})();
`;

export function ThemeInitializationScript() {
  return <script>{themeInitScript}</script>;
}
