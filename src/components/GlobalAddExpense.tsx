import React, { useState, memo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import RefreshCircleOutline from "react-ionicons/lib/RefreshCircleOutline";
import CalendarOutline from "react-ionicons/lib/CalendarOutline";
import BackspaceOutline from "react-ionicons/lib/BackspaceOutline";
import CheckmarkOutline from "react-ionicons/lib/CheckmarkOutline";
import { useExpenses } from "../hooks/useExpenses";
import { CATEGORIES, getCategoryIcon } from "../utils/uiUtils";
import { LiquidFAB } from "./ui/LiquidFAB";
import { LiquidClose } from "./ui/LiquidClose";
import { format } from "date-fns";

const GlobalAddExpense = memo(() => {
  const { addExpense } = useExpenses();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Inputs
  const [amountStr, setAmountStr] = useState("0");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Check for deep link to open modal
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setIsAddModalOpen(true);
    }
  }, [searchParams]);

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false);
    if (searchParams.get("action") === "add") {
      setSearchParams((params) => {
        params.delete("action");
        return params;
      });
    }
  }, [searchParams, setSearchParams]);

  // Reset form when opening
  useEffect(() => {
    if (isAddModalOpen) {
      setAmountStr("0");
      setCategory("Food");
      setNote("");
      setDate(new Date());
      setIsSubmitting(false);
    }
  }, [isAddModalOpen]);

  const handleNumpadPress = useCallback(
    (val: string) => {
      if (val === "BACKSPACE") {
        setAmountStr((prev) => {
          if (prev.length === 1) return "0";
          return prev.slice(0, -1);
        });
      } else if (val === ".") {
        if (!amountStr.includes(".")) {
          setAmountStr((prev) => prev + ".");
        }
      } else {
        setAmountStr((prev) => {
          if (prev === "0") return val;
          // Limit total length to prevent overflows
          if (prev.length > 8) return prev;
          // Limit decimals to 2
          if (prev.includes(".") && prev.split(".")[1].length >= 2) return prev;
          return prev + val;
        });
      }
    },
    [amountStr]
  );

  const handleSave = useCallback(async () => {
    const amountVal = parseFloat(amountStr);
    if (amountVal <= 0) return;

    setIsSubmitting(true);
    try {
      await addExpense(amountVal.toString(), category, note, date);
      handleCloseModal();
    } catch (error) {
      console.error("Failed to add expense", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [amountStr, category, note, date, addExpense, handleCloseModal]);

  // Numpad Button Component
  const NumKey = ({
    val,
    label,
    primary = false,
  }: {
    val: string;
    label?: React.ReactNode;
    primary?: boolean;
  }) => (
    <motion.button
      whileTap={{ scale: 0.92 }}
      transition={{ duration: 0.05 }} // Instant response
      onClick={() => {
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);
        val === "DONE" ? handleSave() : handleNumpadPress(val);
      }}
      className={`
        relative h-16 rounded-2xl flex items-center justify-center text-2xl font-bold select-none touch-manipulation transition-all duration-200
        ${
          primary
            ? "bg-primary text-white shadow-lg shadow-primary/30 active:scale-95 active:shadow-none"
            : "bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 text-gray-900 dark:text-white shadow-sm hover:bg-white/60 dark:hover:bg-white/10 active:scale-95 active:bg-white/80 dark:active:bg-white/20"
        }
      `}
    >
      {label || val}
    </motion.button>
  );

  return (
    <>
      <LiquidFAB onClick={() => setIsAddModalOpen(true)} />

      {createPortal(
        <AnimatePresence>
          {isAddModalOpen && (
            <div
              className={`fixed inset-0 z-[9999] flex justify-center pointer-events-none transition-all duration-300 ${
                isInputFocused ? "items-start pt-20" : "items-end"
              }`}
            >
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-gray-900/60 dark:bg-black/40 backdrop-blur-[8px] pointer-events-auto"
                onClick={handleCloseModal}
              />

              {/* Modal Content - Bottom Sheet style */}
              <motion.div
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                exit={{ y: "110%" }}
                transition={{
                  type: "spring",
                  damping: 25,
                  stiffness: 300,
                  mass: 0.8,
                }}
                className="relative z-10 w-full max-w-md bg-white dark:bg-[#121212] rounded-t-[40px] shadow-2xl overflow-hidden pb-safe pointer-events-auto border-t border-white/10"
              >
                {/* Drag Handle */}
                <div className="w-full h-6 flex items-center justify-center pt-2">
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full" />
                </div>

                <div className="px-6 pb-6 pt-2 flex flex-col h-full space-y-6">
                  {/* Top Bar: Date & Close */}
                  <div className="flex justify-between items-center">
                    <div className="relative">
                      <button className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 pointer-events-none">
                        <CalendarOutline
                          height="16px"
                          width="16px"
                          color="currentColor"
                        />
                        <span>{format(date, "MMM dd, yyyy")}</span>
                      </button>
                      <input
                        type="date"
                        value={format(date, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const [y, m, d] = val.split("-").map(Number);
                          setDate(new Date(y, m - 1, d));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </div>
                    <LiquidClose onClick={handleCloseModal} />
                  </div>

                  {/* Main Amount Display */}
                  <div className="flex flex-col items-center justify-center py-4">
                    <span className="text-gray-400 dark:text-gray-500 text-sm font-medium tracking-widest uppercase mb-1">
                      {category}
                    </span>
                    <div className="text-6xl font-bold text-gray-900 dark:text-white tracking-tight flex items-baseline">
                      <span className="text-3xl font-medium text-gray-400 dark:text-gray-600 mr-2">
                        ₹
                      </span>
                      {/* Custom formatting for the input string */}
                      {amountStr}
                    </div>
                  </div>

                  {/* Categories Horizontal Scroll */}
                  <div className="w-full overflow-x-auto no-scrollbar py-2 pl-4">
                    <div className="flex space-x-4 pr-4">
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat;
                        return (
                          <motion.button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            whileTap={{ scale: 0.95 }}
                            animate={{
                              scale: isSelected ? 1.05 : 1,
                              opacity: isSelected ? 1 : 0.7,
                            }}
                            className={`
                              flex flex-col items-center justify-center space-y-2 min-w-[72px]
                              transition-colors duration-200
                            `}
                          >
                            <div
                              className={`
                                w-14 h-14 rounded-2xl flex items-center justify-center
                                shadow-sm transition-all duration-300
                                ${
                                  isSelected
                                    ? "bg-gradient-to-br from-gray-800 to-black dark:from-white dark:to-gray-200 text-white dark:text-black shadow-lg shadow-gray-200 dark:shadow-none ring-2 ring-offset-2 ring-gray-900 dark:ring-white ring-offset-white dark:ring-offset-black"
                                    : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/5"
                                }
                              `}
                            >
                              {getCategoryIcon(cat, "24px")}
                            </div>
                            <span
                              className={`text-xs font-semibold ${
                                isSelected
                                  ? "text-gray-900 dark:text-white"
                                  : "text-gray-400 dark:text-gray-600"
                              }`}
                            >
                              {cat}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Note Input (Optional) */}
                  <div className="relative px-2">
                    <input
                      type="text"
                      value={note}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add note..."
                      className="w-full bg-gray-50 dark:bg-white/5 rounded-2xl py-3 px-4 text-center text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                  </div>

                  {/* Numpad Grid - Hidden when typing note */}
                  {!isInputFocused && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-4 gap-3 mt-auto"
                    >
                      <NumKey val="1" />
                      <NumKey val="2" />
                      <NumKey val="3" />
                      <NumKey
                        val="BACKSPACE"
                        label={
                          <BackspaceOutline
                            height="24px"
                            width="24px"
                            color="currentColor"
                          />
                        }
                      />

                      <NumKey val="4" />
                      <NumKey val="5" />
                      <NumKey val="6" />
                      {/* Submit Button spanning 2 rows vertically */}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSave}
                        className="row-span-3 bg-accent rounded-3xl flex items-center justify-center text-white shadow-xl shadow-accent/25 active:brightness-110"
                        disabled={isSubmitting || amountStr === "0"}
                      >
                        {isSubmitting ? (
                          <RefreshCircleOutline
                            height="32px"
                            width="32px"
                            color="#fff"
                            cssClasses="animate-spin"
                          />
                        ) : (
                          <CheckmarkOutline
                            height="32px"
                            width="32px"
                            color="#fff"
                          />
                        )}
                      </motion.button>

                      <NumKey val="7" />
                      <NumKey val="8" />
                      <NumKey val="9" />

                      <div className="col-span-1" />
                      {/* Empty spacer or custom key */}

                      <NumKey val="0" />
                      <NumKey val="." />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
});

export default GlobalAddExpense;
