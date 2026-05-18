import React, { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Expense } from "../types";
import { CATEGORY_COLORS, getCategoryIcon, getEventBorder } from "../utils/uiUtils";

interface ExpenseCardProps {
  expense: Expense;
  onClick: (e: Expense) => void;
  onDelete: (id: string, amount: number, date: Timestamp | Date) => void;
  onEdit: (e: Expense) => void;
  readOnly?: boolean;
}

export const ExpenseCard = React.memo(({
  expense,
  onClick,
  onDelete,
  onEdit,
  readOnly = false,
}: ExpenseCardProps) => {
  const [showActions, setShowActions] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const amount = useMemo(() =>
    Number(expense.amount).toLocaleString("en-IN"),
    [expense.amount]
  );

  const time = useMemo(() => {
    const date = expense.date instanceof Timestamp ? expense.date.toDate() : new Date(expense.date);
    return format(date, "hh:mm a");
  }, [expense.date]);

  const accentColor = useMemo(() =>
    CATEGORY_COLORS[expense.category as keyof typeof CATEGORY_COLORS] || "#A0A0A0",
    [expense.category]
  );

  const noteDetails = useMemo(() => {
    const rawNote = String(expense.note || expense.category || "");
    const [main, ...rest] = rawNote.split("-");
    return {
      main: main.trim(),
      subNote: rest.join("-").trim()
    };
  }, [expense.note, expense.category]);

  const borderClass = useMemo(() => {
    if (expense.context === "event" && expense.contextId) {
      return `border ${getEventBorder(expense.contextId)}`;
    }
    return "border-none";
  }, [expense.context, expense.contextId]);

  const startPress = useCallback(() => {
    if (readOnly || showActions || showConfirm) return;
    timerRef.current = setTimeout(() => {
      setShowActions(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600);
  }, [readOnly, showActions, showConfirm]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (showActions || showConfirm) {
      setShowActions(false);
      setShowConfirm(false);
      return;
    }
    onClick(expense);
  }, [showActions, showConfirm, onClick, expense]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
    setShowActions(false);
  }, []);

  const handleConfirmDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(expense.id, Number(expense.amount), expense.date);
    setShowConfirm(false);
  }, [onDelete, expense]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(expense);
    setShowActions(false);
  }, [onEdit, expense]);

  const closeActions = useCallback(() => setShowActions(false), []);
  const closeConfirm = useCallback(() => setShowConfirm(false), []);

  return (
    <motion.div
      className="relative w-full select-none"
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      layout
    >
      <motion.button
        whileTap={{ scale: 0.98 }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onClick={handleClick}
        className={`bg-white/60 dark:bg-white/[0.06] backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[20px] px-4 py-2 flex items-center gap-4 text-left w-full min-h-[60px] relative overflow-hidden group transition-colors hover:bg-white/70 dark:hover:bg-white/[0.1] ${borderClass}`}
      >
        <div
          className="relative z-10 w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          style={{ color: accentColor }}
        >
          <div className="opacity-80">
            {getCategoryIcon(expense.category, "20px")}
          </div>
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-zinc-900 dark:text-white leading-tight truncate">
            {noteDetails.main}
          </div>
          {noteDetails.subNote && (
            <div className="mt-0.5 flex items-center gap-1.5 min-w-0 text-[11px] font-medium text-zinc-400 dark:text-[#A0A0A0] opacity-70">
              <span className="normal-case tracking-normal font-medium truncate">
                {noteDetails.subNote}
              </span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-col items-end justify-center shrink-0 max-w-[42%]">
          <span className={`font-bold text-zinc-900 dark:text-white tracking-tighter whitespace-nowrap ${amount.length >= 8 ? 'text-[14px]' : 'text-[17px]'
            }`}>
            ₹{amount}
          </span>
          <span className="mt-0.5 text-[9px] text-zinc-400/60 dark:text-[#A0A0A0]/40 font-medium whitespace-nowrap">{time}</span>
        </div>
      </motion.button>

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-30 bg-white/95 dark:bg-[#121316]/95 rounded-2xl flex items-center justify-center gap-4 backdrop-blur-sm"
          >
            <button
              onClick={handleEdit}
              className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-white/10 flex items-center justify-center text-zinc-900 dark:text-white active:scale-90 transition-transform shadow-sm cursor-pointer"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={handleDeleteClick}
              className="w-10 h-10 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-500 active:scale-90 transition-transform cursor-pointer"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={closeActions}
              className="absolute top-2 right-2 p-1 text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-40 bg-red-500 rounded-2xl flex flex-col items-center justify-center p-2 text-white"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider mb-2">Are you sure?</span>
            <div className="flex flex-row gap-2 w-full px-1">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-1.5 bg-white text-red-500 rounded-full text-[10px] font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={closeConfirm}
                className="flex-1 py-1.5 bg-black/20 text-white rounded-full text-[10px] font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

ExpenseCard.displayName = "ExpenseCard";

