import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import CountUp from "./CountUp";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "../utils/formatUtils";
import { useTheme } from "../context/ThemeContext";
import { format } from "date-fns";
import "./ui/LiquidGlass.css";
import "./ui/HeroScroll.css";

const calculateTimeState = () => {
  const now = new Date();

  // Calculate day progress: percentage of the current day that has elapsed
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayProgress = ((now.getTime() - startOfDay) / (24 * 60 * 60 * 1000)) * 100;

  // Calculate month progress: percentage of the current month that has elapsed
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthProgress = ((now.getTime() - startOfMonth) / (nextMonth.getTime() - startOfMonth)) * 100;

  return {
    progress: monthProgress,
    dayProgress,
  };
};

const HeroProgressTimer = ({
  budgetAmount,
  currentBalance,
  isTopHero,
  statusColor,
  remainingAmount,
}: {
  budgetAmount: number;
  currentBalance: number;
  isTopHero: boolean;
  statusColor: string;
  remainingAmount: number;
}) => {
  const [timeState, setTimeState] = useState(calculateTimeState);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeState(calculateTimeState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const spentPercentage = budgetAmount > 0 ? Math.min((currentBalance / budgetAmount) * 100, 100) : 0;

  return (
    <div
      className={`hero-progress relative z-10 px-1 overflow-hidden ${isTopHero ? 'mt-3.5' : 'mb-6'}`}
    >
      <div className="flex flex-col overflow-hidden">
        <div className={`relative w-full rounded-full ${isTopHero ? 'h-2 bg-black/10' : 'h-1.5 bg-zinc-100 dark:bg-zinc-800/50'}`}>
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-linear"
            style={{
              width: `${timeState.progress}%`,
              backgroundColor: isTopHero ? 'rgba(255,255,255,0.15)' : 'hsla(var(--accent-h), var(--accent-s), var(--accent-l), 0.15)'
            }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${spentPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute top-0 left-0 h-full rounded-full z-0 ${isTopHero ? 'bg-white/80' : statusColor}`}
          />
          <div
            className={`absolute top-1/2 rounded-full z-20 transition-all duration-1000 ease-linear ${isTopHero ? 'w-[2px] h-5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.2)]' : 'w-1 h-3 border border-white dark:border-[#1c1c1e] bg-[var(--color-accent)] shadow-[0_0_10px_hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.4)]'}`}
            style={{
              left: `${timeState.progress}%`,
              transform: isTopHero ? 'translate(-50%, calc(-50% - 5px))' : 'translate(-50%, -50%)',
            }}
          />
        </div>
        <div className={`flex items-center text-xs font-semibold tracking-wide ${isTopHero ? 'mt-2.5 text-white/80' : 'mt-4 text-zinc-500 dark:text-zinc-400'}`}>
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
  );
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
  dailyAverage,
  budgetAmount = 0,
  greeting,
  firstName,
  isTopHero = false,
  onTrendClick,
  onAmountClick,
}) => {
  const { theme, accentColor, accentColors } = useTheme();
  const isDark = theme === "dark";
  // @ts-ignore
  const activeColor = accentColors[accentColor]?.default || "#6366f1";
  const timeState = useMemo(() => calculateTimeState(), []);

  const { remainingAmount, statusColor } = useMemo(() => {
    if (!budgetAmount || budgetAmount <= 0) {
      return { remainingAmount: 0, statusColor: "bg-zinc-400" };
    }
    const percentage = Math.min((currentBalance / budgetAmount) * 100, 100);
    const remaining = Math.max(0, budgetAmount - currentBalance);

    let color = "bg-zinc-400 dark:bg-zinc-500"; // Default / Low
    if (percentage > 85) {
      color = "bg-rose-500"; // High usage
    } else if (percentage > 60) {
      color = "bg-amber-500"; // Medium usage
    }

    return { remainingAmount: remaining, statusColor: color };
  }, [currentBalance, budgetAmount]);

  const hasDecimals = currentBalance % 1 !== 0;

  const gradientBg = useMemo(() => {
    if (isDark) {
      return `radial-gradient(140% 140% at 50% 0%, color-mix(in srgb, ${activeColor} 20%, white 20%) 0%, color-mix(in srgb, ${activeColor} 40%, transparent) 40%, color-mix(in srgb, ${activeColor} 15%, black 40%) 100%)`;
    } else {
      // Gorgeous semi-transparent glass gradient for Light Theme
      return `radial-gradient(140% 140% at 50% 0%, 
        color-mix(in srgb, ${activeColor} 55%, white 25%) 0%, 
        color-mix(in srgb, ${activeColor} 40%, transparent) 45%, 
        color-mix(in srgb, ${activeColor} 25%, black 45%) 100%)`;
    }
  }, [activeColor, isDark]);

  const bleedColor = useMemo(() => {
    return isDark 
      ? `color-mix(in srgb, ${activeColor} 10%, white 10%)` 
      : `color-mix(in srgb, ${activeColor} 55%, white 25%)`;
  }, [activeColor, isDark]);

  return (
    <div
      className={`relative w-full mx-auto group ${isTopHero
        ? `hero-scroll-root z-30 overflow-hidden rounded-b-[32px] backdrop-blur-sm liquid-glass-effect border-b ${isDark ? 'border-white/5' : 'border-white/15'}`
        : "max-w-[400px] rounded-[1.5rem] p-[1.5px] overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.04)] transition-all duration-700"
        }`}
      role="region"
      aria-label="Account Balance Summary"
    >
      {/* Background Layer */}
      {isTopHero ? (
        <>
          {/* Subtle dark tint behind the glass in Light Mode to ensure perfect text contrast and visible blur */}
          {!isDark && (
            <div className="absolute inset-0 bg-black/[0.18] z-0 rounded-b-[32px] pointer-events-none" />
          )}
          <div
            className="absolute inset-0 z-0 will-change-transform"
            style={{
              background: gradientBg,
            }}
          >
            {/* Overscroll Bleed: Extends the gradient upwards so pulling down doesn't show black */}
            <div
              className="absolute -top-[500px] left-0 right-0 h-[500px]"
              style={{ backgroundColor: bleedColor }}
            />
          </div>
        </>
      ) : (
        <div
          className="absolute inset-0 z-0 transition-opacity duration-500 opacity-20 group-hover:opacity-40"
          style={{
            background: `conic-gradient(from 180deg, var(--color-accent) ${timeState.dayProgress}%, transparent ${timeState.dayProgress}%)`,
          }}
        />
      )}

      <div
        className={`relative z-10 w-full overflow-hidden ${isTopHero
          ? "hero-inner px-8 sm:px-10 bg-transparent flex flex-col"
          : "rounded-[calc(1.5rem-1.5px)] px-5 py-6 sm:px-7 sm:py-8 bg-zinc-50 dark:bg-[#1c1c1e] border-none transition-all duration-300"
          }`}
      >
        {/* Safe-area spacer for top hero */}
        {isTopHero && (
          <div className="w-full" style={{ height: "env(safe-area-inset-top, 0px)" }} />
        )}



        {/* Top Hero Specific Header: Greeting & Date */}
        {isTopHero && (
          <div className="hero-greeting overflow-hidden">
            <div className="flex items-baseline space-x-1.5 mb-2.5">
              <span className="text-lg font-extrabold text-white/70 tracking-tight">
                {greeting},
              </span>
              <h1 className="text-lg font-extrabold text-white tracking-tight">
                {firstName || "there"}
              </h1>
            </div>
          </div>
        )}

        {/* Primary: Massive Balance Number */}
        <div
          className={`hero-balance-row relative z-10 flex items-center px-1 active:scale-95 ${isTopHero ? 'justify-between' : 'justify-center pb-6'
            } ${onAmountClick ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={onAmountClick}
        >
          <div
            className={`flex items-baseline ${isTopHero ? 'hero-amount will-change-transform' : ''}`}
          >
            <CountUp
              value={Math.trunc(currentBalance)}
              currency={false}
              prefix="₹ "
              prefixClassName={`inline-block font-light tracking-normal pr-2 sm:pr-3 ${isTopHero ? 'text-[2rem] sm:text-[2.5rem] text-white/60' : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'
                }`}
              className={`tracking-tight font-bold font-sans ${isTopHero ? 'text-[2.8rem] sm:text-[3.6rem] leading-none text-white' : 'text-5xl sm:text-6xl text-zinc-900 dark:text-white'
                }`}
            />
            {hasDecimals && (
              <span className={`font-medium tracking-tight ml-1 ${isTopHero ? 'text-[1.5rem] sm:text-[1.8rem] text-white/60' : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'
                }`}>
                .{currentBalance.toFixed(2).split(".")[1]}
              </span>
            )}
          </div>
        </div>

        {/* Secondary: Progress Section */}
        {budgetAmount > 0 && (
          <HeroProgressTimer
            budgetAmount={budgetAmount}
            currentBalance={currentBalance}
            isTopHero={isTopHero}
            statusColor={statusColor}
            remainingAmount={remainingAmount}
          />
        )}

        {/* Divider - only show if no budget */}
        {!budgetAmount && !isTopHero && (
          <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800/80 mb-6 relative z-10"></div>
        )}

        {/* Tertiary: Contextual Insight & Trend */}
        <div
          className="hero-tertiary relative z-10 flex justify-between items-center w-full px-1 mt-auto overflow-hidden"
        >
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
            className={`hero-trend-btn px-4 py-2 rounded-full flex items-center space-x-1.5 outline-none transition-transform active:scale-95 cursor-pointer shrink-0 border border-transparent backdrop-blur-md
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
