import React, { useState, memo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Calendar, Clock, Delete, Edit2 } from "lucide-react";
import { useExpenses } from "../hooks/useExpenses";
import { CATEGORIES, getCategoryIcon } from "../utils/uiUtils";
import { LiquidFAB } from "./ui/LiquidFAB";
import { LiquidClose } from "./ui/LiquidClose";
import IOSSpinner from "./ui/IOSSpinner";
import { LissajousArt } from "./ui/LissajousArt";
import { useGlobalModal } from "../context/GlobalModalContext";
import { format } from "date-fns";


const GlobalAddExpense = memo(() => {
  const { addExpense, updateExpense } = useExpenses();
  const { isOpen, mode, expenseData, closeModal, setMode, openModal, updateExpenseData } = useGlobalModal();
  const [searchParams, setSearchParams] = useSearchParams();

  // Inputs
  const [amountStr, setAmountStr] = useState("0");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());
  const [expenseType, setExpenseType] = useState<"expense" | "One-off">("expense");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const controls = useAnimation();

  // Handle Deep Links
  useEffect(() => {
    const action = searchParams.get("action");
    const amountParam = searchParams.get("amount");
    const noteParam = searchParams.get("note");
    const categoryParam = searchParams.get("category");

    if (action === "add") {
      openModal("add");

      if (amountParam) setAmountStr(amountParam);
      if (noteParam) setNote(noteParam);
      if (categoryParam) setCategory(categoryParam);
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
        setExpenseType(expenseData.type === "One-off" ? "One-off" : "expense");

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
          type: expenseType,
        });

        // Update local context data so View mode reflects changes
        updateExpenseData({
          amount: amountVal,
          category,
          note,
          date,
          type: expenseType,
        });

        setMode("view");
      } else {
        // ADD MODE
        await addExpense(
          amountVal.toString(),
          category,
          note,
          date,
          undefined, // icon
          undefined, // iconType
          expenseType // type
        );

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
    expenseType,
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
        relative h-12 sm:h-14 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-normal select-none touch-manipulation transition-colors duration-200
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

                <div className="px-5 pb-3 pt-1 flex flex-col h-full space-y-3">
                  {/* Top Bar */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {/* Date Picker */}
                      <div className="relative">
                        <button className={`flex items-center space-x-2 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full font-semibold text-gray-600 dark:text-gray-300 pointer-events-none ${isReadOnly ? 'text-xs' : 'text-sm'}`}>
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
                        <button className={`flex items-center space-x-2 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-full font-semibold text-gray-600 dark:text-gray-300 pointer-events-none ${isReadOnly ? 'text-xs' : 'text-sm'}`}>
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
                      className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight flex items-baseline"
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
                    style={{ WebkitOverflowScrolling: "touch" }}
                    className={`w-full overflow-x-auto no-scrollbar py-2 pl-4 ${isReadOnly ? 'pointer-events-none' : ''}`}
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
                                w-12 h-12 flex items-center justify-center
                                transition-all duration-300
                                ${isSelected ? "scale-125 drop-shadow-xl" : "opacity-50"}
                              `}
                            >
                              {getCategoryIcon(cat, "30px")}
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
                      className={`w-full bg-gray-50 dark:bg-white/5 rounded-xl py-2 px-4 text-center text-sm md:text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium ${isReadOnly ? 'focus:ring-0' : ''}`}
                    />
                  </div>

                  <div className="flex w-full bg-gray-100 dark:bg-white/5 rounded-xl p-1 relative">
                    <div
                      className="absolute inset-y-1 rounded-xl bg-white dark:bg-[#2c2c2e] shadow-sm transition-all duration-300"
                      style={{
                        width: 'calc(50% - 4px)',
                        left: expenseType === 'expense' ? '4px' : 'calc(50%)'
                      }}
                    />
                    <button
                      onClick={() => !isReadOnly && setExpenseType("expense")}
                      className={`flex-1 py-1.5 text-sm font-semibold relative z-10 transition-colors ${expenseType === 'expense' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}
                    >
                      Regular
                    </button>
                    <button
                      onClick={() => !isReadOnly && setExpenseType("One-off")}
                      className={`flex-1 py-1.5 text-sm font-semibold relative z-10 transition-colors ${expenseType === 'One-off' ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}
                    >
                      One-off
                    </button>
                  </div>

                  {/* Numpad & Actions Container */}
                  <div className="mt-auto pb-4 w-full relative">
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
                        className="grid grid-cols-3 gap-2"
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
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSave}
                          disabled={isSubmitting}
                          className="w-full py-3 rounded-xl bg-accent hover:brightness-110 active:scale-95 flex items-center justify-center text-white shadow-md shadow-accent/25 text-lg font-semibold transition-all"
                        >
                          {isSubmitting ? (
                            <IOSSpinner size={24} color="#fff" />
                          ) : (
                            mode === "edit" ? "Update Expense" : "Add Expense"
                          )}
                        </motion.button>
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
