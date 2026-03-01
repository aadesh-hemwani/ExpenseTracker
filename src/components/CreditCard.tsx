import React, { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import CountUp from "./CountUp";
const TrajectoryChart = lazy(() => import("./TrajectoryChart"));
import { formatCurrency } from "../utils/formatUtils";
import { format } from "date-fns";
import { TrendingDown, TrendingUp } from "lucide-react";

interface CreditCardProps {
  currentBalance: number;
  accountName: string;
  isFlipped: boolean;
  onFlip: () => void;
  // Stats
  diff: number;
  lastMonthPartialSum: number;
  trendDirection: "up" | "down";
  percentageChange: string;
  thisMonthGraphData: number[];
  lastMonthGraphData: number[];
  lastMonthDate: Date;
}

const CreditCard: React.FC<CreditCardProps> = ({
  currentBalance,
  accountName,
  isFlipped,
  onFlip,
  diff,
  lastMonthPartialSum,
  trendDirection,
  percentageChange,
  thisMonthGraphData,
  lastMonthGraphData,
  lastMonthDate,
}) => {
  // Holographic Gradient - Apple Cash Style (Green/Gold/Cyan/Purple)
  const bg = "radial-gradient(circle at 50% 50%, #d4d4d8, #eab308, #22c55e, #06b6d4, #8b5cf6, transparent 65%)";

  const handleCardClick = () => {
    onFlip();
  };

  return (
    <div
      className="relative w-full max-w-[360px] mx-auto aspect-[1.586/1] cursor-pointer group outline-none rounded-[1.5rem]"
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* FRONT FACE */}
        <div
          className="absolute inset-0 w-full h-full liquid-card overflow-hidden rounded-[1.5rem] p-5 sm:p-7 hover:scale-[1.01] transition-all duration-500 cursor-pointer flex flex-col justify-between group dark:bg-zinc-900 bg-zinc-50"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Holographic Gradient Layer */}
          <motion.div
            className="absolute inset-0 opacity-100 dark:opacity-90 transition-opacity duration-300 pointer-events-none"
            style={{
              background: bg,
              maskImage:
                "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.25' fill-rule='evenodd'%3E%3Cpath d='M3 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6'/%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />

          {/* Noise Texture Overlay */}
          <div
            className="absolute inset-0 opacity-[0.1] dark:opacity-[0.15] pointer-events-none z-0 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
            }}
          ></div>

          <div className="flex flex-row justify-between items-start w-full">
            <div className="w-11 h-8 sm:w-12 sm:h-9 relative rounded-md overflow-hidden shadow-sm">
              <svg
                viewBox="0 0 50 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                {/* Chip Background Gradient */}
                <rect width="50" height="40" rx="6" fill="url(#chipGradient)" />

                {/* Chip Contacts Outline */}
                <path
                  d="M15 0V40M35 0V40"
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="1"
                />
                <path
                  d="M0 13H50M0 27H50"
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="1"
                />

                {/* Detailed Contacts shapes */}
                {/* Left Column */}
                <path
                  d="M4 14H14C14.5523 14 15 14.4477 15 15V25C15 25.5523 14.5523 26 14 26H4C2.34315 26 1 24.6569 1 23V17C1 15.3431 2.34315 14 4 14Z"
                  fill="url(#contactGradient)"
                  fillOpacity="0.3"
                />

                {/* Center Column - usually split */}
                <rect
                  x="16"
                  y="14"
                  width="18"
                  height="12"
                  rx="2"
                  fill="url(#contactGradient)"
                  fillOpacity="0.2"
                />

                {/* Right Column */}
                <path
                  d="M36 14H46C47.6569 14 49 15.3431 49 17V23C49 24.6569 47.6569 26 46 26H36C35.4477 26 35 25.5523 35 25V15C35 14.4477 35.4477 14 36 14Z"
                  fill="url(#contactGradient)"
                  fillOpacity="0.3"
                />

                {/* Gradients */}
                <defs>
                  <linearGradient
                    id="chipGradient"
                    x1="0"
                    y1="0"
                    x2="50"
                    y2="40"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#FBDA61" />
                    <stop offset="25%" stopColor="#F7CA55" />
                    <stop offset="50%" stopColor="#D4A017" />
                    <stop offset="75%" stopColor="#F7CA55" />
                    <stop offset="100%" stopColor="#FBDA61" />
                  </linearGradient>
                  <linearGradient
                    id="contactGradient"
                    x1="0"
                    y1="0"
                    x2="50"
                    y2="40"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#000000" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Sheen Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent opacity-40 rounded-md pointer-events-none mix-blend-overlay"></div>
            </div>
            <div className="opacity-100 filter drop-shadow-sm">
              <svg
                width="42"
                height="42"
                viewBox="0 0 512 512"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="130"
                  y="120"
                  width="260"
                  height="50"
                  rx="25"
                  ry="25"
                  className="stroke-black dark:stroke-white fill-zinc-50 dark:fill-zinc-900"
                  stroke-width="5px"
                />
                <rect
                  x="130"
                  y="231"
                  width="250"
                  height="50"
                  rx="25"
                  ry="25"
                  className="stroke-black dark:stroke-white dark:fill-zinc-900 fill-zinc-50"
                  stroke-width="5px"
                />
                <rect
                  x="130"
                  y="342"
                  width="260"
                  height="50"
                  rx="25"
                  ry="25"
                  className="stroke-black dark:stroke-white dark:fill-zinc-900 fill-zinc-50"
                  stroke-width="5px"
                />
                <rect
                  x="155"
                  y="90"
                  width="50"
                  height="332"
                  rx="25"
                  ry="25"
                  className="stroke-black dark:stroke-white dark:fill-zinc-900 fill-zinc-50"
                  stroke-width="5px"
                />
              </svg>
            </div>
          </div>

          {/* Middle: Balance */}
          <div className="relative z-10 py-1">
            <span className="text-[10px] font-bold dark:text-white/70 text-zinc-700 uppercase tracking-widest block mb-1">
              Current Spendings
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-6xl tracking-tight dark:text-white text-zinc-900 drop-shadow-sm font-sans">
                <CountUp value={Math.trunc(currentBalance)} />
              </span>
              <span className="text-4xl dark:text-white/70 text-zinc-700 font-light">
                .{currentBalance.toFixed(2).split(".")[1]}
              </span>
            </div>
          </div>

          {/* Bottom: Details */}
          <div className="relative z-10 mt-auto pt-2">
            <div className="flex justify-between items-end">
              <div className="flex flex-col space-y-1">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase dark:text-white/70 text-zinc-700 tracking-widest font-bold mb-0.5">
                    Account Holder
                  </span>
                  <span className="text-[14px] font-medium dark:text-white text-zinc-900 tracking-widest uppercase truncate max-w-[180px]">
                    {accountName || "MY WALLET"}
                  </span>
                </div>
              </div>
              <div
                className={`px-3 py-1.5 rounded-full flex items-center space-x-1.5 backdrop-blur-xl border border-white/5 shadow-sm
                         ${trendDirection === "down" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}
              >
                {trendDirection === "down" ? (
                  <TrendingDown
                    color="currentColor"
                    size={14}
                  />
                ) : (
                  <TrendingUp
                    color="currentColor"
                    size={14}
                  />
                )}
                <span className="text-xs font-bold">{percentageChange}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div
          className="absolute inset-0 liquid-card overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between hover:scale-[1.01] transition-all duration-500 group bg-gradient-to-bl from-blue-100/60 via-transparent to-accent/20 dark:from-blue-800/40 dark:via-transparent dark:to-accent/15"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Noise Texture Overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none z-0 mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
            }}
          ></div>
          {/* Header Text */}
          <div className="flex justify-between items-start z-10 w-full mb-1">
            <div>
              <div className="text-xs text-tertiary/80 leading-relaxed mb-1">
                <span
                  className={`font-bold text-sm ${trendDirection === "down"
                    ? "text-emerald-500"
                    : "text-rose-500"
                    }`}
                >
                  {formatCurrency(diff)}
                </span>{" "}
                {trendDirection === "down" ? "lower" : "higher"} than last month
              </div>
              <p className="text-[10px] text-tertiary/50 leading-tight">
                By this time last month ({format(lastMonthDate, "MMMM do")}),
                you had spent{" "}
                <span className="font-medium text-tertiary/70">
                  {formatCurrency(lastMonthPartialSum)}
                </span>
              </p>
            </div>
          </div>

          {/* Graph Wrapper */}
          <div className="w-full flex-1 min-h-[80px] flex items-end justify-center pb-4">
            <div className="w-full">
              <Suspense fallback={<div className="w-full h-[60px] animate-pulse bg-black/5 dark:bg-white/5 rounded-xl" />}>
                <TrajectoryChart
                  currentMonthData={thisMonthGraphData || []}
                  lastMonthData={lastMonthGraphData || []}
                  trendDirection={trendDirection}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CreditCard;
