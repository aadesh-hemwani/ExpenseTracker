import { ReactElement } from "react";
import { Activity, Briefcase, Car, Grid2x2, Receipt, ShoppingCart, Ticket, Utensils } from "lucide-react";

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
