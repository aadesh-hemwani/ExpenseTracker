import React, { useState, memo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import CalendarOutline from "react-ionicons/lib/CalendarOutline";
import TimeOutline from "react-ionicons/lib/TimeOutline";
import BackspaceOutline from "react-ionicons/lib/BackspaceOutline";

import ColorWandOutline from "react-ionicons/lib/ColorWandOutline";
import { useExpenses } from "../hooks/useExpenses";
import { CATEGORIES, getCategoryIcon } from "../utils/uiUtils";
import { parseTransactionText } from "../utils/smsParser";
import { LiquidFAB } from "./ui/LiquidFAB";
import { LiquidClose } from "./ui/LiquidClose";
import { format } from "date-fns";
import IOSSpinner from "./ui/IOSSpinner";
import confetti from "canvas-confetti";
import { findLucideIcon } from "../utils/uiUtils";
import { suggestIcon } from "../services/gemini";

const GlobalAddExpense = memo(() => {
  const { addExpense, updateExpense } = useExpenses();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Inputs
  const [amountStr, setAmountStr] = useState("0");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(false);
  const controls = useAnimation();

  // Check clipboard permission/content when modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      // Small delay to allow focus transition
      const checkClipboard = async () => {
        try {
          // We only check if we CAN read, or just try reading if permission is granted.
          // Note: Browser might block this without user gesture.
          // We use a try-catch to allow silent failure.
          const permission = await navigator.permissions.query({
            name: "clipboard-read" as PermissionName,
          });
          if (permission.state === "granted" || permission.state === "prompt") {
            const text = await navigator.clipboard.readText();
            if (parseTransactionText(text)) {
              setHasClipboard(true);
            } else {
              setHasClipboard(false);
            }
          }
        } catch (err) {
          // Clipboard access denied or not supported
          setHasClipboard(false);
        }
      };
      checkClipboard();
    }
  }, [isAddModalOpen]);

  // Check for deep link to open modal
  useEffect(() => {
    const action = searchParams.get("action");
    const text = searchParams.get("text");

    if (action === "add") {
      setIsAddModalOpen(true);

      // Handle shared text (from SMS/Share Target)
      if (text) {
        const parsed = parseTransactionText(text);
        if (parsed) {
          setAmountStr(parsed.amount);
          if (parsed.note) setNote(parsed.note);
          if (parsed.category) setCategory(parsed.category);
        }
      }
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

  const handleSmartPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseTransactionText(text);
      if (parsed) {
        setAmountStr(parsed.amount);
        if (parsed.note) setNote(parsed.note);
        if (parsed.category) setCategory(parsed.category);
        // Haptic feedback for success
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      } else {
        // Haptic feedback for failure
        if (navigator.vibrate) navigator.vibrate(50);
      }
    } catch (err) {
      console.error("Failed to read clipboard", err);
    }
  }, []);

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
    [amountStr],
  );

  const handleSave = useCallback(async () => {
    const amountVal = parseFloat(amountStr);
    if (amountVal <= 0) {
      if (navigator.vibrate) navigator.vibrate(200);
      controls.start({
        x: [0, -10, 10, -10, 10, 0],
        transition: { duration: 0.4 },
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Hybrid: Try Local Cache First
      const localIcon = findLucideIcon(note);

      // 2. Save Immediately (Optimistic)
      // If local icon found, save it. If not, save undefined & fetch later.
      const newId = await addExpense(
        amountVal.toString(),
        category,
        note,
        date,
        localIcon,
        localIcon ? "lucide" : undefined,
      );

      // 🎉 Fire Confetti!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 10001,
      });

      // 3. Background: AI Fallback (If no local icon found)
      // Only runs if note exists AND local search failed
      if (newId && !localIcon && note.trim().length > 2) {
        // Fire and forget
        suggestIcon(note).then((aiIcon) => {
          if (aiIcon) {
            updateExpense(newId, { icon: aiIcon, iconType: "lucide" });
          }
        });
      }

      // Small delay to let user see success state before closing
      // This also gives Firestore a moment to sync local cache if needed
      setTimeout(() => {
        handleCloseModal();
      }, 500);
    } catch (error) {
      console.error("Failed to add expense", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amountStr,
    category,
    note,
    date,
    addExpense,
    updateExpense, // Deduped destructuring
    handleCloseModal,
  ]);

  // Numpad Button Component
  const NumKey = ({
    val,
    label,
    transparent = false,
  }: {
    val: string;
    label?: React.ReactNode;
    transparent?: boolean;
  }) => (
    <motion.button
      whileTap={{
        scale: 0.95,
        backgroundColor: transparent ? "transparent" : "rgba(255,255,255,0.15)",
      }}
      transition={{ duration: 0.05 }}
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(10);
        val === "DONE" ? handleSave() : handleNumpadPress(val);
      }}
      className={`
        relative h-16 rounded-[1rem] flex items-center justify-center text-3xl font-normal select-none touch-manipulation transition-colors duration-200
        ${transparent ? "bg-transparent text-gray-900 dark:text-white" : "bg-gray-100 dark:bg-[#1c1c1e] text-gray-900 dark:text-white"}
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
              className={`fixed inset-0 z-[9999] flex justify-center pointer-events-none transition-all duration-300 items-end`}
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

                <div className="px-6 pb-4 pt-2 flex flex-col h-full space-y-4">
                  {/* Top Bar: Date & Close */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {/* Date Picker */}
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
                            setDate((prev) => {
                              const newDate = new Date(y, m - 1, d);
                              newDate.setHours(prev.getHours());
                              newDate.setMinutes(prev.getMinutes());
                              return newDate;
                            });
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                      </div>

                      {/* Time Picker */}
                      <div className="relative">
                        <button className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 pointer-events-none">
                          <TimeOutline
                            height="16px"
                            width="16px"
                            color="currentColor"
                          />
                          <span>{format(date, "hh:mm a")}</span>
                        </button>
                        <input
                          type="time"
                          value={format(date, "HH:mm")}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const [hours, minutes] = val.split(":").map(Number);
                            setDate((prev) => {
                              const newDate = new Date(prev);
                              newDate.setHours(hours);
                              newDate.setMinutes(minutes);
                              return newDate;
                            });
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                      </div>
                    </div>
                    <LiquidClose onClick={handleCloseModal} />
                  </div>

                  {/* Main Amount Display */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <span className="text-gray-400 dark:text-gray-500 text-sm font-medium tracking-widest uppercase mb-1">
                      {category}
                    </span>
                    <motion.div
                      animate={controls}
                      className="text-6xl font-bold text-gray-900 dark:text-white tracking-tight flex items-baseline"
                    >
                      <span className="text-3xl font-medium text-gray-400 dark:text-gray-600 mr-2">
                        ₹
                      </span>
                      {/* Custom formatting for the input string */}
                      {amountStr}
                      <span className="text-3xl font-medium opacity-0 ml-2">
                        ₹
                      </span>
                    </motion.div>
                  </div>

                  {/* Categories Horizontal Scroll */}
                  <div className="w-full overflow-x-auto no-scrollbar py-3 pl-4">
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
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add note..."
                      className="w-full bg-gray-50 dark:bg-white/5 rounded-2xl py-3 px-4 text-center text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    />
                  </div>

                  {/* Numpad & Actions Container */}
                  <div className="mt-auto pb-6 w-full flex flex-col gap-4">
                    {/* Grid */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="grid grid-cols-3 gap-3"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <NumKey key={num} val={num.toString()} />
                      ))}
                      <NumKey
                        val="."
                        transparent
                        label={
                          <span className="text-2xl font-bold pb-2">.</span>
                        }
                      />
                      <NumKey val="0" />
                      <NumKey
                        val="BACKSPACE"
                        transparent
                        label={
                          <BackspaceOutline
                            height="28px"
                            width="28px"
                            color="currentColor"
                          />
                        }
                      />
                    </motion.div>

                    {/* Action Button */}
                    <div className="mt-2">
                      {hasClipboard ? (
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            if (navigator.vibrate) navigator.vibrate(10);
                            handleSmartPaste();
                          }}
                          className="w-full py-4 rounded-[1.2rem] bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 flex items-center justify-center text-white shadow-lg text-lg font-bold gap-2 transition-all"
                        >
                          <ColorWandOutline
                            color="#fff"
                            height="24px"
                            width="24px"
                          />
                          <span>Auto-Fill from Clipboard</span>
                        </motion.button>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSave}
                          disabled={isSubmitting}
                          className="w-full py-4 rounded-[1.2rem] bg-accent hover:brightness-110 active:scale-95 flex items-center justify-center text-white shadow-lg shadow-accent/25 text-xl font-semibold transition-all"
                        >
                          {isSubmitting ? (
                            <IOSSpinner size={24} color="#fff" />
                          ) : (
                            "Add Expense"
                          )}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
});

export default GlobalAddExpense;
