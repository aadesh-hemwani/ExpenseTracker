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
}: {
  budgetAmount: number;
  currentBalance: number;
  isTopHero: boolean;
  statusColor: string;
}) => {
  const { theme } = useTheme();
  const [timeState, setTimeState] = useState(calculateTimeState);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeState(calculateTimeState());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const spentPercentage = budgetAmount > 0 ? Math.min((currentBalance / budgetAmount) * 100, 100) : 0;

  return (
    <div className={`relative w-full rounded-full overflow-hidden ${isTopHero ? 'h-[3px] bg-black/[0.03] dark:bg-white/[0.04]' : 'h-[3px] bg-zinc-100 dark:bg-zinc-800'}`}>
      {/* Time Progress Background */}
      <div
        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-linear"
        style={{
          width: `${timeState.progress}%`,
          backgroundColor: isTopHero ? (theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'rgba(128,128,128,0.1)'
        }}
      />
      {/* Spend Progress */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${spentPercentage}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`absolute top-0 left-0 h-full rounded-full z-0 ${isTopHero ? 'bg-black/30 dark:bg-white/40' : statusColor}`}
      />
      {/* Current Time Indicator Line */}
      <div
        className={`absolute top-0 h-full z-20 transition-all duration-1000 ease-linear ${isTopHero ? 'w-[2px] bg-black/20 dark:bg-white/30' : 'w-[2px] bg-zinc-400 dark:bg-zinc-500'}`}
        style={{
          left: `${timeState.progress}%`,
          transform: 'translateX(-50%)',
        }}
      />
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
    // Almost invisible gradients, flat matte look
    const baseColor = theme === 'dark' ? 'rgba(11, 11, 12, 1)' : 'rgba(250, 250, 251, 1)';
    const subtleHighlight = theme === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)';
    return `radial-gradient(120% 120% at 50% 0%, 
      ${subtleHighlight} 0%, 
      ${baseColor} 40%, 
      ${baseColor} 100%)`;
  }, [theme]);

  const bleedColor = "#0B0B0C";

  return (
    <div
      className={`relative w-full mx-auto group ${isTopHero
        ? "hero-scroll-root z-30 overflow-hidden rounded-b-[16px]"
        : "max-w-[400px] rounded-2xl p-[1.5px] overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.02)] transition-all duration-700"
        }`}
      role="region"
      aria-label="Account Balance Summary"
    >
      {/* Background Layer */}
      {isTopHero ? (
        <>
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
          className="absolute inset-0 z-0 transition-opacity duration-500 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            background: `conic-gradient(from 180deg, currentColor ${timeState.dayProgress}%, transparent ${timeState.dayProgress}%)`,
          }}
        />
      )}

      <div
        className={`relative z-10 w-full overflow-hidden ${isTopHero
          ? "hero-inner px-5 sm:px-8 bg-transparent backdrop-blur-sm flex flex-col pt-4 pb-8"
          : "rounded-[calc(16px-1.5px)] px-5 py-6 sm:px-7 sm:py-8 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-none transition-all duration-300"
          }`}
      >
        {/* Safe-area spacer for top hero */}
        {isTopHero && (
          <div className="w-full" style={{ height: "env(safe-area-inset-top, 0px)" }} />
        )}



        {/* Top Hero Specific Header: Greeting & Date */}
        {isTopHero && (
          <div className="mb-3 opacity-90">
            <h2 className="text-[15px] font-medium text-zinc-900/40 dark:text-white/40 tracking-tight">
              {greeting}, {firstName || "there"}
            </h2>
            <p className="text-[13px] font-medium text-zinc-900/30 dark:text-white/30 tracking-tight mt-0.5">
              Total spent this month
            </p>
          </div>
        )}

        {/* Primary: Massive Balance Number */}
        <div
          className={`hero-balance-row relative z-10 flex items-center active:scale-95 transition-opacity ${isTopHero ? 'mb-8' : 'justify-center pb-6'} ${onAmountClick ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={onAmountClick}
        >
          <div className={`flex items-baseline ${isTopHero ? 'will-change-transform' : ''}`}>
            <CountUp
              value={Math.trunc(currentBalance)}
              currency={false}
              prefix="₹"
              prefixClassName={`inline-block font-medium tracking-tight pr-1 ${isTopHero ? 'text-[2rem] sm:text-[2.4rem] text-zinc-900/40 dark:text-white/40' : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'}`}
              className={`tracking-tighter font-semibold font-sans ${isTopHero ? 'text-[3.5rem] sm:text-[4.2rem] leading-none text-zinc-900 dark:text-white' : 'text-5xl sm:text-6xl text-zinc-900 dark:text-white'}`}
            />
            {hasDecimals && (
              <span className={`font-medium tracking-tight ml-0.5 ${isTopHero ? 'text-[1.5rem] sm:text-[1.8rem] text-zinc-900/40 dark:text-white/40' : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'}`}>
                .{currentBalance.toFixed(2).split(".")[1]}
              </span>
            )}
          </div>
        </div>

        {/* Progress Section */}
        {budgetAmount > 0 && (
          <div className="mb-4">
            <HeroProgressTimer
              budgetAmount={budgetAmount}
              currentBalance={currentBalance}
              isTopHero={isTopHero}
              statusColor={statusColor}
            />
          </div>
        )}

        {/* Semantic Statistics Row */}
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] font-medium tracking-tight cursor-pointer active:opacity-60 transition-opacity ${isTopHero ? 'text-zinc-900/50 dark:text-white/50' : 'text-zinc-500 dark:text-zinc-400'}`}
          onClick={onTrendClick}
          role="button"
          aria-label="View Trend Details"
        >
          {budgetAmount > 0 ? (
            <>
              <span>{Math.min((currentBalance / budgetAmount) * 100, 100).toFixed(0)}% spent</span>
              <span className="opacity-30">·</span>
              <span>{timeState.progress.toFixed(0)}% time</span>
              <span className="opacity-30">·</span>
              <span>{formatCurrency(remainingAmount).split('.')[0]} left</span>
            </>
          ) : (
            <span>Avg {formatCurrency(dailyAverage || 0).split('.')[0]}/day</span>
          )}


        </div>
      </div>
    </div>
  );
};

export default HeroBalance;
