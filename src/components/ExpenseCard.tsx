import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Expense } from "../types";
import { CATEGORY_COLORS, getCategoryIcon } from "../utils/uiUtils";

interface ExpenseCardProps {
  t: Expense;
  onClick: (e: Expense) => void;
  onDelete: (id: string, amount: number, date: any) => void;
  onEdit: (e: Expense) => void;
  readOnly?: boolean;
}

export const ExpenseCard = ({
  t,
  onClick,
  onDelete,
  onEdit,
  readOnly = false,
}: ExpenseCardProps) => {
  const amount = Number(t.amount).toLocaleString("en-IN");
  const time = t.date instanceof Timestamp
    ? format(t.date.toDate(), "hh:mm a")
    : format(new Date(t.date), "hh:mm a");

  const accentColor = CATEGORY_COLORS[t.category as keyof typeof CATEGORY_COLORS] || "#A0A0A0";
  const [showActions, setShowActions] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const timerRef = useRef<any>(null);

  const startPress = () => {
    if (readOnly || showActions || showConfirm) return;
    timerRef.current = setTimeout(() => {
      setShowActions(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600); // Slightly faster long press
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClick = () => {
    if (showActions || showConfirm) {
      setShowActions(false);
      setShowConfirm(false);
      return;
    }
    onClick(t);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirm(true);
    setShowActions(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(t.id, Number(t.amount), t.date);
    setShowConfirm(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(t);
    setShowActions(false);
  };

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
        className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-[20px] px-4 py-3 flex items-center gap-4 text-left w-full min-h-[68px] relative overflow-hidden group border-none transition-colors hover:bg-white/60 dark:hover:bg-white/[0.04]"
      >
        <div
          className="relative z-10 w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 bg-white/60 dark:bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          style={{ color: accentColor }}
        >
          <div className="opacity-80">
            {getCategoryIcon(t.category, "20px")}
          </div>
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          {(() => {
            const rawNote = String(t.note || t.category || "");
            const [main, ...rest] = rawNote.split("-");
            const subNote = rest.join("-").trim();

            return (
              <>
                <div className="text-[18px] font-semibold text-zinc-900 dark:text-white leading-tight truncate">
                  {main.trim()}
                </div>
                <div className="mt-1 flex items-center gap-1.5 min-w-0 text-[12px] font-medium text-zinc-400 dark:text-[#A0A0A0] opacity-70">
                  <span className="truncate">{t.category}</span>
                  {subNote && (
                    <>
                      <div className="w-0.5 h-0.5 rounded-full bg-zinc-300 dark:bg-white/20 shrink-0" />
                      <span className="normal-case tracking-normal font-medium text-zinc-400 dark:text-white/45 truncate">
                        {subNote}
                      </span>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        <div className="relative z-10 flex flex-col items-end justify-center shrink-0 max-w-[42%]">
          <span className={`font-bold text-zinc-900 dark:text-white tracking-tighter whitespace-nowrap ${amount.length >= 8 ? 'text-[16px]' : 'text-[19px]'
            }`}>
            ₹{amount}
          </span>
          <span className="mt-1 text-[10px] text-zinc-400/60 dark:text-[#A0A0A0]/40 font-medium whitespace-nowrap">{time}</span>
        </div>
      </motion.button>

      {/* Actions Overlay */}
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
              onClick={() => setShowActions(false)}
              className="absolute top-2 right-2 p-1 text-zinc-400 dark:text-white/40 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Overlay */}
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
                onClick={() => setShowConfirm(false)}
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
};
