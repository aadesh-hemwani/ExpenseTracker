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
      className="relative w-full select-none mb-3"
      onContextMenu={(e: React.MouseEvent) => e.preventDefault()}
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
    >
      <motion.button
        whileTap={{ scale: 0.96 }}
        onPointerDown={startPress}
        onPointerUp={endPress}
        onPointerLeave={endPress}
        onClick={handleClick}
        className={`w-full glass-card hover:shadow-xl transition-all duration-300 flex items-center p-4 gap-4 text-left group ${borderClass}`}
      >
        <div
          className="relative z-10 w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          {getCategoryIcon(expense.category, "24px")}
        </div>

        <div className="relative z-10 min-w-0 flex-1 flex flex-col justify-center">
          <div className="text-[17px] font-semibold text-primary leading-snug truncate">
            {noteDetails.main}
          </div>
          {noteDetails.subNote && (
            <div className="mt-0.5 text-[13px] text-secondary truncate">
              {noteDetails.subNote}
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-col items-end justify-center shrink-0">
          <span className="font-semibold text-[17px] text-primary tracking-tight">
            ₹{amount}
          </span>
          <span className="mt-0.5 text-[13px] text-tertiary font-medium">
            {time}
          </span>
        </div>
      </motion.button>

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 z-30 bg-body/80 backdrop-blur-md rounded-[24px] flex items-center justify-center gap-6"
          >
            <button
              onClick={handleEdit}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-secondary text-primary flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-body transition-colors">
                <Edit2 size={20} />
              </div>
              <span className="text-[11px] font-semibold text-primary">Edit</span>
            </button>
            <button
              onClick={handleDeleteClick}
              className="flex flex-col items-center gap-1 active:scale-90 transition-transform cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shadow-sm group-hover:bg-red-500 group-hover:text-white transition-colors">
                <Trash2 size={20} />
              </div>
              <span className="text-[11px] font-semibold text-red-500">Delete</span>
            </button>
            <button
              onClick={closeActions}
              className="absolute top-3 right-3 p-2 text-tertiary hover:text-primary cursor-pointer active:scale-90 transition-transform"
            >
              <X size={20} />
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
            className="absolute inset-0 z-40 bg-red-500 rounded-[24px] flex flex-col items-center justify-center p-4 text-white shadow-lg"
          >
            <span className="text-[13px] font-semibold mb-3">Delete this expense?</span>
            <div className="flex flex-row gap-3 w-full max-w-[200px]">
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 bg-white text-red-500 rounded-full text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
              >
                Delete
              </button>
              <button
                onClick={closeConfirm}
                className="flex-1 py-2 bg-black/20 text-white rounded-full text-[13px] font-bold active:scale-95 transition-transform cursor-pointer"
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

