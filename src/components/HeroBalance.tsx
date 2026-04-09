import React, { useMemo } from "react";
import { motion } from "framer-motion";
import CountUp from "./CountUp";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "../utils/formatUtils";

interface HeroBalanceProps {
  currentBalance: number;
  trendDirection: "up" | "down";
  percentageChange: string;
  topCategory?: string;
  dailyAverage?: number;
  budgetAmount?: number;
  onTrendClick: () => void;
}

const HeroBalance: React.FC<HeroBalanceProps> = ({
  currentBalance,
  trendDirection,
  percentageChange,
  topCategory,
  dailyAverage,
  budgetAmount = 0,
  onTrendClick,
}) => {
  const { spentPercentage, remainingAmount, statusColor } = useMemo(() => {
    if (!budgetAmount || budgetAmount <= 0) {
      return { spentPercentage: 0, remainingAmount: 0, statusColor: "bg-zinc-400" };
    }
    const percentage = Math.min((currentBalance / budgetAmount) * 100, 100);
    const remaining = Math.max(0, budgetAmount - currentBalance);

    let color = "bg-zinc-400 dark:bg-zinc-500"; // Default / Low
    if (percentage > 85) {
      color = "bg-rose-500"; // High usage
    } else if (percentage > 60) {
      color = "bg-amber-500"; // Medium usage
    }

    return { spentPercentage: percentage, remainingAmount: remaining, statusColor: color };
  }, [currentBalance, budgetAmount]);

  const monthProgress = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (currentDay / daysInMonth) * 100;
  }, []);

  const hasDecimals = currentBalance % 1 !== 0;

  return (
    <div
      className="relative w-full max-w-[400px] mx-auto group outline-none rounded-[1.5rem]"
      role="region"
      aria-label="Account Balance Summary"
    >
      <div
        className="relative w-full overflow-hidden rounded-[1.5rem] px-5 py-6 sm:p-7 transition-all duration-300 bg-zinc-50 dark:bg-[#1c1c1e] border border-black/5 dark:border-white/5 shadow-[0_0_25px_rgba(0,0,0,0.04)]"
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
            prefixClassName="text-5xl font-light text-zinc-400 dark:text-zinc-500 tracking-normal mr-1"
            className="text-6xl tracking-tighter text-zinc-900 dark:text-white font-semibold font-sans"
          />
          {hasDecimals && (
            <span className="text-5xl text-zinc-400 dark:text-zinc-500 font-medium tracking-tight">
              .{currentBalance.toFixed(2).split(".")[1]}
            </span>
          )}
        </div>

        {/* Progress Bar Section (Budget) */}
        {budgetAmount > 0 && (
          <div className="relative z-10 px-1 mb-6">
            <div className="flex flex-col space-y-2.5">
              {/* Thin Progress Bar Track */}
              <div className="relative h-1.5 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded-full">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${spentPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full rounded-full ${statusColor}`}
                />
                {/* Month Progress Marker (Prominent) */}
                <div
                  className="absolute top-1/2 w-1.5 h-3.5 bg-zinc-800 dark:bg-zinc-200 rounded-full z-10 border border-white dark:border-zinc-900 shadow-sm"
                  style={{ left: `${monthProgress}%`, transform: 'translate(-50%, -50%)' }}
                  title={`${Math.round(monthProgress)}% of month passed`}
                />
              </div>


              {/* Supporting Text */}
              <div className="flex justify-between items-baseline">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {spentPercentage.toFixed(0)}% used
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    • {monthProgress.toFixed(0)}% month
                  </span>
                </div>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wider">
                  {(() => {
                    const formatted = formatCurrency(remainingAmount);
                    const [main, decimal] = formatted.split(".");
                    if (decimal && decimal !== "00") {
                      return (
                        <>
                          {main}
                          <span className="text-[0.8em] opacity-50 font-medium">.{decimal}</span>
                        </>
                      );
                    }
                    return main;
                  })()} left
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Divider - only show if no budget or adjust spacing */}
        {!budgetAmount && (
          <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800/80 mb-4 relative z-10"></div>
        )}

        {/* Bottom Section: Context */}
        <div className="relative z-10 flex justify-between items-center w-full">
          <div className="flex-1 pr-2">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">
              {topCategory && topCategory !== "None"
                ? `Top Spend: ${topCategory}`
                : "Monthly Insight"}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {dailyAverage && dailyAverage > 0 ? (
                <>
                  Avg.{" "}
                  {(() => {
                    const formatted = formatCurrency(dailyAverage);
                    const [main, decimal] = formatted.split(".");
                    if (decimal && decimal !== "00") {
                      return (
                        <>
                          {main}
                          <span className="text-[0.8em] opacity-50 font-medium">.{decimal}</span>
                        </>
                      );
                    }
                    return main;
                  })()}{" "}
                  / day
                </>
              ) : (
                "Tap trend pill to see trajectory"
              )}
            </p>
          </div>

          <button
            onClick={onTrendClick}
            className={`px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-sm transition-transform active:scale-95 cursor-pointer shrink-0
                     ${trendDirection === "down"
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
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
