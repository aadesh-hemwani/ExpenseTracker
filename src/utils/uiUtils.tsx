import { ReactElement } from "react";
import FastFoodOutline from "react-ionicons/lib/FastFoodOutline";
import CartOutline from "react-ionicons/lib/CartOutline";
import CarOutline from "react-ionicons/lib/CarOutline";
import TicketOutline from "react-ionicons/lib/TicketOutline";
import CashOutline from "react-ionicons/lib/CashOutline";
import GridOutline from "react-ionicons/lib/GridOutline";
import MedkitOutline from "react-ionicons/lib/MedkitOutline";
import BriefcaseOutline from "react-ionicons/lib/BriefcaseOutline";

// Dynamic Lucide Import (Imports all icons, bundle size tradeoff accepted for AI flexibility)
import * as LucideIcons from "lucide-react";

import { ICON_MAP } from "./iconMap";

export const findLucideIcon = (text: string): string | undefined => {
  if (!text) return undefined;

  // 1. Clean and split words
  const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = cleanText.split(/\s+/);

  // 2. Check Whole Phrase Match First (Power user optimization)
  if (ICON_MAP[cleanText]) return ICON_MAP[cleanText];

  for (const word of words) {
    if (word.length < 3) continue;

    // 3. Check Manual Mapping
    if (ICON_MAP[word]) {
      return ICON_MAP[word];
    }

    // 4. Check Direct PascalCase match (e.g. "Pizza")
    const pascal = word.charAt(0).toUpperCase() + word.slice(1);
    // @ts-ignore
    if (LucideIcons[pascal]) {
      return pascal;
    }

    // 5. Check Plural/Singular (Simple)
    if (word.endsWith("s")) {
      const singular = word.slice(0, -1);
      const pascalSingular =
        singular.charAt(0).toUpperCase() + singular.slice(1);
      // @ts-ignore
      if (LucideIcons[pascalSingular]) return pascalSingular;
    }
  }

  return undefined;
};

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
};

export const getCategoryIcon = (
  cat: string,
  size: string = "20px",
  note?: string,
  iconName?: string, // Persisted Icon Name
  iconType?: "lucide" | "ion" | "emoji" // Source, defaults to lucide if iconName present
): ReactElement => {
  const color = CATEGORY_COLORS[cat] || "#6b7280";

  // 1. Resolve Icon Name (Persisted OR Computed from Note)
  let resolvedIconName = iconName;

  // If no persisted icon, try to find one from the note on-the-fly (Historic Fix)
  if (!resolvedIconName && note) {
    resolvedIconName = findLucideIcon(note);
  }

  // 2. Render Lucide Icon if available
  if (resolvedIconName) {
    if (!iconType || iconType === "lucide") {
      const cleanName = resolvedIconName.trim();
      // @ts-ignore
      let LucideIcon = LucideIcons[cleanName];

      // Fallback: Try PascalCase
      if (!LucideIcon) {
        const pascalName =
          cleanName.charAt(0).toUpperCase() + cleanName.slice(1).toLowerCase();
        // @ts-ignore
        LucideIcon = LucideIcons[pascalName];
      }

      // Fallback: Case Insensitive
      if (!LucideIcon) {
        const foundKey = Object.keys(LucideIcons).find(
          (k) => k.toLowerCase() === cleanName.toLowerCase()
        );
        if (foundKey) {
          // @ts-ignore
          LucideIcon = LucideIcons[foundKey];
        }
      }

      if (LucideIcon) {
        const sizeNum = parseInt(size.replace("px", "")) || 20;
        return <LucideIcon color={color} size={sizeNum} />;
      }
    }
    // Future: Handle 'emoji' or 'ion' explicitly here
  }

  const commonProps = {
    height: size,
    width: size,
    color: color,
  };

  // 4. Default Category Matching
  switch (cat) {
    case "Food":
      return <FastFoodOutline {...commonProps} />;
    case "Shopping":
      return <CartOutline {...commonProps} />;
    case "Transport":
      return <CarOutline {...commonProps} />;
    case "Entertainment":
      return <TicketOutline {...commonProps} />;
    case "Health":
      return <MedkitOutline {...commonProps} />;
    case "Bills":
      return <CashOutline {...commonProps} />;
    case "Misc":
      return <GridOutline {...commonProps} />;
    default:
      return <BriefcaseOutline {...commonProps} />;
  }
};
