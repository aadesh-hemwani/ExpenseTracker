import React from "react";
import ChevronBackOutline from "react-ionicons/lib/ChevronBackOutline";
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
      className={`liquid-close-btn ${className}`} // Reuse 'liquid-close-btn' for consistent styling
      aria-label="Go Back"
    >
      <ChevronBackOutline height="24px" width="24px" />
    </button>
  );
};
