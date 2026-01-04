import { ReactElement } from "react";
import {
  FastFoodOutline,
  CartOutline,
  CarOutline,
  TicketOutline,
  CashOutline,
  GridOutline,
  MedkitOutline,
  BriefcaseOutline,
} from "react-ionicons";

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

export const getCategoryIcon = (cat: string): ReactElement => {
  const color = CATEGORY_COLORS[cat] || "#6b7280";

  const commonProps = {
    height: "20px",
    width: "20px",
    color: color,
  };

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
