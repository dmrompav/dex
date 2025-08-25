import React, { useEffect } from "react";
import {
  setDarkTheme,
  setLightTheme,
  getCurrentTheme,
} from "../shared/utils/theme";

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = React.useState(getCurrentTheme());

  useEffect(() => {
    if (theme === "dark") setDarkTheme();
    else setLightTheme();
  }, [theme]);

  return (
    <button
      className="px-3 py-1 rounded border bg-gray-900 text-white dark:bg-gray-100 dark:text-black"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
};

export default ThemeToggle;
