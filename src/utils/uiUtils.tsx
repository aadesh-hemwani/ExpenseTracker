import { ReactElement } from "react";
import { Activity, Briefcase, Car, Grid2x2, Receipt, ShoppingCart, Ticket, Utensils } from "lucide-react";
import { Theme } from "../types";

export const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Misc",
];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316", // orange-500
  Transport: "#3b82f6", // blue-500
  Shopping: "#a855f7", // purple-500
  Bills: "#ef4444", // red-500
  Entertainment: "#ec4899", // pink-500
  Health: "#22c55e", // green-500
  Misc: "#6b7280", // gray-500
  Other: "#6b7280", // gray-500
};

export const getCategoryIcon = (
  cat: string,
  size: string = "20px",
  _note?: string,
  _iconName?: string,
  _iconType?: string
): ReactElement => {
  const color = CATEGORY_COLORS[cat] || "#6b7280";
  const sizeNum = parseInt(size.replace("px", "")) || 20;

  switch (cat) {
    case "Food":
      return <Utensils color={color} size={sizeNum} />;
    case "Shopping":
      return <ShoppingCart color={color} size={sizeNum} />;
    case "Transport":
      return <Car color={color} size={sizeNum} />;
    case "Entertainment":
      return <Ticket color={color} size={sizeNum} />;
    case "Health":
      return <Activity color={color} size={sizeNum} />;
    case "Bills":
      return <Receipt color={color} size={sizeNum} />;
    case "Misc":
      return <Grid2x2 color={color} size={sizeNum} />;
    default:
      return <Briefcase color={color} size={sizeNum} />;
  }
};

// Helper for deterministic gradients based on string ID
export const getEventGradient = (id: string, theme: Theme = "light") => {
  let resolvedTheme = theme;
  if (theme === "system") {
    resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  const isDark = resolvedTheme === "dark";
  const colorSchemes = [
    {
      light: "from-purple-100 via-indigo-200 to-blue-200",
      dark: "from-purple-900 via-indigo-950 to-blue-900"
    },
    {
      light: "from-blue-100 via-cyan-200 to-teal-200",
      dark: "from-blue-900 via-cyan-950 to-teal-900"
    },
    {
      light: "from-emerald-100 via-teal-200 to-cyan-200",
      dark: "from-emerald-900 via-teal-950 to-cyan-900"
    },
    {
      light: "from-rose-100 via-orange-200 to-yellow-200",
      dark: "from-rose-900 via-orange-950 to-stone-900"
    },
    {
      light: "from-pink-100 via-rose-200 to-purple-200",
      dark: "from-pink-900 via-rose-950 to-purple-900"
    },
    {
      light: "from-amber-100 via-orange-200 to-rose-200",
      dark: "from-amber-900 via-orange-950 to-rose-900"
    },
    {
      light: "from-indigo-100 via-blue-200 to-sky-200",
      dark: "from-indigo-900 via-blue-950 to-sky-900"
    },
    {
      light: "from-fuchsia-100 via-purple-200 to-pink-200",
      dark: "from-fuchsia-900 via-purple-950 to-pink-900"
    },
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorSchemes.length;
  const scheme = colorSchemes[index];
  return isDark ? scheme.dark : scheme.light;
};

