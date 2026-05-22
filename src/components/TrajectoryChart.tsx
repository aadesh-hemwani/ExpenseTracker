import { useMemo, memo } from "react";
import { motion } from "framer-motion";

interface TrajectoryChartProps {
  currentMonthData: number[];
  lastMonthData: number[];
  currencySymbol?: string;
  trendDirection: "up" | "down";
}

const TrajectoryChart = memo(({
  currentMonthData,
  lastMonthData,
  currencySymbol = "₹",
  trendDirection,
}: TrajectoryChartProps) => {
  const chartHeight = 150;
  const chartWidth = 300;
  const padding = 20;

  const { pointsCurrent, pointsLast, daysInMonth } = useMemo(() => {
    const allValues = [...currentMonthData, ...lastMonthData];
    const maxVal = Math.max(...allValues, 100);
    const buffer = maxVal * 0.1;
    const finalMax = maxVal + buffer;

    const daysCount = Math.max(currentMonthData.length, lastMonthData.length, 2);
    const xStep = daysCount > 1 ? (chartWidth - padding * 2) / (daysCount - 1) : chartWidth - padding * 2;

    const getPoints = (data: number[]) => {
      return data.map((val, index) => {
        const x = padding + index * xStep;
        const y = chartHeight - padding - (val / finalMax) * (chartHeight - padding * 2);
        return { x, y, val };
      });
    };

    return {
      pointsCurrent: getPoints(currentMonthData),
      pointsLast: getPoints(lastMonthData),
      daysInMonth: daysCount,
    };
  }, [currentMonthData, lastMonthData]);

  const pathLast = useMemo(() => {
    if (pointsLast.length === 0) return "";
    return `M ${pointsLast[0].x} ${pointsLast[0].y} ` + pointsLast.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  }, [pointsLast]);

  const pathCurrent = useMemo(() => {
    if (pointsCurrent.length === 0) return "";
    return `M ${pointsCurrent[0].x} ${pointsCurrent[0].y} ` + pointsCurrent.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
  }, [pointsCurrent]);

  const fillPathCurrent = useMemo(() => {
    if (pointsCurrent.length === 0) return "";
    const first = pointsCurrent[0];
    const last = pointsCurrent[pointsCurrent.length - 1];
    return `M ${first.x} ${first.y} ` + 
      pointsCurrent.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${last.x} ${chartHeight - padding} L ${first.x} ${chartHeight - padding} Z`;
  }, [pointsCurrent]);

  const fillPathLast = useMemo(() => {
    if (pointsLast.length === 0) return "";
    const first = pointsLast[0];
    const last = pointsLast[pointsLast.length - 1];
    return `M ${first.x} ${first.y} ` + 
      pointsLast.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ") +
      ` L ${last.x} ${chartHeight - padding} L ${first.x} ${chartHeight - padding} Z`;
  }, [pointsLast]);

  const endPoint = pointsCurrent[pointsCurrent.length - 1];
  
  // Design variables
  const isHealthy = trendDirection === "down";
  const themeColor = isHealthy ? "#10b981" : "#ef4444"; // Emerald vs Red-500
  const glowFilterId = "neon-glow-current";
  const activeGradientId = "current-month-gradient";
  const lastMonthGradientId = "last-month-gradient";

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full aspect-[2/1] max-h-[160px]">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Ambient Line Glow Filter */}
            <filter id={glowFilterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Current Month Area Gradient */}
            <linearGradient id={activeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={themeColor} stopOpacity={0.18} />
              <stop offset="100%" stopColor={themeColor} stopOpacity={0.0} />
            </linearGradient>

            {/* Last Month Area Gradient */}
            <linearGradient id={lastMonthGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#71717a" stopOpacity={0.05} />
              <stop offset="100%" stopColor="#71717a" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Technical Vertical Grids */}
          {Array.from({ length: 3 }).map((_, i) => {
            const x = padding + ((chartWidth - padding * 2) / 4) * (i + 1);
            return (
              <line
                key={`grid-v-${i}`}
                x1={x}
                y1={padding}
                x2={x}
                y2={chartHeight - padding}
                stroke="currentColor"
                strokeOpacity="0.04"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Baseline Grid */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeDasharray="3 3"
          />

          <text
            x={padding + 5}
            y={chartHeight - padding - 6}
            className="text-[9px] fill-gray-400 dark:fill-zinc-500 font-bold tracking-wider"
          >
            {currencySymbol}0
          </text>

          <text
            x={padding}
            y={chartHeight - 2}
            className="text-[9px] fill-gray-400 dark:fill-zinc-500 font-bold uppercase tracking-wider"
            textAnchor="start"
          >
            Day 1
          </text>
          <text
            x={chartWidth - padding}
            y={chartHeight - 2}
            className="text-[9px] fill-gray-400 dark:fill-zinc-500 font-bold uppercase tracking-wider"
            textAnchor="end"
          >
            Day {daysInMonth}
          </text>

          {/* Last Month Fill */}
          {fillPathLast && (
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.0 }}
              d={fillPathLast}
              fill={`url(#${lastMonthGradientId})`}
            />
          )}

          {/* Last Month Dashed Line */}
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.35 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            d={pathLast}
            fill="none"
            stroke="#71717a"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Current Month Fill */}
          {fillPathCurrent && (
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.3 }}
              d={fillPathCurrent}
              fill={`url(#${activeGradientId})`}
            />
          )}

          {/* Current Month Glowing Neon Line */}
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            d={pathCurrent}
            fill="none"
            stroke={themeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowFilterId})`}
            style={{ filter: `drop-shadow(0 2px 8px ${themeColor}25)` }}
          />

          {/* Concentric Breathing Indicator Dot */}
          {endPoint && (
            <>
              <motion.circle
                cx={endPoint.x}
                cy={endPoint.y}
                r="7"
                fill={themeColor}
                initial={{ opacity: 0.1, scale: 0.8 }}
                animate={{
                  opacity: [0.1, 0.4, 0.1],
                  scale: [1, 1.8, 1]
                }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{ pointerEvents: "none" }}
              />
              <motion.circle
                cx={endPoint.x}
                cy={endPoint.y}
                r="3.5"
                fill={themeColor}
                stroke="#fff"
                strokeWidth="1.2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 1.4, duration: 0.4 }}
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.15))" }}
              />
            </>
          )}
        </svg>
        <div className="absolute -bottom-6 right-2 flex gap-3 text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-600 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 border-t border-dashed border-gray-400 dark:border-zinc-500" />
            <span>Last Month</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: themeColor }} />
            <span style={{ color: themeColor }}>This Month</span>
          </div>
        </div>
      </div>
    </div>
  );
});

TrajectoryChart.displayName = "TrajectoryChart";

export default TrajectoryChart;

