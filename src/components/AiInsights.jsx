import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BrainCircuit } from 'lucide-react';

const AiInsights = ({ insights = [] }) => {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const containerRef = React.useRef(null);

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
            <div className="flex items-center gap-2 mb-4">
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
                {insights.map((insight, idx) => (
                    <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1, duration: 0.5, ease: "easeOut" }}
                        className={`
                            min-w-full md:min-w-[320px] p-5
                            bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md
                            rounded-2xl border border-gray-100 dark:border-white/5
                            dark:shadow-none shadow-[0_0_20px_rgba(70,70,70,0.15)]
                            snap-center flex flex-col gap-4 relative overflow-hidden group
                        `}
                    >
                        {/* Subtle Gradient Mesh Background - More refined */}
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20 dark:opacity-10 translate-x-1/3 -translate-y-1/3 ${insight.bg.replace('bg-', 'bg-')}`} />

                        <div className="flex items-center gap-3 relative z-10">
                            {/* Icon Box - cleaner look */}
                            <div className={`p-2.5 rounded-2xl ${insight.bg} backdrop-blur-sm border border-white/10`}>
                                <insight.icon className={`w-5 h-5 ${insight.color}`} strokeWidth={2} />
                            </div>

                            {/* Title - nicer tracking and size */}
                            <span className={`text-[11px] font-bold uppercase tracking-widest ${insight.color} opacity-90`}>
                                {insight.title}
                            </span>
                        </div>

                        {/* Text - Better readability */}
                        <p className="text-gray-800 dark:text-gray-200 font-medium text-[15px] leading-relaxed relative z-10 tracking-tight">
                            {insight.text}
                        </p>

                        {/* Minimal Sparkle - cleaner placement */}
                        <Sparkles className="absolute bottom-4 right-4 w-4 h-4 text-indigo-400/20 group-hover:text-amber-300/60 transition-colors duration-700" />
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
                                ${i === activeIndex
                                    ? 'w-4 bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                                    : 'w-1 bg-gray-300/50 dark:bg-gray-700/50'
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
