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

    // Compare spent percentage against time elapsed percentage
    // If spent % exceeds time % by more than 5% buffer, check threshold severity
    let color = "bg-emerald-500";
    if (isOverspent || percentage >= 100) {
      color = "bg-rose-500";
    } else if (percentage > timeState.progress + 15) {
      // Significantly pacing ahead of time
      color = "bg-rose-500";
    } else if (percentage > timeState.progress + 5) {
      // Slightly pacing ahead of time
      color = "bg-amber-500";
    }

    return { remainingAmount: remaining, isOverspent, statusColor: color };
  }, [currentBalance, budgetAmount, timeState.progress]);

  const hasDecimals = currentBalance % 1 !== 0;

  return (
    <section className={`w-full ${isTopHero ? 'pt-8 pb-4' : 'max-w-[400px] mx-auto py-2'}`} role="region" aria-label="Account Balance Summary">
      <div className={`w-full flex flex-col ${isTopHero ? 'px-6' : 'glass-card p-6'}`}>
        
        {isTopHero && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-4"
          >
            <div>
              <h2 className="text-[17px] font-semibold text-primary tracking-tight">
                {greeting}, {firstName || "there"}
              </h2>
              <p className="text-[13px] text-tertiary mt-1">
                Total spent this month
              </p>
            </div>
            <div className="text-right">
              <span className="text-[13px] font-medium text-tertiary">
                {(() => {
                  const now = new Date();
                  return now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                })()}
              </span>
            </div>
          </motion.div>
        )}

        <motion.div 
          className={`flex items-baseline ${onAmountClick ? 'cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all' : ''}`} 
          onClick={onAmountClick}
          whileTap={onAmountClick ? { scale: 0.96 } : {}}
        >
          <span className="text-3xl font-medium text-tertiary pr-1" style={{ color: activeColor }}>₹</span>
          <CountUp
            value={Math.trunc(currentBalance)}
            currency={false}
            className={`font-bold tracking-tighter text-primary ${isTopHero ? 'text-[clamp(3rem,8vw,4.5rem)] leading-none' : 'text-5xl'}`}
          />
          {hasDecimals && (
            <span className="text-2xl font-medium text-tertiary ml-1">
              .{currentBalance.toFixed(2).split(".")[1]}
            </span>
          )}
        </motion.div>

        {budgetAmount > 0 && (
          <div className="mt-6 mb-2">
            <HeroProgressTimer
              budgetAmount={budgetAmount}
              currentBalance={currentBalance}
              isTopHero={isTopHero}
              statusColor={statusColor}
              activeColor={activeColor}
            />
          </div>
        )}

        <div 
          className="flex w-full items-center justify-between mt-4 pt-4 border-t border-subtle/50 cursor-pointer hover:opacity-70 active:opacity-50 transition-opacity" 
          onClick={onTrendClick}
        >
          <span className="text-[15px] text-secondary font-medium tracking-tight">
            {budgetAmount > 0 
              ? `${formatCurrency(remainingAmount).split('.')[0]} ${isOverspent ? 'overspent' : 'remaining'}`
              : `Avg ${formatCurrency(dailyAverage || 0).split('.')[0]}/day`
            }
          </span>
          <span className="text-[13px] font-semibold text-primary opacity-50 flex items-center gap-1">
            Trend <span className="text-[16px] leading-none">&rarr;</span>
          </span>
        </div>

      </div>
    </section>
  );
});

HeroBalance.displayName = "HeroBalance";

export default HeroBalance;
