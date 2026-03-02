import React from "react";
import CountUp from "./CountUp";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "../utils/formatUtils";

interface HeroBalanceProps {
  currentBalance: number;
  trendDirection: "up" | "down";
  percentageChange: string;
  topCategory?: string;
  dailyAverage?: number;
  onTrendClick: () => void;
}

const HeroBalance: React.FC<HeroBalanceProps> = ({
  currentBalance,
  trendDirection,
  percentageChange,
  topCategory,
  dailyAverage,
  onTrendClick,
}) => {
  return (
    <div
      className="relative w-full max-w-[400px] mx-auto group outline-none rounded-[1.5rem]"
      role="region"
      aria-label="Account Balance Summary"
    >
      <div
        className="relative w-full overflow-hidden rounded-[1.5rem] px-5 py-6 sm:p-7 transition-all duration-300 bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800/60"
      >
        {/* Subtle background glow/noise for depth */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />



        {/* Center: Massive Balance Number */}
        <div className="relative z-10 flex items-baseline justify-center pb-4">
          <CountUp
            value={Math.trunc(currentBalance)}
            currency={false}
            prefix="₹"
            prefixClassName="text-4xl font-light text-zinc-400 dark:text-zinc-500 tracking-normal mr-1"
            className="text-7xl tracking-tighter text-zinc-900 dark:text-white font-semibold font-sans"
          />
          <span className="text-4xl text-zinc-400 dark:text-zinc-500 font-medium tracking-tight">
            .{currentBalance.toFixed(2).split(".")[1]}
          </span>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800/80 mb-4 relative z-10"></div>

        {/* Bottom Section: Context */}
        <div className="relative z-10 flex justify-between items-center w-full">
          <div className="flex-1 pr-2">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {topCategory && topCategory !== "None"
                ? `Top Spend: ${topCategory}`
                : "Monthly Insight"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {dailyAverage && dailyAverage > 0
                ? `Avg. ${formatCurrency(dailyAverage)} / day`
                : "Tap trend pill to see trajectory"}
            </p>
          </div>

          <button
            onClick={onTrendClick}
            className={`px-3 py-1.5 rounded-full flex items-center space-x-1 border shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0
                     ${trendDirection === "down"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20"
                : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20"}`}
            aria-label={`View insights. Trending ${trendDirection} by ${percentageChange}%`}
          >
            {trendDirection === "down" ? (
              <TrendingDown size={14} strokeWidth={2.5} />
            ) : (
              <TrendingUp size={14} strokeWidth={2.5} />
            )}
            <span className="text-xs font-bold leading-none">{percentageChange}%</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroBalance;
