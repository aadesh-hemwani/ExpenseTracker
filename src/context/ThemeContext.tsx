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
    () => localStorage.getItem("accentColor") || "royalBlue"
  );

  const isDark = theme === "dark";

  // Define accent colors map - using Tailwind colors for reference
  const accentColors: Record<
    string,
    { name: string; default: string; hover: string }
  > = {
    royalBlue: {
      name: "Royal Blue",
      default: isDark ? "#60a5fa" : "#2563eb",
      hover: isDark ? "#93c5fd" : "#1d4ed8"
    },
    emerald: {
      name: "Emerald",
      default: isDark ? "#34d399" : "#059669",
      hover: isDark ? "#6ee7b7" : "#047857"
    },
    rose: {
      name: "Rose",
      default: isDark ? "#fb7185" : "#e11d48",
      hover: isDark ? "#fda4af" : "#be123c"
    },
    amber: {
      name: "Amber",
      default: isDark ? "#fbbf24" : "#d97706",
      hover: isDark ? "#fcd34d" : "#b45309"
    },
    violet: {
      name: "Violet",
      default: isDark ? "#a78bfa" : "#7c3aed",
      hover: isDark ? "#c4b5fd" : "#6d28d9"
    },
    cyan: {
      name: "Cyan",
      default: isDark ? "#22d3ee" : "#0891b2",
      hover: isDark ? "#67e8f9" : "#0e7490"
    },
  };

  // Helper to convert hex to HSL
  const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
    let r = 0,
      g = 0,
      b = 0;
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b),
      cmax = Math.max(r, g, b),
      delta = cmax - cmin;
    let h = 0,
      s = 0,
      l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
  };

  useEffect(() => {
    const root = window.document.documentElement;

    // Apply Theme
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    // Apply Accent Color
    const colors = accentColors[accentColor] || accentColors.royalBlue;
    const { h, s, l } = hexToHSL(colors.default);

    // Set CSS Variables
    root.style.setProperty("--color-accent", colors.default);
    root.style.setProperty("--accent-exact", colors.default); // Fix mismatch
    root.style.setProperty("--color-accent-hover", colors.hover);

    // Set HSL components for opacity support in Tailwind
    root.style.setProperty("--accent-h", h.toString());
    root.style.setProperty("--accent-s", s + "%");
    root.style.setProperty("--accent-l", l + "%");

    localStorage.setItem("accentColor", accentColor);

    // Update PWA Theme Color
    let meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]'
    );
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", theme === "dark" ? "#000000" : "#ffffff");

    // Update iOS Status Bar
    const iosMeta = document.querySelector(
      'meta[name="apple-mobile-web-app-status-bar-style"]'
    );
    if (iosMeta) {
      iosMeta.setAttribute(
        "content",
        theme === "dark" ? "black-translucent" : "default"
      );
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
