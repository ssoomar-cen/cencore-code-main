import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "cencore-theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : defaultTheme;
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = () => setSystemTheme(mediaQuery.matches ? "dark" : "light");

    updateTheme();
    mediaQuery.addEventListener("change", updateTheme);

    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    const resolvedTheme = theme === "system" ? systemTheme : theme;

    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [systemTheme, theme]);

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    }
  };

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme === "system" ? systemTheme : theme,
      setTheme,
    }),
    [systemTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
