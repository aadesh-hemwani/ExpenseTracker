import React from "react";
import { ChevronLeft } from "lucide-react";
import "./LiquidGlass.css";

interface LiquidBackProps {
  onClick: () => void;
  className?: string;
}

export const LiquidBack: React.FC<LiquidBackProps> = ({
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
};
