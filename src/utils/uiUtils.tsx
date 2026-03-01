import { ReactElement } from "react";
import { Activity, Briefcase, Grid2x2, Receipt, ShoppingCart, Ticket, Utensils } from "lucide-react";

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
  const dropShadow = "drop-shadow-[0_5px_4px_rgba(100,100,100,0.3)] dark:drop-shadow-[0_5px_4px_rgba(200,200,200,0.25)]drop-shadow-[0_5px_4px_rgba(100,100,100,0.3)] dark:drop-shadow-[0_5px_4px_rgba(200,200,200,0.25)]";
  switch (cat) {
    case "Food":
      return (
        <img
          src="/category/food.png"
          alt="Food"
          width={sizeNum}
          height={sizeNum}
          style={{
            objectFit: "contain",
            transform: "scale(2)"
          }}
          className={dropShadow}
        />
      );
    case "Shopping":
      return <img
        src="/category/shopping.png"
        alt="Shopping"
        width={sizeNum}
        height={sizeNum}
        style={{ objectFit: "contain", transform: "scale(1.8)" }}
        className={dropShadow}
      />;
    case "Transport":
      return (
        <img
          src="/category/transport.png"
          alt="Transport"
          width={sizeNum}
          height={sizeNum}
          style={{ objectFit: "contain", transform: "scale(1.4)" }}
          className={dropShadow}
        />
      );
    case "Entertainment":
      return <img
        src="/category/entertainment.png"
        alt="Entertainment"
        width={sizeNum}
        height={sizeNum}
        style={{ objectFit: "contain", transform: "scale(1.8)" }}
        className={dropShadow}

      />;
    case "Health":
      return <img
        src="/category/health.png"
        alt="Health"
        width={sizeNum}
        height={sizeNum}
        style={{ objectFit: "contain", transform: "scale(2)" }}
        className={dropShadow}

      />;
    case "Bills":
      return <img
        src="/category/bills.png"
        alt="Bills"
        width={sizeNum}
        height={sizeNum}
        style={{ objectFit: "contain", transform: "scale(1)" }}
        className={dropShadow}

      />;
    case "Misc":
      return <img
        src="/category/misc.png"
        alt="Misc"
        width={sizeNum}
        height={sizeNum}
        style={{ objectFit: "contain", transform: "scale(2)" }}
        className={dropShadow}

      />;
    default:
      return <img
        src="/category/shopping.png"
        alt="Shopping"
        width={sizeNum}
        height={sizeNum}
        style={{ objectFit: "contain", transform: "scale(1.8)" }}
        className={dropShadow}
      />;;
  }
};
