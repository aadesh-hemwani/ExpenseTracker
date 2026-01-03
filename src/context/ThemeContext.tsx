import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ThemeContextType, Theme } from "../types";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) || "light"
  );
  const [accentColor, setAccentColor] = useState<string>(
    () => localStorage.getItem("accentColor") || "indigo"
  );

  // Define accent colors map - using Tailwind colors for reference
  const accentColors: Record<string, { default: string; hover: string }> = {
    indigo: { default: "#6366f1", hover: "#4f46e5" },
    emerald: { default: "#10b981", hover: "#059669" },
    rose: { default: "#f43f5e", hover: "#e11d48" },
    amber: { default: "#f59e0b", hover: "#d97706" },
    violet: { default: "#8b5cf6", hover: "#7c3aed" },
    cyan: { default: "#06b6d4", hover: "#0891b2" },
    mint: { default: "#6ee7b7", hover: "#34d399" },
    lavender: { default: "#a78bfa", hover: "#8b5cf6" },
    blush: { default: "#f9a8d4", hover: "#f472b6" },
    sky: { default: "#7dd3fc", hover: "#38bdf8" },
    apricot: { default: "#fdba74", hover: "#fb923c" },
  };

  useEffect(() => {
    const root = window.document.documentElement;

    // Apply Theme
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Apply Accent Color
    const colors = accentColors[accentColor] || accentColors.indigo;
    root.style.setProperty("--color-accent", colors.default);
    root.style.setProperty("--color-accent-hover", colors.hover);
    localStorage.setItem("accentColor", accentColor);

    // Update PWA Theme Color
    // Remove existing meta tags to prevent conflict with media queries
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    metaTags.forEach((tag) => tag.remove());

    // Create and append a new one
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = theme === "dark" ? "#000000" : "#ffffff";
    document.head.appendChild(meta);

    // Update iOS Status Bar Style
    const iosMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (iosMeta) {
      iosMeta.setAttribute("content", theme === "dark" ? "black" : "default");
    }
  }, [theme, accentColor]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, accentColor, setAccentColor, accentColors }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
