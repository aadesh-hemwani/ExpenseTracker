import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface TrajectoryChartProps {
  currentMonthData: number[]; // Cumulative sum array for this month
  lastMonthData: number[]; // Cumulative sum array for last month
  currencySymbol?: string;
  trendDirection: "up" | "down";
}

const TrajectoryChart: React.FC<TrajectoryChartProps> = ({
  currentMonthData,
  lastMonthData,
  currencySymbol = "₹",
  trendDirection,
}) => {
  const chartHeight = 150;
  const chartWidth = 300;
  const padding = 20;

  // Calculate scales
  const { maxY, pointsCurrent, pointsLast, daysInMonth } = useMemo(() => {
    const allValues = [...currentMonthData, ...lastMonthData];
    const maxVal = Math.max(...allValues, 100); // Ensure non-zero max
    // Add some headroom
    const buffer = maxVal * 0.1;
    const finalMax = maxVal + buffer;

    // Standardize x-axis to data length (dynamic zoom)
    // If data is less than 2 days (e.g. 1st of month), use 2 to prevent divide by zero
    const daysInMonth = Math.max(
      currentMonthData.length,
      lastMonthData.length,
      2
    );
    const xStep =
      daysInMonth > 1
        ? (chartWidth - padding * 2) / (daysInMonth - 1)
        : chartWidth - padding * 2;

    // Helper to generate point coordinates
    const getPoints = (data: number[]) => {
      return data.map((val, index) => {
        const x = padding + index * xStep;
        // Invert Y because SVG 0 is top
        const y =
          chartHeight -
          padding -
          (val / finalMax) * (chartHeight - padding * 2);
        return { x, y, val };
      });
    };

    return {
      maxY: finalMax,
      pointsCurrent: getPoints(currentMonthData),
      pointsLast: getPoints(lastMonthData),
      daysInMonth,
    };
  }, [currentMonthData, lastMonthData]);

  // Generate SVG Path commands
  const generatePath = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";

    // Start at first point
    let d = `M ${points[0].x} ${points[0].y}`;

    // Simple line to subsequent points
    // For smoother curves, we could use bezier curves, but straight lines are accurate for daily steps
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  };

  const pathLast = generatePath(pointsLast);
  const pathCurrent = generatePath(pointsCurrent);

  // Last point of current data for the "pulse" dot
  const endPoint = pointsCurrent[pointsCurrent.length - 1];

  const lineColor = trendDirection === "down" ? "#16a34a" : "#dc2626"; // green-600 : red-600
  // Tailwind colors might not parse in SVG stroke, so using hex needed or currentColor class
  const strokeClassCurrent =
    trendDirection === "down"
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  const strokeClassLast = "text-gray-300 dark:text-zinc-600";
  const fillClassDot =
    trendDirection === "down"
      ? "bg-green-600 dark:bg-green-400"
      : "bg-red-600 dark:bg-red-400";

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full aspect-[2/1] max-h-[160px]">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
        >
          {/* Grid lines (optional - Horizontal) */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="4 4"
          />

          {/* Y Axis Labels */}
          <text
            x={padding + 5}
            y={padding - 5}
            className="text-[10px] fill-gray-400 dark:fill-zinc-500 font-medium"
          >
            {currencySymbol}
            {Math.round(maxY).toLocaleString()}
          </text>
          <text
            x={padding + 5}
            y={chartHeight - padding - 5}
            className="text-[10px] fill-gray-400 dark:fill-zinc-500 font-medium"
          >
            {currencySymbol}0
          </text>

          {/* X Axis Labels */}
          <text
            x={padding}
            y={chartHeight - 2}
            className="text-[10px] fill-gray-400 dark:fill-zinc-500 font-medium"
            textAnchor="start"
          >
            Day 1
          </text>
          <text
            x={chartWidth - padding}
            y={chartHeight - 2}
            className="text-[10px] fill-gray-400 dark:fill-zinc-500 font-medium"
            textAnchor="end"
          >
            Day {daysInMonth}
          </text>

          {/* Last Month Line (Dashed) */}
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            d={pathLast}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
            className={strokeClassLast}
          />

          {/* Current Month Line (Solid) */}
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
            d={pathCurrent}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={strokeClassCurrent}
          />

          {/* End Dot (Current) */}
          {endPoint && (
            <motion.circle
              cx={endPoint.x}
              cy={endPoint.y}
              r="4"
              className={`${strokeClassCurrent} fill-current`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.3 }}
            />
          )}
        </svg>

        {/* Floating tooltip/label for the end point - REMOVED per user request */}
        {/*
        {endPoint && (
          <motion.div
             // ... removed ...
          >
             ...
          </motion.div>
        )}
        */}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-3 h-0.5 border-t-2 border-dashed border-gray-300 dark:border-zinc-600`}
          ></div>
          <span>Last Month</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-3 h-0.5 rounded-full ${
              trendDirection === "down" ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span>This Month</span>
        </div>
      </div>
    </div>
  );
};

export default TrajectoryChart;
