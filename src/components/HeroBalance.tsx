import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import CountUp from "./CountUp";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "../utils/formatUtils";
import { useTheme } from "../context/ThemeContext";
import { format } from "date-fns";

const calculateTimeState = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const totalMsMonth = nextMonth.getTime() - startOfMonth.getTime();
  const passedMsMonth = now.getTime() - startOfMonth.getTime();

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const totalMsDay = endOfDay.getTime() - startOfDay.getTime();
  const passedMsDay = now.getTime() - startOfDay.getTime();

  return {
    progress: Math.min((passedMsMonth / totalMsMonth) * 100, 100),
    dayProgress: Math.min((passedMsDay / totalMsDay) * 100, 100),
    secondsPassed: Math.floor(passedMsMonth / 1000),
    totalSeconds: Math.floor(totalMsMonth / 1000)
  };
};
interface HeroBalanceProps {
  currentBalance: number;
  trendDirection: "up" | "down";
  percentageChange: string;
  topCategory?: string;
  dailyAverage?: number;
  budgetAmount?: number;
  greeting?: string;
  firstName?: string;
  isTopHero?: boolean;
  onTrendClick: () => void;
  onAmountClick?: () => void;
}

const HeroBalance: React.FC<HeroBalanceProps> = ({
  currentBalance,
  trendDirection,
  percentageChange,
  topCategory,
  dailyAverage,
  budgetAmount = 0,
  greeting,
  firstName,
  isTopHero = false,
  onTrendClick,
  onAmountClick,
}) => {
  const { accentColor, accentColors } = useTheme();
  // @ts-ignore
  const activeColor = accentColors[accentColor]?.default || "#6366f1";

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

  const [timeState, setTimeState] = useState(calculateTimeState);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeState(calculateTimeState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hasDecimals = currentBalance % 1 !== 0;

  return (
    <div
      className={`relative w-full mx-auto group transition-all duration-700 ${isTopHero
          ? "rounded-b-[48px] overflow-hidden shadow-sm"
          : "max-w-[400px] rounded-[1.5rem] p-[1.5px] overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.04)]"
        }`}
      role="region"
      aria-label="Account Balance Summary"
    >
      {/* Background Layer */}
      {isTopHero ? (
        <div
          className="absolute inset-0 z-0 transition-colors duration-1000"
          style={{
            background: `radial-gradient(140% 140% at 50% 0%, color-mix(in srgb, ${activeColor} 70%, white 30%) 0%, ${activeColor} 40%, color-mix(in srgb, ${activeColor} 40%, black 60%) 100%)`,
          }}
        />
      ) : (
        <div
          className="absolute inset-0 z-0 transition-opacity duration-500 opacity-20 group-hover:opacity-40"
          style={{
            background: `conic-gradient(from 180deg, var(--color-accent) ${timeState.dayProgress}%, transparent ${timeState.dayProgress}%)`,
          }}
        />
      )}

      <div
        className={`relative z-10 w-full overflow-hidden transition-all duration-300 ${isTopHero
            ? `pt-[calc(env(safe-area-inset-top)+1rem)] pb-10 px-6 sm:px-8 bg-transparent flex flex-col`
            : "rounded-[calc(1.5rem-1.5px)] px-5 py-6 sm:px-7 sm:py-8 bg-zinc-50 dark:bg-[#1c1c1e] border-none"
          }`}
      >
        {/* Subtle background glow/noise for depth */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none z-0 mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Top Hero Specific Header: Greeting & Date */}
        {isTopHero && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2"
          >
            <p className="text-white/70 text-[11px] font-black uppercase tracking-[0.3em] mb-1.5">
              {greeting}
            </p>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
              {firstName || "there"}
            </h1>
          </motion.div>
        )}

        {/* Primary: Massive Balance Number */}
        <div
          className={`relative z-10 flex items-baseline transition-transform active:scale-95 ${isTopHero ? 'justify-start mb-6' : 'justify-center pb-6'
            } ${onAmountClick ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={onAmountClick}
        >
          <CountUp
            value={Math.trunc(currentBalance)}
            currency={false}
            prefix="₹"
            prefixClassName={`font-light tracking-normal mr-1 sm:mr-2 ${isTopHero ? 'text-3xl sm:text-4xl text-white/60' : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'
              }`}
            className={`tracking-tighter font-bold font-sans ${isTopHero ? 'text-[4rem] sm:text-[5rem] leading-none text-white' : 'text-5xl sm:text-6xl text-zinc-900 dark:text-white'
              }`}
          />
          {hasDecimals && (
            <span className={`font-medium tracking-tight ml-1 ${isTopHero ? 'text-2xl sm:text-3xl text-white/60' : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'
              }`}>
              .{currentBalance.toFixed(2).split(".")[1]}
            </span>
          )}
        </div>

        {/* Secondary: Progress Section */}
        {budgetAmount > 0 && (
          <div className={`relative z-10 px-1 ${isTopHero ? 'mb-8' : 'mb-6'}`}>
            <div className="flex flex-col">
              {/* Unified Progress Bar Track */}
              <div className={`relative w-full rounded-full ${isTopHero ? 'h-2 bg-black/10' : 'h-1.5 bg-zinc-100 dark:bg-zinc-800/50'}`}>
                {/* Time Fill Background (Subtle pacing guide) */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${timeState.progress}%`,
                    backgroundColor: isTopHero ? 'rgba(255,255,255,0.15)' : 'hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.15)'
                  }}
                />

                {/* Money Spent Fill (Primary) */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${spentPercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full rounded-full z-0 ${isTopHero ? 'bg-white' : statusColor}`}
                />

                {/* Accent Time Marker that sits on top */}
                <div
                  className={`absolute top-1/2 rounded-full z-10 transition-all duration-1000 ease-linear ${isTopHero ? 'w-1 h-5 bg-white' : 'w-1 h-3 border border-white dark:border-[#1c1c1e] bg-[var(--color-accent)] shadow-[0_0_10px_hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.4)]'}`}
                  style={{
                    left: `${timeState.progress}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>

              {/* Inline Stats */}
              <div className={`flex items-center text-xs font-semibold mt-4 tracking-wide ${isTopHero ? 'text-white/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                <span>{spentPercentage.toFixed(0)}% used</span>
                <span className="mx-2 opacity-40">/</span>
                <span className="font-mono tracking-tighter">{timeState.progress.toFixed(1)}% time</span>
                <span className="mx-2 opacity-40">/</span>
                <span>
                  {(() => {
                    const formatted = formatCurrency(remainingAmount);
                    const [main] = formatted.split(".");
                    return main;
                  })()} left
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Divider - only show if no budget */}
        {!budgetAmount && !isTopHero && (
          <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800/80 mb-6 relative z-10"></div>
        )}

        {/* Tertiary: Contextual Insight & Trend */}
        <div className="relative z-10 flex justify-between items-center w-full px-1 mt-auto">
          <div className="flex-1 pr-2">
            <span className={`text-xs font-semibold ${isTopHero ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-600'}`}>
              {dailyAverage && dailyAverage > 0 ? (
                <>
                  {format(new Date(), "MMM yyyy")}
                  <span className="mx-2 opacity-50">·</span>
                  Avg {(() => {
                    const formatted = formatCurrency(dailyAverage);
                    const [main] = formatted.split(".");
                    return main;
                  })()} / day
                </>
              ) : (
                "Tap trend pill for trajectory"
              )}
            </span>
          </div>

          <button
            onClick={onTrendClick}
            className={`px-4 py-2 rounded-full flex items-center space-x-1.5 outline-none transition-transform active:scale-95 cursor-pointer shrink-0 border border-transparent backdrop-blur-md
                     ${isTopHero
                ? "bg-black/10 text-white border-white/10 hover:bg-black/20"
                : trendDirection === "down"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400/90"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400/90 hover:border-current/20"
              }`}
            aria-label={`View insights. Trending ${trendDirection} by ${percentageChange}%`}
          >
            {trendDirection === "down" ? (
              <TrendingDown size={15} strokeWidth={3} />
            ) : (
              <TrendingUp size={15} strokeWidth={3} />
            )}
            <span className="text-sm font-bold leading-none">{percentageChange}%</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroBalance;
