import { ReactNode, memo } from "react";
import { motion, useAnimation } from "framer-motion";
import { Trash2 } from "lucide-react";
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
  onClick?: (expense: Expense) => void;
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
    onClick,
  }: SwipeableExpenseItemProps) => {
    const controls = useAnimation();

    const handleDragEnd = (_: any, info: any) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      if (offset < -50 || velocity < -300) {
        controls.start({
          x: -80,
          transition: { type: "spring", stiffness: 350, damping: 30, mass: 1 },
        });
      } else {
        controls.start({
          x: 0,
          transition: { type: "spring", stiffness: 350, damping: 30, mass: 1 },
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
        layout="position"
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
              <Trash2 color="#ffffff" size={24} />
            </button>
          </div>
        )}

        {/* Foreground Card */}
        <motion.div
          animate={controls}
          drag={readOnly ? false : "x"}
          dragDirectionLock={true}
          dragConstraints={{ left: -100, right: 0 }}
          dragElastic={0.15}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ touchAction: "pan-y", transform: "translateZ(0)" }}
          whileTap={!readOnly ? { scale: 0.97 } : undefined}
          onClick={() => onClick && onClick(t)}
          className={`relative z-10 flex items-center justify-between p-5 
            bg-white dark:bg-[#1c1c1e] 
            border border-gray-100 dark:border-white/10 
            rounded-[2rem] shadow-sm
            ${onClick ? "cursor-pointer active:scale-95 transition-transform" : ""}
            ${cardClassName}`}
        >
          <div className="flex items-center flex-1 min-w-0">
            {/* Illuminated Icon Container */}
            <div className="shrink-0 relative group w-16 h-16 -ml-2 -mt-2 -mb-2 mr-2">
              <div className="relative w-full h-full flex items-center justify-center">
                {getCategoryIcon(
                  t.category,
                  "35px",
                  t.note || t.description,
                  t.icon,
                )}
              </div>
            </div>

            {/* Note & Date/Category */}
            <div className="flex flex-col flex-1 min-w-0 pr-4">
              <p className="font-semibold text-gray-900 dark:text-white text-[15px] truncate leading-tight">
                {t.note}
              </p>
              <div className="flex items-center text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 space-x-1 truncate">
                <span className="opacity-80">{t.category}</span>
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
