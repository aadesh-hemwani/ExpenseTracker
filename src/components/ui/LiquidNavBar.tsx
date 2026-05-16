import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { LucideIcon } from "lucide-react";

import "./LiquidGlass.css";

interface LiquidNavBarProps {
  items: { icon: LucideIcon; path: string; label?: string }[];
}

export const LiquidNavBar: React.FC<LiquidNavBarProps> = React.memo(({ items }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accentColor, accentColors } = useTheme();

  const activeColor = useMemo(() => {
    const config = accentColors[accentColor as keyof typeof accentColors];
    return config?.default || "#6366f1";
  }, [accentColor, accentColors]);

  const activeIndex = useMemo(() => 
    items.findIndex((item) => item.path === location.pathname),
    [items, location.pathname]
  );

  return (
    <nav className="relative flex items-center h-16 px-1.5 liquid-glass-effect rounded-full pointer-events-auto">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = index === activeIndex;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="relative flex flex-col items-center justify-center flex-1 h-full gap-1 pt-1 rounded-full tap-highlight-transparent group"
          >
            <AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="active-pill-bg"
                  className="absolute inset-y-1 inset-x-0.5 rounded-full z-0 liquid-pill-effect"
                  style={{
                    backgroundColor: `${activeColor}20`,
                    borderColor: `${activeColor}40`,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                    mass: 0.8
                  }}
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 flex flex-col items-center justify-center">
              <Icon
                color={isActive ? activeColor : "currentColor"}
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-all duration-300 ${isActive ? "scale-110" : "text-gray-500 dark:text-gray-400 opacity-80 group-hover:opacity-100"}`}
              />
              <span
                className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 opacity-80 group-hover:opacity-100"}`}
                style={isActive ? { color: activeColor } : {}}
              >
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </nav>
  );
});

LiquidNavBar.displayName = "LiquidNavBar";

