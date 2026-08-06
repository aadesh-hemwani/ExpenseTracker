import React, { useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { LucideIcon } from "lucide-react";
import { prefetchRoute } from "../../utils/prefetch";

import "./LiquidGlass.css";

interface LiquidNavBarProps {
  items: { icon: React.ElementType; path: string; label?: string }[];
}

export const LiquidNavBar: React.FC<LiquidNavBarProps> = React.memo(({ items }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { accentColor, accentColors } = useTheme();
  const navRef = useRef<HTMLElement>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  const activeColor = useMemo(() => {
    const config = accentColors[accentColor as keyof typeof accentColors];
    return config?.default || "#6366f1";
  }, [accentColor, accentColors]);

  const activeRouteIndex = useMemo(() =>
    items.findIndex((item) => item.path === location.pathname),
    [items, location.pathname]
  );

  const visualActiveIndex = dragIndex !== null ? dragIndex : activeRouteIndex;

  const iconRefs = useRef<(any | null)[]>([]);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    // If using mouse, ensure button is pressed. Touch events don't have 'buttons'
    if ('buttons' in e && e.buttons !== 1) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (navRef.current) {
      const rect = navRef.current.getBoundingClientRect();
      
      // Add a generous vertical threshold so user doesn't accidentally cancel drag
      if (clientY < rect.top - 40 || clientY > rect.bottom + 40) {
        if (dragIndex !== null) setDragIndex(null);
        return;
      }

      const xInside = clientX - rect.left;
      const itemWidth = rect.width / items.length;
      
      let hoveredIndex = Math.floor(xInside / itemWidth);
      hoveredIndex = Math.max(0, Math.min(hoveredIndex, items.length - 1));
      
      if (hoveredIndex !== visualActiveIndex) {
        setDragIndex(hoveredIndex);
        iconRefs.current[hoveredIndex]?.startAnimation?.();
      }
    }
  };

  const handleDragEnd = () => {
    if (dragIndex !== null) {
      if (dragIndex !== activeRouteIndex) {
        navigate(items[dragIndex].path);
      } else {
        setDragIndex(null);
      }
    }
  };

  // Clear drag state once the navigation completes
  React.useEffect(() => {
    setDragIndex(null);
  }, [location.pathname]);

  return (
    <nav 
      ref={navRef}
      onPointerMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onPointerUp={handleDragEnd}
      onTouchEnd={handleDragEnd}
      onPointerLeave={handleDragEnd}
      onTouchCancel={handleDragEnd}
      className="relative flex items-center h-16 px-1.5 liquid-glass-effect rounded-full pointer-events-auto touch-none"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = index === visualActiveIndex;

        return (
          <motion.button
            key={item.path}
            onClick={() => {
              if (isActive) {
                iconRefs.current[index]?.startAnimation?.();
              }
              navigate(item.path);
            }}
            onMouseEnter={() => {
              iconRefs.current[index]?.startAnimation?.();
              prefetchRoute(item.path);
            }}
            onMouseLeave={() => {
              iconRefs.current[index]?.stopAnimation?.();
            }}
            onTouchStart={() => {
              iconRefs.current[index]?.startAnimation?.();
              prefetchRoute(item.path);
            }}
            whileTap={isActive ? { scale: 1.03 } : { scale: 0.95 }}
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
              <motion.div
                animate={isActive ? { y: -2, scale: 1.15 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Icon
                  ref={(el: any) => (iconRefs.current[index] = el)}
                  color={isActive ? activeColor : "currentColor"}
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors duration-300 ${isActive ? "" : "text-gray-500 dark:text-gray-400 opacity-80 group-hover:opacity-100"}`}
                />
              </motion.div>
              <motion.span
                animate={isActive ? { y: -1, scale: 1.05 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 opacity-80 group-hover:opacity-100"}`}
                style={isActive ? { color: activeColor } : {}}
              >
                {item.label}
              </motion.span>
            </div>
          </motion.button>
        );
      })}
    </nav>
  );
});

LiquidNavBar.displayName = "LiquidNavBar";

