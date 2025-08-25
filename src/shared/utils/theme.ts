export const THEME_KEY = "theme";

export const setDarkTheme = () => {
  document.documentElement.classList.add("dark");
  localStorage.setItem(THEME_KEY, "dark");
};

export const setLightTheme = () => {
  document.documentElement.classList.remove("dark");
  localStorage.setItem(THEME_KEY, "light");
};

export const getCurrentTheme = () => {
  return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
};
