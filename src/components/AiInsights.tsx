import { useState, useRef, memo, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { Insight } from "../utils/insights";

interface AiInsightsProps {
  insights?: Insight[];
  isLoading?: boolean;
}

const InsightCard = memo(({ insight }: { insight: Insight }) => {
  const themeColors = useMemo(() => {
    const isRed = insight.color.includes("red");
    const isAmber = insight.color.includes("amber");
    const isGreen = insight.color.includes("green") || insight.color.includes("emerald");
    const isPurple = insight.color.includes("purple");

    if (isRed) {
      return {
        border: "rgba(239, 68, 68, 0.25)",
        borderHover: "rgba(239, 68, 68, 0.4)",
        glow: "rgba(239, 68, 68, 0.5)",
        shadow: "rgba(239, 68, 68, 0.08)",
      };
    } else if (isAmber) {
      return {
        border: "rgba(245, 158, 11, 0.25)",
        borderHover: "rgba(245, 158, 11, 0.4)",
        glow: "rgba(245, 158, 11, 0.5)",
        shadow: "rgba(245, 158, 11, 0.08)",
      };
    } else if (isGreen) {
      return {
        border: "rgba(16, 185, 129, 0.25)",
        borderHover: "rgba(16, 185, 129, 0.4)",
        glow: "rgba(16, 185, 129, 0.5)",
        shadow: "rgba(16, 185, 129, 0.08)",
      };
    } else if (isPurple) {
      return {
        border: "rgba(168, 85, 247, 0.25)",
        borderHover: "rgba(168, 85, 247, 0.4)",
        glow: "rgba(168, 85, 247, 0.5)",
        shadow: "rgba(168, 85, 247, 0.08)",
      };
    } else {
      return {
        border: "rgba(99, 102, 241, 0.25)",
        borderHover: "rgba(99, 102, 241, 0.4)",
        glow: "rgba(99, 102, 241, 0.5)",
        shadow: "rgba(99, 102, 241, 0.08)",
      };
    }
  }, [insight.color]);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01, borderColor: themeColors.borderHover }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 18,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="min-w-full md:min-w-[320px] p-6 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-[24px] border shadow-sm snap-center flex flex-col gap-4 relative overflow-hidden group"
      style={{
        borderColor: themeColors.border,
        boxShadow: `0 8px 32px -4px ${themeColors.shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      }}
    >
      {/* Decorative Aura Blob */}
      <div
        className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-10 pointer-events-none transition-transform duration-700 ease-out group-hover:scale-125"
        style={{ backgroundColor: themeColors.glow }}
      />

      <div className="flex items-center gap-3 relative z-10">
        <div 
          className="p-2 rounded-xl backdrop-blur-md flex items-center justify-center border"
          style={{ 
            backgroundColor: themeColors.border, 
            borderColor: themeColors.borderHover 
          }}
        >
          <insight.icon size={18} className={insight.color} />
        </div>
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.15em] ${insight.color} opacity-90`}>
          {insight.title}
        </span>
      </div>

      <p className="text-gray-900 dark:text-gray-100 font-bold text-[14px] leading-relaxed relative z-10 tracking-wide">
        {insight.text}
      </p>
    </motion.div>
  );
});

InsightCard.displayName = "InsightCard";

const AiInsights = ({ insights = [], isLoading = false }: AiInsightsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      const index = Math.round(scrollLeft / width);
      setActiveIndex(Math.min(Math.max(0, index), insights.length - 1));
    }
  }, [insights.length]);

  if (!insights.length && !isLoading) return null;

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
          <Cpu
            color="var(--color-accent)"
            size={20}
            className={`text-accent ${isLoading ? "animate-spin-slow" : ""}`}
          />
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-accent/60 bg-clip-text text-transparent">
          AI Insights
        </h2>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto gap-4 py-4 -mx-5 px-5 md:mx-0 md:px-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      >
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {insights.length > 1 && (
        <div className="flex justify-center gap-1.5 -mt-2 mb-4">
          {insights.map((_, i) => (
            <div
              key={i}
              className={`
                h-1 rounded-full transition-all duration-300
                ${i === activeIndex
                  ? "w-4 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                  : "w-1 bg-gray-300/50 dark:bg-gray-700/50"
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(AiInsights);

