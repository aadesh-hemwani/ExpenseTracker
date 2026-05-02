import React, { useMemo, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import CountUp from "./CountUp";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatCurrency } from "../utils/formatUtils";
import { useTheme } from "../context/ThemeContext";
import { format } from "date-fns";
import { useScrollContainer } from "./Layout";
import "./ui/LiquidGlass.css";

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

  const scrollRef = useScrollContainer();
  const { scrollY } = useScroll({ container: scrollRef || undefined });

  // ─── Scroll Animation Configuration ───
  const SHRINK_LIMIT = 550; // Increase to slow down, decrease to speed up

  const config = {
    full: [0, SHRINK_LIMIT],
    mid: [0, SHRINK_LIMIT * 0.8],
    quick: [0, SHRINK_LIMIT * 0.5],
    sticky: [SHRINK_LIMIT * 0.5, SHRINK_LIMIT * 0.8],
    delayed: [SHRINK_LIMIT * 0.2, SHRINK_LIMIT],
  };

  // Primary Row (Balance)
  const amountScale = useTransform(scrollY, config.full, [1, 0.55]);
  const primaryRowY = useTransform(scrollY, config.full, [0, -5]);
  const primaryRowMb = useTransform(scrollY, config.full, [16, 0]);

  // Layout Spacing
  const paddingTop = useTransform(scrollY, config.full, [16, 2]);
  const paddingBottom = useTransform(scrollY, config.full, [40, 4]);

  // Greeting — fade + collapse
  const secondaryOpacity = useTransform(scrollY, config.quick, [1, 0]);
  const greetingScale = useTransform(scrollY, config.mid, [1, 0.7]);
  const greetingY = useTransform(scrollY, config.mid, [0, -15]);
  const greetingMaxH = useTransform(scrollY, config.mid, [120, 0]);

  // Progress bar — fade + collapse
  const progressOpacity = useTransform(scrollY, config.mid, [1, 0]);
  const progressScale = useTransform(scrollY, config.mid, [1, 0.7]);
  const progressY = useTransform(scrollY, config.mid, [0, -10]);
  const progressMaxH = useTransform(scrollY, config.delayed, [200, 0]);
  const progressMb = useTransform(scrollY, config.delayed, [32, 0]);

  // Sticky stats
  const stickyStatsOpacity = useTransform(scrollY, config.sticky, [0, 1]);

  // Tertiary row — fade + collapse
  const tertiaryOpacity = useTransform(scrollY, config.mid, [1, 0]);
  const tertiaryScale = useTransform(scrollY, config.full, [1, 0.75]);
  const tertiaryY = useTransform(scrollY, config.full, [0, -10]);
  const tertiaryMaxH = useTransform(scrollY, config.delayed, [80, 0]);
  const trendBtnScale = useTransform(scrollY, config.full, [1, 0.7]);

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
    <motion.div
      className={`relative w-full mx-auto group ${isTopHero
        ? "sticky top-0 z-50 overflow-hidden rounded-b-[48px] backdrop-blur-sm liquid-glass-effect border-b border-white/5"
        : "max-w-[400px] rounded-[1.5rem] p-[1.5px] overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.04)] transition-all duration-700"
        }`}
      role="region"
      aria-label="Account Balance Summary"
    >
      {/* Background Layer */}
      {isTopHero ? (
        <motion.div
          className="absolute inset-0 z-0 will-change-transform"
          style={{
            background: `radial-gradient(140% 140% at 50% 0%, color-mix(in srgb, ${activeColor} 20%, white 20%) 0%, color-mix(in srgb, ${activeColor} 40%, transparent) 40%, color-mix(in srgb, ${activeColor} 15%, black 40%) 100%)`,
          }}
        >
          {/* Overscroll Bleed: Extends the gradient upwards so pulling down doesn't show black */}
          <div
            className="absolute -top-[500px] left-0 right-0 h-[500px]"
            style={{ backgroundColor: `color-mix(in srgb, ${activeColor} 10%, white 10%)` }}
          />
        </motion.div>
      ) : (
        <div
          className="absolute inset-0 z-0 transition-opacity duration-500 opacity-20 group-hover:opacity-40"
          style={{
            background: `conic-gradient(from 180deg, var(--color-accent) ${timeState.dayProgress}%, transparent ${timeState.dayProgress}%)`,
          }}
        />
      )}

      <motion.div
        className={`relative z-10 w-full overflow-hidden ${isTopHero
          ? "px-6 sm:px-8 bg-transparent flex flex-col will-change-[padding]"
          : "rounded-[calc(1.5rem-1.5px)] px-5 py-6 sm:px-7 sm:py-8 bg-zinc-50 dark:bg-[#1c1c1e] border-none transition-all duration-300"
          }`}
        style={isTopHero ? {
          paddingTop,
          paddingBottom,
        } : {}}
      >
        {/* Safe-area spacer for top hero — keeps safe area constant, only animates the extra padding */}
        {isTopHero && (
          <div className="w-full" style={{ height: "env(safe-area-inset-top, 0px)" }} />
        )}



        {/* Top Hero Specific Header: Greeting & Date */}
        {isTopHero && (
          <motion.div
            style={{
              opacity: secondaryOpacity,
              scale: greetingScale,
              y: greetingY,
              maxHeight: greetingMaxH,
              originY: 0,
              originX: 0,
            }}
            className="overflow-hidden will-change-[transform,opacity]"
          >
            <div className="flex items-baseline space-x-2 mb-3">
              <span className="text-xl font-extrabold text-white/70 tracking-tight">
                {greeting},
              </span>
              <h1 className="text-xl font-extrabold text-white tracking-tight">
                {firstName || "there"}
              </h1>
            </div>
          </motion.div>
        )}

        {/* Primary: Massive Balance Number */}
        <motion.div
          className={`relative z-10 flex items-center px-1 active:scale-95 ${isTopHero ? 'justify-between' : 'justify-center pb-6'
            } ${onAmountClick ? 'cursor-pointer hover:opacity-80' : ''}`}
          style={isTopHero ? {
            y: primaryRowY,
            marginBottom: primaryRowMb,
          } : {}}
          onClick={onAmountClick}
        >
          <motion.div
            className="flex items-baseline will-change-transform"
            style={isTopHero ? { scale: amountScale, originX: 0 } : {}}
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
          </motion.div>

          {/* Sticky-only Stats (Fades in on scroll) */}
          {isTopHero && budgetAmount > 0 && (
            <motion.div
              style={{ opacity: stickyStatsOpacity }}
              className="flex flex-col items-end text-right"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-white/50 leading-none mb-1">
                Budget Status
              </span>
              <div className="flex items-center space-x-2 text-white font-bold">
                <span className="text-sm font-mono">{spentPercentage.toFixed(0)}% Used</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-sm">
                  {(() => {
                    const formatted = formatCurrency(remainingAmount);
                    const [main] = formatted.split(".");
                    return main;
                  })()} left
                </span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Secondary: Progress Section */}
        {budgetAmount > 0 && (
          <motion.div
            className={`relative z-10 px-1 overflow-hidden ${isTopHero ? '' : 'mb-6'}`}
            style={isTopHero ? {
              opacity: progressOpacity,
              scale: progressScale,
              y: progressY,
              maxHeight: progressMaxH,
              marginBottom: progressMb,
              originY: 0,
              originX: 0,
            } : {}}
          >
            <div className="flex flex-col overflow-hidden will-change-[transform,opacity]">
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
                  className={`absolute top-0 left-0 h-full rounded-full z-0 ${isTopHero ? 'bg-white/80' : statusColor}`}
                />

                {/* Accent Time Marker that sits on top */}
                <div
                  className={`absolute top-1/2 rounded-full z-20 transition-all duration-1000 ease-linear ${isTopHero ? 'w-[2px] h-5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.2)]' : 'w-1 h-3 border border-white dark:border-[#1c1c1e] bg-[var(--color-accent)] shadow-[0_0_10px_hsla(var(--accent-h),var(--accent-s),var(--accent-l),0.4)]'}`}
                  style={{
                    left: `${timeState.progress}%`,
                    transform: isTopHero ? 'translate(-50%, calc(-50% - 5px))' : 'translate(-50%, -50%)',
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
          </motion.div>
        )}

        {/* Divider - only show if no budget */}
        {!budgetAmount && !isTopHero && (
          <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800/80 mb-6 relative z-10"></div>
        )}

        {/* Tertiary: Contextual Insight & Trend */}
        <motion.div
          className="relative z-10 flex justify-between items-center w-full px-1 mt-auto overflow-hidden will-change-[transform,opacity]"
          style={isTopHero ? {
            opacity: tertiaryOpacity,
            scale: tertiaryScale,
            y: tertiaryY,
            maxHeight: tertiaryMaxH,
          } : {}}
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

          <motion.button
            onClick={onTrendClick}
            className={`px-4 py-2 rounded-full flex items-center space-x-1.5 outline-none transition-transform active:scale-95 cursor-pointer shrink-0 border border-transparent backdrop-blur-md
                     ${isTopHero
                ? "bg-black/10 text-white border-white/10 hover:bg-black/20"
                : trendDirection === "down"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400/90"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400/90 hover:border-current/20"
              }`}
            style={isTopHero ? { scale: trendBtnScale } : {}}
            aria-label={`View insights. Trending ${trendDirection} by ${percentageChange}%`}
          >
            {trendDirection === "down" ? (
              <TrendingDown size={15} strokeWidth={3} />
            ) : (
              <TrendingUp size={15} strokeWidth={3} />
            )}
            <span className="text-sm font-bold leading-none">{percentageChange}%</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default HeroBalance;
