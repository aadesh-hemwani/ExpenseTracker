import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import "./LiquidGlass.css";

interface LiquidFABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

export const LiquidFAB: React.FC<LiquidFABProps> = ({ onClick, icon }) => {
  return (
    <motion.button
      onClick={onClick}
      className="liquid-fab"
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <div className="liquid-fab-blob" />
      <div className="relative z-10 text-white">
        {icon || <Plus color="#ffffff" size={32} />}
      </div>
    </motion.button>
  );
};
