import React, { useState, memo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Calendar, Clock, Delete, Wand2, Edit2 } from "lucide-react";
import { useExpenses } from "../hooks/useExpenses";
import { CATEGORIES, getCategoryIcon } from "../utils/uiUtils";
import { parseTransactionText } from "../utils/smsParser";
import { LiquidFAB } from "./ui/LiquidFAB";
import { LiquidClose } from "./ui/LiquidClose";
import IOSSpinner from "./ui/IOSSpinner";
import { LissajousArt } from "./ui/LissajousArt";
import { useGlobalModal } from "../context/GlobalModalContext";
import { findLucideIcon } from "../utils/uiUtils";
import { suggestIcon } from "../services/gemini";
import { format } from "date-fns";
import confetti from "canvas-confetti";


const GlobalAddExpense = memo(() => {
  const { addExpense, updateExpense } = useExpenses();
  const { isOpen, mode, expenseData, closeModal, setMode, openModal, updateExpenseData } = useGlobalModal();
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
    if (isOpen && mode === "add") {
      const checkClipboard = async () => {
        try {
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
          setHasClipboard(false);
        }
      };
      checkClipboard();
    }
  }, [isOpen, mode]);

  // Handle Deep Links
  useEffect(() => {
    const action = searchParams.get("action");
    const text = searchParams.get("text");

    if (action === "add") {
      openModal("add");

      if (text) {
        const parsed = parseTransactionText(text);
        if (parsed) {
          setAmountStr(parsed.amount);
          if (parsed.note) setNote(parsed.note);
          if (parsed.category) setCategory(parsed.category);
        }
      }
    }
  }, [searchParams, openModal]);

  // Sync Data on Open
  useEffect(() => {
    if (isOpen) {
      if (mode === "add") {
        setAmountStr("0");
        setCategory("Food");
        setNote("");
        setDate(new Date());
      } else if (expenseData) {
        setAmountStr(expenseData.amount.toString());
        setCategory(expenseData.category);
        setNote(expenseData.note || "");

        // Handle Firestore Timestamp or Date
        // @ts-ignore
        const d = expenseData.date?.toDate ? expenseData.date.toDate() : new Date(expenseData.date);
        setDate(d);
      }
      setIsSubmitting(false);
    }
  }, [isOpen, mode, expenseData]);

  const handleCloseModal = useCallback(() => {
    closeModal();
    if (searchParams.get("action") === "add") {
      setSearchParams((params) => {
        params.delete("action");
        return params;
      });
    }
  }, [closeModal, searchParams, setSearchParams]);

  const handleSmartPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseTransactionText(text);
      if (parsed) {
        setAmountStr(parsed.amount);
        if (parsed.note) setNote(parsed.note);
        if (parsed.category) setCategory(parsed.category);
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
      } else {
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
          if (prev.length > 8) return prev;
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
      if (mode === "edit" && expenseData) {
        await updateExpense(expenseData.id, {
          amount: amountVal,
          category,
          note,
          date,
        });
        await updateExpense(expenseData.id, {
          amount: amountVal,
          category,
          note,
          date,
        });

        // Update local context data so View mode reflects changes
        updateExpenseData({
          amount: amountVal,
          category,
          note,
          date
        });

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          zIndex: 10001,
          colors: ['#4ade80', '#22c55e'] // Greenish for update
        });
        setMode("view");
      } else {
        // ADD MODE
        const localIcon = findLucideIcon(note);
        const newId = await addExpense(
          amountVal.toString(),
          category,
          note,
          date,
          localIcon,
          localIcon ? "lucide" : undefined,
        );

        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 10001,
        });

        if (newId && !localIcon && note.trim().length > 2) {
          suggestIcon(note).then((aiIcon) => {
            if (aiIcon) {
              updateExpense(newId, { icon: aiIcon, iconType: "lucide" });
            }
          });
        }
        setTimeout(() => {
          handleCloseModal();
        }, 500);
      }

    } catch (error) {
      console.error("Failed to save expense", error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    amountStr,
    category,
    note,
    date,
    addExpense,
    updateExpense,
    handleCloseModal,
    mode,
    expenseData,
    controls
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

  const isReadOnly = mode === "view";

  return (
    <>
      <LiquidFAB onClick={() => openModal("add")} />

      {createPortal(
        <AnimatePresence>
          {isOpen && (
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

              {/* Modal Content */}
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
                  {/* Top Bar */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {/* Date Picker */}
                      <div className="relative">
                        <button className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 pointer-events-none">
                          <Calendar size={16} className="text-current" />
                          <span>{format(date, "MMM dd, yyyy")}</span>
                        </button>
                        {!isReadOnly && (
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
                        )}
                      </div>

                      {/* Time Picker */}
                      <div className="relative">
                        <button className="flex items-center space-x-2 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full text-sm font-semibold text-gray-600 dark:text-gray-300 pointer-events-none">
                          <Clock size={16} className="text-current" />
                          <span>{format(date, "hh:mm a")}</span>
                        </button>
                        {!isReadOnly && (
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
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {mode === "view" && (
                        <button
                          onClick={() => setMode("edit")}
                          className="liquid-close-btn"
                          aria-label="Edit"
                        >
                          <Edit2 size={20} />
                        </button>
                      )}
                      {mode === "edit" ? (
                        <button
                          onClick={() => setMode("view")}
                          className="liquid-pill text-sm font-semibold text-gray-900 dark:text-white"
                        >
                          Cancel
                        </button>
                      ) : (
                        <LiquidClose onClick={handleCloseModal} />
                      )}
                    </div>
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
                      {amountStr}
                    </motion.div>
                  </div>

                  {/* Categories Horizontal Scroll */}
                  <div
                    ref={(el) => {
                      // Scroll to selected category on mount/update
                      if (el && isOpen) {
                        const index = CATEGORIES.indexOf(category);
                        if (index !== -1) {
                          const itemWidth = 88; // 72px width + 16px gap approx
                          const scrollLeft = index * itemWidth - (el.clientWidth / 2) + (itemWidth / 2);
                          el.scrollTo({ left: scrollLeft, behavior: "smooth" });
                        }
                      }
                    }}
                    className={`w-full overflow-x-auto no-scrollbar py-3 pl-4 ${isReadOnly ? 'pointer-events-none' : ''}`}
                  >
                    <div className="flex space-x-4 pr-4">
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat;
                        return (
                          <motion.button
                            key={cat}
                            onClick={() => !isReadOnly && setCategory(cat)}
                            whileTap={{ scale: 0.95 }}
                            animate={{
                              scale: isSelected ? 1.05 : 1,
                              opacity: isSelected ? 1 : (isReadOnly ? 0.3 : 0.7),
                              filter: isSelected ? "grayscale(0%)" : (isReadOnly ? "grayscale(100%)" : "grayscale(0%)")
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
                                ${isSelected
                                  ? "bg-gradient-to-br from-gray-800 to-black dark:from-white dark:to-gray-200 text-white dark:text-black shadow-lg shadow-gray-200 dark:shadow-none ring-2 ring-offset-2 ring-gray-900 dark:ring-white ring-offset-white dark:ring-offset-black"
                                  : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/5"
                                }
                              `}
                            >
                              {getCategoryIcon(cat, "24px")}
                            </div>
                            <span
                              className={`text-xs font-semibold ${isSelected
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

                  {/* Note Input */}
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={isReadOnly ? "No note" : "Add note..."}
                      readOnly={isReadOnly}
                      className={`w-full bg-gray-50 dark:bg-white/5 rounded-2xl py-3 px-4 text-center text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium ${isReadOnly ? 'focus:ring-0' : ''}`}
                    />
                  </div>

                  {/* Numpad & Actions Container */}
                  <div className="mt-auto pb-6 w-full relative">
                    {/* View Mode Actions (Visible only in View Mode) */}
                    {isReadOnly && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
                      >
                        {/* Lissajous Art Background */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10 translate-y-[-20%] opacity-60">
                          <LissajousArt
                            amount={parseFloat(amountStr || "0")}
                            hour={date.getHours()}
                            minute={date.getMinutes()}
                            day={date.getDate()}
                            category={category}
                          />
                        </div>


                        {/* Buttons Removed */}

                        <div className="absolute bottom-0 w-full text-center pb-2">
                          <p className="text-[10px] text-gray-300 dark:text-gray-700 font-medium uppercase tracking-widest opacity-50">
                            Created on {format(date, "MMM dd, yyyy • hh:mm a")}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Numpad Grid (Hidden in View Mode but keeps height if we use visibility, but here we use absolute overlay or conditional rendering with fixed height wrapper) */}
                    {/* Actually, to keep height perfectly, we can render Numpad with opacity-0 pointer-events-none in view mode, AND overlay the actions */}

                    <div className={`flex flex-col gap-4 transition-all duration-300 ${isReadOnly ? 'opacity-0 pointer-events-none filter blur-sm' : 'opacity-100'}`}>
                      {/* Grid */}
                      <motion.div
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
                            <Delete size={28} className="text-current" />
                          }
                        />
                      </motion.div>

                      {/* Action Button */}
                      <div className="mt-2">
                        {mode === "add" && hasClipboard ? (
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (navigator.vibrate) navigator.vibrate(10);
                              handleSmartPaste();
                            }}
                            className="w-full py-4 rounded-[1.2rem] bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 flex items-center justify-center text-white shadow-lg text-lg font-bold gap-2 transition-all"
                          >
                            <Wand2 size={24} color="#fff" />
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
                              mode === "edit" ? "Update Expense" : "Add Expense"
                            )}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div >
          )}
        </AnimatePresence >,
        document.body,
      )}
    </>
  );
});

export default GlobalAddExpense;
