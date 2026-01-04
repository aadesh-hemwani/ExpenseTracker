import { CloseOutline } from "react-ionicons";
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
      <CloseOutline height="20px" width="20px" />
    </button>
  );
};
