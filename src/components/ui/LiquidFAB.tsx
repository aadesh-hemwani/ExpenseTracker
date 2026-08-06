import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { PlusIcon } from "lucide-animated";
import { useTheme } from "../../context/ThemeContext";
import "./LiquidGlass.css";

interface LiquidFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

export const LiquidFAB: React.FC<LiquidFABProps> = memo(({ onClick, icon }) => {
  const { accentColor, accentColors } = useTheme();

  const activeColor = useMemo(() => {
    const config = accentColors[accentColor as keyof typeof accentColors];
    return config?.default || "#6366f1";
  }, [accentColor, accentColors]);

  return (
    <motion.button
      onClick={onClick}
      className="w-16 h-16 rounded-full flex items-center justify-center liquid-pill-effect backdrop-blur-sm pointer-events-auto"
      style={{
        backgroundColor: `${activeColor}25`,
        borderColor: `${activeColor}50`,
      }}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <motion.div 
        className="relative z-10"
        whileHover={{ rotate: 90 }}
        whileTap={{ rotate: 180, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        {icon || <PlusIcon style={{ color: activeColor }} size={32} />}
      </motion.div>
    </motion.button>
  );
});

LiquidFAB.displayName = "LiquidFAB";

