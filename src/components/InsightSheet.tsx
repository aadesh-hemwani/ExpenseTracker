import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import TrajectoryChart from "./TrajectoryChart";

interface InsightSheetProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    currentMonthTotal: number;
    lastMonthPartialSum: number;
    diff: number;
    trendDirection: "up" | "down";
    percentageChange: string;
    thisMonthGraphData: number[];
    lastMonthGraphData: number[];
  };
  lastMonthDate: Date;
}

const InsightSheet: React.FC<InsightSheetProps> = ({
  isOpen,
  onClose,
  data,
  lastMonthDate,
}) => {
  // const maxVal = Math.max(data.currentMonthTotal, data.lastMonthPartialSum);
  // const scale = maxVal > 0 ? 100 / maxVal : 0;

  // const currentHeight = Math.min(data.currentMonthTotal * scale, 100);
  // const lastHeight = Math.min(data.lastMonthPartialSum * scale, 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[5px] pointer-events-auto"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.8,
            }}
            className="relative z-10 bg-white dark:bg-black w-[95%] md:w-[32rem] max-w-full rounded-[50px] md:rounded-3xl px-6 py-6 md:p-8 shadow-2xl max-h-[90vh] flex flex-col mx-auto mb-3 md:mb-0 border border-gray-200 dark:border-white/10 pointer-events-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold dark:text-white">
                Spending Insight
              </h3>
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-8 pb-6">
              {/* Text Insight */}
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
                  By this time last month ({format(lastMonthDate, "MMMM do")}),
                  you had spent{" "}
                  <span className="font-bold text-gray-900 dark:text-white">
                    ₹{data.lastMonthPartialSum.toLocaleString()}
                  </span>
                  .
                </p>

                <div
                  className={`p-4 rounded-2xl ${
                    data.trendDirection === "down"
                      ? "bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3 rounded-full shrink-0 ${
                        data.trendDirection === "down"
                          ? "bg-green-100 dark:bg-green-500/20"
                          : "bg-red-100 dark:bg-red-500/20"
                      }`}
                    >
                      {data.trendDirection === "down" ? (
                        <TrendingDown className="w-6 h-6" />
                      ) : (
                        <TrendingUp className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold opacity-80">
                        Current Status
                      </p>
                      <p className="text-lg font-bold">
                        ₹{data.diff.toLocaleString()}{" "}
                        {data.trendDirection === "down" ? "lower" : "higher"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visual Chart */}
              <div className="pt-2">
                <TrajectoryChart
                  currentMonthData={data.thisMonthGraphData || []}
                  lastMonthData={data.lastMonthGraphData || []}
                  trendDirection={data.trendDirection}
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InsightSheet;
