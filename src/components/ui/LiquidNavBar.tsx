import React, { useState, useRef, useLayoutEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, useMotionValue, useAnimation } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import "./LiquidGlass.css";

// SVG Filter Component (Liquid Effect)
const LiquidFilter = () => (
  <svg className="liquid-filter-def">
    <defs>
      <filter id="liquid-filter" primitiveUnits="objectBoundingBox">
        <feImage
          result="map"
          width="100%"
          height="100%"
          x="0"
          y="0"
          href="data:image/webp;base64,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"
        />
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.04" result="blur" />
        <feDisplacementMap
          id="disp"
          in="blur"
          in2="map"
          scale="0.5"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>

      {/* Premium Icon Gradient */}
      <linearGradient id="icon-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop
          offset="0%"
          style={{ stopColor: "var(--c-action)", stopOpacity: 1 }}
        />
        <stop
          offset="100%"
          style={{
            stopColor: "var(--c-content)",
            stopOpacity: 0.8,
          }}
        />
      </linearGradient>
    </defs>
  </svg>
);

interface LiquidNavBarProps {
  items: { icon: any; path: string; label?: string }[];
}

export const LiquidNavBar: React.FC<LiquidNavBarProps> = React.memo(
  ({ items }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    const { accentColor, accentColors } = useTheme();
    // @ts-ignore
    const activeColor = accentColors[accentColor]?.default || "#6366f1";

    const count = items.length;
    const activeIndex = useMemo(() => {
      const idx = items.findIndex((item) => item.path === location.pathname);
      return idx === -1 ? 0 : idx;
    }, [location.pathname, items]);

    // Measure container for precise drag math
    useLayoutEffect(() => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
      
      const handleResize = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      };
      
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    const padding = 24; // 12px horizontal padding * 2
    const itemWidth = containerWidth > 0 ? (containerWidth - padding) / count : 0;
    const targetX = activeIndex * itemWidth;

    // Use imperative animation controls to FORCE snapping, no matter what
    const controls = useAnimation();
    const x = useMotionValue(0);

    // Initial load and route change snap
    useLayoutEffect(() => {
      if (!isDragging && itemWidth > 0) {
        controls.start({ 
          x: targetX,
          scaleX: 1,
          transition: { type: "spring", stiffness: 400, damping: 30, mass: 1 }
        });
      }
    }, [activeIndex, itemWidth, isDragging, controls, targetX]);

    const handleDragStart = () => {
      setIsDragging(true);
      controls.start({ scaleX: 1.15 }); // Stretch effect
    };

    const handleDragEnd = (_: any, info: any) => {
      setIsDragging(false);

      if (itemWidth > 0) {
        const currentX = x.get();
        // Add momentum. E.g. quick flick left/right helps snap to the next one
        const projectedX = currentX + info.velocity.x * 0.1; 
        
        // Find exactly nearest index and bound it
        const nearestIndex = Math.round(projectedX / itemWidth);
        const validatedIndex = Math.max(0, Math.min(count - 1, nearestIndex));
        
        // Force the pill to animate precisely to the nearest tab IMMEDIATELY
        const newTargetX = validatedIndex * itemWidth;
        controls.start({ 
          x: newTargetX,
          scaleX: 1,
          transition: { type: "spring", stiffness: 400, damping: 30, mass: 1 }
        });
        
        // Triggers the page switch
        if (validatedIndex !== activeIndex) {
          navigate(items[validatedIndex].path);
        }
      }
    };

    return (
      <>
        <LiquidFilter />
        <nav className="liquid-nav" ref={containerRef}>
          <motion.div
            drag="x"
            dragConstraints={containerRef}
            dragElastic={0.15}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            animate={controls}
            style={{
              x,
              width: `calc(((100% - 24px) / ${count}) + 12px)`,
              left: 6, // Offset to center within the 12px nav padding
            }}
            className="liquid-blob cursor-grab active:cursor-grabbing"
          />

          {items.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;

            return (
              <div
                key={item.path}
                className={`liquid-nav__item ${isActive ? "active" : ""}`}
                onClick={() => !isDragging && navigate(item.path)}
                style={
                  {
                    "--c-action": activeColor,
                  } as React.CSSProperties
                }
              >
                <Icon
                  color={isActive ? activeColor : "currentColor"}
                  size={28}
                  className={`liquid-nav__icon`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>
      </>
    );
  },
);
