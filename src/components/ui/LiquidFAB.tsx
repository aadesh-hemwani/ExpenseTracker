import React from "react";
import { motion } from "framer-motion";
import { Add } from "react-ionicons";
import "./LiquidGlass.css"; // Reusing the shared CSS

interface LiquidFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

// We can reuse the .liquid-nav style but adapt it for a circle
// Or create a new .liquid-fab class in the component logic that uses the same filter

export const LiquidFAB: React.FC<LiquidFABProps> = ({ onClick, icon }) => {
  return (
    <motion.button
      onClick={onClick}
      className="liquid-fab" /* We'll add this class to CSS */
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className="liquid-fab-blob" />
      <div className="relative z-10 text-white">
        {icon || <Add color="#ffffff" height="32px" width="32px" />}
      </div>
    </motion.button>
  );
};
