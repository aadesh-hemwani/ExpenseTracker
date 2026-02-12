import { motion } from "framer-motion";
import { format } from "date-fns";
import { createPortal } from "react-dom";
import { Timestamp } from "firebase/firestore";
import { Expense } from "../types";
import { getCategoryIcon, CATEGORY_COLORS } from "../utils/uiUtils";
import { formatCurrency } from "../utils/formatUtils";
import { LiquidClose } from "./ui/LiquidClose";
import { Trash2 } from "lucide-react";
import QRCode from "react-qr-code";

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onDelete?: (id: string, amount: number, date: Date | Timestamp) => void;
}

const ExpenseDetailsModal = ({
  isOpen,
  onClose,
  expense,
  onDelete,
}: ExpenseDetailsModalProps) => {
  if (!isOpen || !expense) return null;

  const getDate = (date: any): Date => {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === "string") return new Date(date);
    return new Date();
  };

  const dateObj = getDate(expense.date);
  const color = CATEGORY_COLORS[expense.category] || "#6b7280";

  const handleDelete = () => {
    if (onDelete && expense) {
      onDelete(expense.id, expense.amount, expense.date);
      onClose();
    }
  };

  // Helper for receipt visual
  const ReceiptRow = ({
    label,
    value,
    isMono = false,
  }: {
    label: string;
    value: React.ReactNode;
    isMono?: boolean;
  }) => (
    <div className="flex justify-between items-baseline py-3 border-b border-dashed border-gray-300 dark:border-white/10 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 px-2 rounded-lg transition-colors">
      <span className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
        {label}
      </span>
      <span
        className={`text-gray-900 dark:text-white font-semibold text-right ${isMono ? "font-mono tracking-tight" : ""}`}
      >
        {value}
      </span>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Receipt Card */}
      <motion.div
        initial={{ y: 50, opacity: 0, scale: 0.95, rotateX: 10 }}
        animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
        exit={{ y: 50, opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="relative z-10 w-full max-w-sm pointer-events-auto perspective-1000"
      >
        {/* Paper visual container */}
        <div
          className="relative bg-[#fbfbfb] dark:bg-[#1a1a1a] shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100"
          style={{
            // Scalloped bottom edge
            maskImage:
              "radial-gradient(circle at 10px bottom, transparent 8px, black 8.5px)",
            maskSize: "20px 100%",
            maskPosition: "bottom",
            maskRepeat: "repeat-x",
            paddingBottom: "20px", // Space for the scallops
            borderRadius: "16px 16px 0 0", // Round top only
          }}
        >
          {/* subtle paper texture */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-multiply dark:mix-blend-overlay"></div>

          {/* Header Action */}
          <div className="absolute top-4 right-4 z-20 scale-75 origin-top-right">
            <LiquidClose onClick={onClose} />
          </div>

          <div className="p-6 pt-10 flex flex-col items-center relative">
            {/* Shop/Category Icon */}
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group"
              style={{
                background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                boxShadow: `0 20px 40px -10px ${color}30`,
                border: `1px solid ${color}30`,
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: `radial-gradient(circle at center, ${color}, transparent 70%)`,
                }}
              />
              <div className="relative z-10 text-gray-900 dark:text-white drop-shadow-sm scale-110 transition-transform duration-500 group-hover:scale-125">
                {getCategoryIcon(
                  expense.category,
                  "48px",
                  expense.note,
                  expense.icon,
                )}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold tracking-tight mb-1 text-center">
              {expense.category}
            </h3>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-mono mb-6">
              REC-{expense.id.slice(0, 8).toUpperCase()}
            </p>

            {/* Main Amount */}
            <div className="w-full py-6 border-y-2 border-dashed border-gray-200 dark:border-white/10 mb-6 text-center bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg">
              <span className="text-5xl font-black tracking-tighter block">
                {formatCurrency(expense.amount)}
              </span>
            </div>

            {/* Details List */}
            <div className="w-full space-y-1 mb-6">
              <ReceiptRow
                label="Date"
                value={format(dateObj, "MMM dd, yyyy")}
                isMono
              />
              <ReceiptRow
                label="Time"
                value={format(dateObj, "hh:mm a")}
                isMono
              />
              {(expense.note || expense.description) && (
                <ReceiptRow
                  label="Note"
                  value={expense.note || expense.description}
                />
              )}
            </div>

            {/* Barcode / Footer */}
            <div className="w-full flex flex-col items-center gap-2 mt-4 overflow-hidden rounded-lg">
              <div className="p-2 bg-white rounded-lg">
                <QRCode
                  value={`${format(dateObj, "MMM dd, yyyy • hh:mm a")} | ${expense.category} | ${formatCurrency(expense.amount)} | ${expense.note || expense.description || "No Note"}`}
                  size={100}
                  level="M"
                  fgColor="#000000"
                  bgColor="#ffffff"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delete Button (Hanging below the receipt like a detached coupon or separate action) */}
        {onDelete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 flex justify-center"
          >
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors shadow-lg active:scale-95"
            >
              <Trash2 size={18} className="text-current" />
              <span className="text-sm font-bold">Delete Receipt</span>
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
};

export default ExpenseDetailsModal;
