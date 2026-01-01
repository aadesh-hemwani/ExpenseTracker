import React from "react";
import { X } from "lucide-react";
import "./LiquidGlass.css";

interface LiquidCloseProps {
  onClick: () => void;
  className?: string;
}

export const LiquidClose: React.FC<LiquidCloseProps> = ({
  onClick,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`liquid-close-btn ${className}`}
      aria-label="Close"
    >
      <X size={20} />
    </button>
  );
};
