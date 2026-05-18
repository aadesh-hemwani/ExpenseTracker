import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import CountUp from "./CountUp";
import { formatCurrency } from "../utils/formatUtils";
import { useTheme } from "../context/ThemeContext";
import "./ui/LiquidGlass.css";
import "./ui/HeroScroll.css";

/**
 * Calculates current day and month progress percentages.
 */
const calculateTimeState = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Day progress: percentage of the current day that has elapsed
  const startOfDay = new Date(year, month, now.getDate()).getTime();
  const dayProgress = ((now.getTime() - startOfDay) / (24 * 60 * 60 * 1000)) * 100;

  // Month progress: percentage of the current month that has elapsed
  const startOfMonth = new Date(year, month, 1).getTime();
  const nextMonth = new Date(year, month + 1, 1).getTime();
  const monthProgress = ((now.getTime() - startOfMonth) / (nextMonth - startOfMonth)) * 100;

  return {
    progress: monthProgress,
    dayProgress,
  };
};

interface ProgressTimerProps {
  budgetAmount: number;
  currentBalance: number;
  isTopHero: boolean;
  statusColor: string;
  activeColor: string;
}

const HeroProgressTimer = React.memo(({
  budgetAmount,
  currentBalance,
  isTopHero,
  statusColor,
  activeColor,
}: ProgressTimerProps) => {
  const { theme } = useTheme();
  const [timeState, setTimeState] = useState(calculateTimeState);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeState(calculateTimeState());
    }, 60 * 60 * 1000); // Update every hour instead of every second
    return () => clearInterval(interval);
  }, []);

  const spentPercentage = useMemo(() => 
    budgetAmount > 0 ? (currentBalance / budgetAmount) * 100 : 0,
    [currentBalance, budgetAmount]
  );

  const isOverspending = spentPercentage > timeState.progress + 5; // adding 5% buffer to avoid turning red for minor discrepancies

  return (
    <div className="flex items-center gap-5 w-full mt-2">
      {/* Spent Bar */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex justify-between items-end text-[10px] font-bold tracking-widest uppercase">
          <span className="text-zinc-500 dark:text-zinc-400">Spent</span>
          <span className={`${isOverspending ? "text-rose-500 dark:text-rose-400" : "text-zinc-900 dark:text-white"}`}>
            {spentPercentage.toFixed(0)}%
          </span>
        </div>
        <div className={`w-full h-[5px] rounded-full ${isTopHero ? 'bg-black/5 dark:bg-white/10' : 'bg-zinc-100 dark:bg-zinc-800'} overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(spentPercentage, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${isTopHero && statusColor.includes("zinc") ? '' : statusColor}`}
            style={isTopHero && statusColor.includes("zinc") ? { backgroundColor: activeColor, opacity: 0.9 } : {}}
          />
        </div>
      </div>

      {/* Time Bar */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="flex justify-between items-end text-[10px] font-bold tracking-widest uppercase">
          <span className="text-zinc-500 dark:text-zinc-400">Time</span>
          <span className="text-zinc-900 dark:text-white">{timeState.progress.toFixed(0)}%</span>
        </div>
        <div className={`w-full h-[5px] rounded-full ${isTopHero ? 'bg-black/5 dark:bg-white/10' : 'bg-zinc-100 dark:bg-zinc-800'} overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${timeState.progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${isTopHero ? '' : 'bg-zinc-400 dark:bg-zinc-500'}`}
            style={isTopHero ? { backgroundColor: activeColor, opacity: 0.3 } : {}}
          />
        </div>
      </div>
    </div>
  );
});

HeroProgressTimer.displayName = "HeroProgressTimer";

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

const HeroBalance = React.memo(({
  currentBalance,
  budgetAmount = 0,
  dailyAverage,
  greeting,
  firstName,
  isTopHero = false,
  onTrendClick,
  onAmountClick,
}: HeroBalanceProps) => {
  const { theme, accentColor, accentColors } = useTheme();
  
  const activeColor = useMemo(() => {
    const color = accentColors[accentColor];
    return color ? color.default : "#6366f1";
  }, [accentColors, accentColor]);

  const timeState = useMemo(() => calculateTimeState(), []);

  const { remainingAmount, isOverspent, statusColor } = useMemo(() => {
    if (!budgetAmount || budgetAmount <= 0) {
      return { remainingAmount: 0, isOverspent: false, statusColor: "bg-zinc-400" };
    }
    const percentage = (currentBalance / budgetAmount) * 100;
    const isOverspent = currentBalance > budgetAmount;
    const remaining = isOverspent ? currentBalance - budgetAmount : budgetAmount - currentBalance;

    let color = "bg-zinc-400 dark:bg-zinc-500";
    if (percentage > 85) color = "bg-rose-500";
    else if (percentage > 60) color = "bg-amber-500";

    return { remainingAmount: remaining, isOverspent, statusColor: color };
  }, [currentBalance, budgetAmount]);

  const hasDecimals = currentBalance % 1 !== 0;

  const gradientBg = useMemo(() => {
    const isDark = theme === 'dark';
    const baseColor = isDark ? 'rgba(11, 11, 12, 1)' : 'rgba(250, 250, 251, 1)';
    const subtleHighlight = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)';
    const accentAlpha = isDark ? '0.08' : '0.04';
    
    let accentWithAlpha = activeColor;
    if (activeColor.startsWith('#')) {
      const alphaHex = Math.round(parseFloat(accentAlpha) * 255).toString(16).padStart(2, '0');
      accentWithAlpha = `${activeColor}${alphaHex}`;
    }

    return `radial-gradient(150% 150% at 50% -20%, 
      ${accentWithAlpha} 0%, 
      ${subtleHighlight} 40%, 
      ${baseColor} 80%, 
      ${baseColor} 100%)`;
  }, [theme, activeColor]);

  const containerClass = `relative w-full mx-auto group ${
    isTopHero
      ? "hero-scroll-root z-30 overflow-hidden rounded-b-[16px]"
      : "max-w-[400px] rounded-2xl p-[1.5px] overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.02)] transition-all duration-700"
  }`;

  const innerClass = `relative z-10 w-full overflow-hidden ${
    isTopHero
      ? "hero-inner px-5 sm:px-8 bg-transparent backdrop-blur-sm flex flex-col pt-4 pb-3"
      : "rounded-[calc(16px-1.5px)] px-5 py-6 sm:px-7 sm:py-8 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border-none transition-all duration-300"
  }`;

  const balanceRowClass = `hero-balance-row relative z-10 flex items-center active:scale-95 transition-opacity ${
    isTopHero ? 'mb-5' : 'justify-center pb-6'
  } ${onAmountClick ? 'cursor-pointer hover:opacity-80' : ''}`;

  const statsRowClass = `flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] font-medium tracking-tight cursor-pointer active:opacity-60 transition-opacity ${
    isTopHero ? 'text-zinc-900/50 dark:text-white/50' : 'text-zinc-500 dark:text-zinc-400'
  }`;

  return (
    <div className={containerClass} role="region" aria-label="Account Balance Summary">
      {isTopHero ? (
        <div className="absolute inset-0 z-0 will-change-transform" style={{ background: gradientBg }}>
          <div
            className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[70%] h-[50%] opacity-[0.1] dark:opacity-[0.15] blur-[100px] pointer-events-none z-0"
            style={{ backgroundColor: activeColor }}
          />
          <div className="absolute -top-[500px] left-0 right-0 h-[500px] bg-[#0B0B0C]" />
        </div>
      ) : (
        <div
          className="absolute inset-0 z-0 transition-opacity duration-500 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            background: `conic-gradient(from 180deg, ${activeColor} ${timeState.dayProgress}%, transparent ${timeState.dayProgress}%)`,
          }}
        />
      )}

      <div className={innerClass}>
        {isTopHero && <div className="w-full" style={{ height: "env(safe-area-inset-top, 0px)" }} />}

        {isTopHero && (
          <div className="mb-2 opacity-90">
            <h2 className="text-[15px] font-medium text-zinc-900/40 dark:text-white/40 tracking-tight">
              {greeting}, {firstName || "there"}
            </h2>
            <p className="text-[13px] font-medium text-zinc-900/30 dark:text-white/30 tracking-tight mt-0.5">
              Total spent this month
            </p>
          </div>
        )}

        <div className={balanceRowClass} onClick={onAmountClick}>
          <div className={`flex items-baseline ${isTopHero ? 'will-change-transform' : ''}`}>
            <CountUp
              value={Math.trunc(currentBalance)}
              currency={false}
              prefix="₹"
              prefixClassName={`inline-block font-medium tracking-tight pr-1 ${
                isTopHero ? 'text-[2rem] sm:text-[2.4rem]' : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'
              }`}
              prefixStyle={isTopHero ? { color: activeColor, opacity: 0.4 } : {}}
              className={`tracking-tighter font-semibold font-sans ${
                isTopHero 
                  ? 'text-[3.5rem] sm:text-[4.2rem] leading-none text-zinc-900 dark:text-white' 
                  : 'text-5xl sm:text-6xl text-zinc-900 dark:text-white'
              }`}
            />
            {hasDecimals && (
              <span className={`font-medium tracking-tight ml-0.5 ${
                isTopHero 
                  ? 'text-[1.5rem] sm:text-[1.8rem] text-zinc-900/40 dark:text-white/40' 
                  : 'text-4xl sm:text-5xl text-zinc-400 dark:text-zinc-500'
              }`}>
                .{currentBalance.toFixed(2).split(".")[1]}
              </span>
            )}
          </div>
        </div>

        {budgetAmount > 0 && (
          <div className="mb-2.5">
            <HeroProgressTimer
              budgetAmount={budgetAmount}
              currentBalance={currentBalance}
              isTopHero={isTopHero}
              statusColor={statusColor}
              activeColor={activeColor}
            />
          </div>
        )}

        <div className={statsRowClass} onClick={onTrendClick} role="button" aria-label="View Trend Details">
          {budgetAmount > 0 ? (
            <div className="flex w-full items-center justify-between pt-1">
              <span>{formatCurrency(remainingAmount).split('.')[0]} {isOverspent ? 'overspent' : 'remaining'}</span>
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">View Trend &rarr;</span>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between pt-1">
              <span>Avg {formatCurrency(dailyAverage || 0).split('.')[0]}/day</span>
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">View Trend &rarr;</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

HeroBalance.displayName = "HeroBalance";

export default HeroBalance;
