import React, { memo } from "react";
import { ChevronLeft } from "lucide-react";
import "./LiquidGlass.css";

interface LiquidBackProps {
  onClick: () => void;
  className?: string;
}

export const LiquidBack: React.FC<LiquidBackProps> = memo(({
  onClick,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`liquid-close-btn ${className}`}
      aria-label="Go Back"
    >
      <ChevronLeft size={24} />
    </button>
  );
});

LiquidBack.displayName = "LiquidBack";

