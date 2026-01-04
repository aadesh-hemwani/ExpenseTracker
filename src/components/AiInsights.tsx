import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, BrainCircuit } from "lucide-react";
import { Insight } from "../utils/insights";

interface AiInsightsProps {
  insights?: Insight[];
}

const AiInsights = ({ insights = [] }: AiInsightsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!insights.length) return null;

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      // Provide a small buffer for snapping
      const index = Math.round(scrollLeft / width);
      // Clamp to bounds
      setActiveIndex(Math.min(Math.max(0, index), insights.length - 1));
    }
  };

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
          <BrainCircuit className="w-5 h-5 text-accent" />
        </div>
        <h2 className="text-xl font-bold bg-gradient-to-br from-accent to-purple-600 bg-clip-text text-transparent">
          AI Insights
        </h2>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto gap-4 py-4 -mx-5 px-5 md:mx-0 md:px-0 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
      >
        {insights.map((insight) => (
          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 15,
              duration: 0.5,
            }}
            key={insight.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`
                            min-w-full md:min-w-[320px] p-5
                            ${insight.bg} backdrop-blur-md
                            rounded-3xl border border-subtle
                            shadow-sm
                            snap-center flex flex-col gap-3 relative overflow-hidden group
                        `}
          >
            {/* Header: Icon + Title */}
            <div className="flex items-center gap-3 relative z-10">
              <div
                className={`p-2 rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm`}
              >
                <insight.icon
                  className={`w-5 h-5 ${insight.color}`}
                  strokeWidth={2.5}
                />
              </div>

              <span
                className={`text-xs font-bold uppercase tracking-wider ${insight.color} opacity-90`}
              >
                {insight.title}
              </span>
            </div>

            {/* Text - Better readability */}
            <p className="text-gray-900 dark:text-gray-100 font-medium text-[15px] leading-snug relative z-10">
              {insight.text}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Pagination Dots */}
      {insights.length > 1 && (
        <div className="flex justify-center gap-1.5 -mt-2 mb-4">
          {insights.map((_, i) => (
            <div
              key={i}
              className={`
                                h-1 rounded-full transition-all duration-300
                                ${
                                  i === activeIndex
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

export default AiInsights;
