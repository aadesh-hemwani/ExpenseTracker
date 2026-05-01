import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import "./LiquidGlass.css";

interface LiquidFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

export const LiquidFAB: React.FC<LiquidFABProps> = ({ onClick, icon }) => {
  const { accentColor, accentColors } = useTheme();
  // @ts-ignore
  const activeColor = accentColors[accentColor]?.default || "#6366f1";

  return (
    <motion.button
      onClick={onClick}
      className="w-16 h-16 rounded-full flex items-center justify-center liquid-pill-effect backdrop-blur-sm"
      style={{
        backgroundColor: `${activeColor}25`, // Slightly more than nav pill for prominence
        borderColor: `${activeColor}50`,
      }}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className="relative z-10">
        {icon || <Plus style={{ color: activeColor }} size={32} strokeWidth={2.5} />}
      </div>
    </motion.button>
  );
};
