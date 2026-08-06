import { memo, useMemo } from "react";
import { getCategoryIcon, CATEGORIES } from "../utils/uiUtils";
import { createPortal } from "react-dom";
import { formatCurrency } from "../utils/formatUtils";
import { motion, AnimatePresence } from "framer-motion";
import { Expense } from "../types";
import { LiquidClose } from "./ui/LiquidClose";
import { ExpenseCard } from "./ExpenseCard";

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

  return createPortal(
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-end md:items-center justify-center pointer-events-none" style={{ height: "100lvh" }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/20 dark:bg-black/30 backdrop-blur-[4px] pointer-events-auto"
        onClick={onClose}
      />

      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 320 }}
        className="relative z-10 bg-white/40 dark:bg-white/[0.03] backdrop-blur-[60px] w-full md:w-[95%] max-w-md rounded-t-[32px] md:rounded-[32px] p-5 pt-8 pb-10 md:pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_-10px_40px_rgba(0,0,0,0.6)] border border-white/60 dark:border-white/10 max-h-[85vh] flex flex-col pointer-events-auto"
      >
        <div className="flex justify-between items-start mb-6 shrink-0 px-2">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
              {CATEGORIES.includes(title) && (
                <span className="flex items-center justify-center shrink-0">
                  {getCategoryIcon(title, "28px")}
                </span>
              )}
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
              {expenses.length} transaction{expenses.length !== 1 ? 's' : ''} •{" "}
              <span className="text-gray-900 dark:text-white font-bold tracking-tight">
                {formatCurrency(total)}
              </span>
            </p>
          </div>
          <LiquidClose onClick={onClose} />
        </div>

        <div className="overflow-y-auto px-1 pb-4 min-h-[200px] no-scrollbar">
          {expenses.length > 0 ? (
            <div className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {expenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    readOnly={true}
                    onClick={() => { }}
                    onEdit={() => { }}
                    onDelete={() => { }}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-12 flex flex-col items-center justify-center opacity-60">
              <p className="text-gray-500 dark:text-gray-400 font-medium">No expenses found.</p>
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