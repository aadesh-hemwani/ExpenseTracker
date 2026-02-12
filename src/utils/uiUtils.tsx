import { ReactElement, lazy, Suspense } from "react";

// Optimized Dynamic Lucide Import
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { ICON_MAP } from "./iconMap";

// Wrapper for lazy loaded icons
const DynamicLucideIcon = ({
  name,
  ...props
}: {
  name: string;
  [key: string]: any;
}) => {
  const Icon = lazy(dynamicIconImports[name as keyof typeof dynamicIconImports]);
  // Fallback while loading - can be a simple spinner or empty div
  return (
    <Suspense fallback={<div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />}>
      <Icon {...props} />
    </Suspense>
  );
};

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

    // 4. Check Direct Match in dynamic imports
    const lowerWord = word.toLowerCase();

    // Check if the word directly matches a key
    if (lowerWord in dynamicIconImports) {
      return lowerWord;
    }

    // Try singular
    if (lowerWord.endsWith("s")) {
      const singular = lowerWord.slice(0, -1);
      if (singular in dynamicIconImports) return singular;
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
  Other: "#6b7280", // gray-500
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
      let cleanName = resolvedIconName.trim();

      const allKeys = Object.keys(dynamicIconImports);
      // Try exact match
      if (!(cleanName in dynamicIconImports)) {
        // Try lowercase match
        const lowerName = cleanName.toLowerCase();
        if (lowerName in dynamicIconImports) {
          cleanName = lowerName;
        } else {
          // Try to find a key that matches case-insensitively (more expensive but safe)
          const found = allKeys.find(k => k.toLowerCase() === cleanName.toLowerCase() || k.replace(/-/g, '').toLowerCase() === cleanName.toLowerCase());
          if (found) cleanName = found;
          else {
            // Try converting PascalCase to kebab-case
            const kebab = cleanName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
            if (kebab in dynamicIconImports) cleanName = kebab;
          }
        }
      }

      if (cleanName in dynamicIconImports) {
        const sizeNum = parseInt(size.replace("px", "")) || 20;
        return <DynamicLucideIcon name={cleanName} color={color} size={sizeNum} />;
      }
    }
  }

  const sizeNum = parseInt(size.replace("px", "")) || 20;

  // 4. Default Category Matching
  switch (cat) {
    case "Food":
      return <DynamicLucideIcon name="utensils" color={color} size={sizeNum} />;
    case "Shopping":
      return <DynamicLucideIcon name="shopping-cart" color={color} size={sizeNum} />;
    case "Transport":
      return <DynamicLucideIcon name="car" color={color} size={sizeNum} />;
    case "Entertainment":
      return <DynamicLucideIcon name="ticket" color={color} size={sizeNum} />;
    case "Health":
      return <DynamicLucideIcon name="activity" color={color} size={sizeNum} />;
    case "Bills":
      return <DynamicLucideIcon name="receipt" color={color} size={sizeNum} />;
    case "Misc":
      return <DynamicLucideIcon name="grid-2x2" color={color} size={sizeNum} />;
    default:
      return <DynamicLucideIcon name="briefcase" color={color} size={sizeNum} />;
  }
};
