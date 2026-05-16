import React, { useMemo, memo } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
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
      <div className="relative z-10">
        {icon || <Plus style={{ color: activeColor }} size={32} strokeWidth={2.5} />}
      </div>
    </motion.button>
  );
});

LiquidFAB.displayName = "LiquidFAB";

