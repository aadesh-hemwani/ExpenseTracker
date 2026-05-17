import React, { memo, useMemo } from "react";
import { getCategoryIcon, CATEGORIES } from "../utils/uiUtils";
import { createPortal } from "react-dom";
import { formatCurrency } from "../utils/formatUtils";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Expense } from "../types";
import { Timestamp } from "firebase/firestore";
import { LiquidClose } from "./ui/LiquidClose";

interface ExpenseListModalProps {
  title: string;
  onClose: () => void;
  expenses?: Expense[];
}

const ExpenseListModal = memo(({
  title,
  onClose,
  expenses = [],
}: ExpenseListModalProps) => {
  const total = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);

  const getDate = (date: any): Date => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === "string") return new Date(date);
    return new Date();
  };

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-end md:items-center justify-center pointer-events-none" style={{ height: "100lvh" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gray-900/30 dark:bg-white/10 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 bg-white dark:bg-black w-[95%] max-w-md rounded-[20px] p-6 shadow-2xl border border-gray-200/50 dark:border-white/10 max-h-[70vh] flex flex-col mb-3 md:mb-0 pointer-events-auto"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {CATEGORIES.includes(title) && (
                <span className="p-2">
                  {getCategoryIcon(title, "30px")}
                </span>
              )}
              {title}
            </h3>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Total:{" "}
              <span className="text-gray-900 dark:text-white font-bold">
                {formatCurrency(total)}
              </span>
            </p>
          </div>
          <LiquidClose onClick={onClose} />
        </div>

        <div className="overflow-y-auto pr-2 pb-6 min-h-[200px] no-scrollbar">
          {expenses.length > 0 ? (
            <div className="flex flex-col">
              {expenses.map((expense, index) => (
                <div
                  key={expense.id}
                  className={`flex justify-between items-center py-4 ${index !== expenses.length - 1
                    ? "border-b border-gray-100 dark:border-white/5"
                    : ""
                    }`}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-900 dark:text-white font-medium text-[15px]">
                      {expense.note || "Unknown Expense"}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {format(getDate(expense.date), "MMM dd")}
                    </span>
                  </div>
                  <span className="text-gray-900 dark:text-white font-bold">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-300 font-medium">No expenses found.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
});

ExpenseListModal.displayName = "ExpenseListModal";

export default ExpenseListModal;