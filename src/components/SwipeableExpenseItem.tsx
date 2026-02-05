import { ReactNode, memo } from "react";
import { motion, useMotionValue, useAnimation } from "framer-motion";
import TrashOutline from "react-ionicons/lib/TrashOutline";
import { format } from "date-fns";
import { formatCurrency } from "../utils/formatUtils";
import { Expense } from "../types";
import { Timestamp } from "firebase/firestore";

interface SwipeableExpenseItemProps {
  t: Expense;
  getCategoryIcon: (
    category: string,
    size?: string,
    note?: string,
    iconName?: string,
  ) => ReactNode;
  onDelete: (id: string, amount: number, date: Date | Timestamp) => void;
  className?: string;
  cardClassName?: string;
  readOnly?: boolean;
  hideDate?: boolean;
}

const SwipeableExpenseItem = memo(
  ({
    t,
    getCategoryIcon,
    onDelete,
    className = "",
    cardClassName = "",
    readOnly = false,
    hideDate = false,
  }: SwipeableExpenseItemProps) => {
    const controls = useAnimation();
    const x = useMotionValue(0);

    const handleDragEnd = async (_: any, info: any) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      if (offset < -60 || velocity < -500) {
        await controls.start({
          x: -80,
          transition: { type: "spring", stiffness: 400, damping: 40, mass: 1 },
        });
      } else {
        await controls.start({
          x: 0,
          transition: { type: "spring", stiffness: 400, damping: 40, mass: 1 },
        });
      }
    };

    // Helper to safely get date object
    const getDate = (date: any): Date => {
      if (date instanceof Timestamp) return date.toDate();
      if (date instanceof Date) return date;
      return new Date(); // Fallback
    };

    return (
      <motion.div
        className={`relative ${className}`}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      >
        {/* Delete Background Layer (The Button) */}
        {!readOnly && (
          <div className="absolute top-1/2 -translate-y-1/2 right-4 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center z-0">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(t.id, t.amount, t.date);
              }}
              className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white"
              aria-label="Delete"
            >
              <TrashOutline color="#ffffff" height="24px" width="24px" />
            </button>
          </div>
        )}

        {/* Foreground Card */}
        <motion.div
          style={{ x }}
          animate={controls}
          drag={readOnly ? false : "x"}
          dragConstraints={{ left: -100, right: 0 }}
          dragElastic={0.5}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          whileTap={{ scale: 0.98 }}
          className={`relative z-10 flex items-center justify-between p-5 
            bg-white dark:bg-[#1c1c1e] 
            border border-gray-100 dark:border-white/10 
            rounded-[2rem] shadow-sm
            ${cardClassName}`}
        >
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Illuminated Icon Container */}
            <div className="shrink-0 relative group">
              <div
                className="absolute inset-0 bg-current opacity-20 dark:opacity-20 blur-xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-500"
                style={{ color: "var(--icon-color, currentColor)" }}
              />
              <div className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white dark:bg-white/10 border border-black/5 dark:border-white/10 shadow-sm">
                {getCategoryIcon(
                  t.category,
                  "24px",
                  t.note || t.description,
                  t.icon,
                )}
              </div>
            </div>

            {/* Note & Date/Category */}
            <div className="flex flex-col flex-1 min-w-0 pr-4">
              <p className="font-semibold text-gray-900 dark:text-white text-[15px] truncate leading-tight">
                {t.note || t.description || t.category}
              </p>
              <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 space-x-1 truncate">
                <span className="opacity-80">{t.category}</span>
                {!hideDate && t.date && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                    <span className="opacity-80">
                      {format(getDate(t.date), "MMM dd")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Amount & Time (Right Aligned) */}
          <div className="text-right shrink-0 flex flex-col justify-center">
            <span className="font-bold text-gray-900 dark:text-white block text-lg tracking-tight">
              {formatCurrency(t.amount)}
            </span>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-0.5">
              {t.date ? format(getDate(t.date), "hh:mm a") : ""}
            </span>
          </div>
        </motion.div>
      </motion.div>
    );
  },
);

export default SwipeableExpenseItem;
