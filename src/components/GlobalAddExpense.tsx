import React, { useState, memo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useAnimation, animate } from "framer-motion";
import { Calendar, Clock, Delete, Edit2, ChevronDown, User, TentTree } from "lucide-react";
import { useExpenses, useMonthlyStats } from "../hooks/useExpenses";
import { useEvents } from "../hooks/useEvents";
import { CATEGORIES, CATEGORY_COLORS, getCategoryIcon } from "../utils/uiUtils";
import { LiquidFAB } from "./ui/LiquidFAB";
import { LiquidClose } from "./ui/LiquidClose";
import IOSSpinner from "./ui/IOSSpinner";
import { useGlobalModal } from "../context/GlobalModalContext";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";

const NOTE_PLACEHOLDERS: Record<string, string> = {
  Food: "What did you eat?",
  Transport: "Where did you go?",
  Shopping: "What did you buy?",
  Bills: "Which bill?",
  Entertainment: "What was it?",
  Health: "What for?",
  Misc: "Add a note...",
};

const AnimatedPercentage = ({ value, color }: { value: number; color: string }) => {
  const [display, setDisplay] = useState(0);
  
  useEffect(() => {
    const animation = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest: number) => setDisplay(latest)
    });
    return () => animation.stop();
  }, [value]);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ 
        color,
        filter: `drop-shadow(0 0 15px ${color}30)`
      }}
      className="text-6xl font-bold tracking-tighter leading-none"
    >
      {display.toFixed(1)}<span className="text-3xl ml-0.5">%</span>
    </motion.div>
  );
};


const GlobalAddExpense = memo(() => {
  const { addExpense, updateExpense } = useExpenses();
  const { stats } = useMonthlyStats();
  const { events } = useEvents();
  const { isOpen, mode, expenseData, closeModal, setMode, openModal, updateExpenseData } = useGlobalModal();
  const [searchParams, setSearchParams] = useSearchParams();

  // Inputs
  const [amountStr, setAmountStr] = useState("0");
  const [category, setCategory] = useState("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date());

  // Context state
  const [contextType, setContextType] = useState<"personal" | "event">("personal");
  const [personalType, setPersonalType] = useState<"regular" | "one-off">("regular");
  const [selectedEventId, setSelectedEventId] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPersonalDropdown, setShowPersonalDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [amountKey, setAmountKey] = useState(0); // triggers scale animation
  const personalChipRef = useRef<HTMLButtonElement>(null);
  const eventChipRef = useRef<HTMLButtonElement>(null);
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

  // Sync Data on Open — resolve context/contextId from expenseData
  useEffect(() => {
    if (isOpen) {
      if (mode === "add") {
        setAmountStr("0");
        setCategory("Food");
        setNote("");
        setDate(new Date());
        setContextType("personal");
        setPersonalType("regular");
        setSelectedEventId(events[0]?.id || "");
      } else if (expenseData) {
        setAmountStr(expenseData.amount.toString());
        setCategory(expenseData.category);
        setNote(expenseData.note || "");

        // Handle Firestore Timestamp or Date
        // @ts-ignore
        const d = expenseData.date?.toDate ? expenseData.date.toDate() : new Date(expenseData.date);
        setDate(d);

        // Resolve context
        const ctx = expenseData.context || "personal";
        setContextType(ctx);
        if (ctx === "event") {
          setSelectedEventId(expenseData.contextId || "");
        } else {
          // personal: derive from contextId or legacy type
          const cid = expenseData.contextId || (expenseData.type === "One-off" ? "one-off" : "regular");
          setPersonalType(cid as "regular" | "one-off");
        }
      }
      setIsSubmitting(false);
    }
  }, [isOpen, mode, expenseData, events]);

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
      // Trigger keystroke animation
      setAmountKey((k) => k + 1);
    },
    [amountStr],
  );

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showPersonalDropdown && !showEventDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (personalChipRef.current && !personalChipRef.current.contains(e.target as Node)) {
        setShowPersonalDropdown(false);
      }
      if (eventChipRef.current && !eventChipRef.current.contains(e.target as Node)) {
        setShowEventDropdown(false);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [showPersonalDropdown, showEventDropdown]);

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

    // Validate event selection
    if (contextType === "event" && !selectedEventId) {
      if (navigator.vibrate) navigator.vibrate(200);
      return;
    }

    setIsSubmitting(true);

    // Compute context fields
    const context: "personal" | "event" = contextType;
    const contextId = contextType === "event" ? selectedEventId : personalType;
    const legacyType = contextType === "personal"
      ? (personalType === "one-off" ? "One-off" : "Regular")
      : "Regular";

    try {
      if (mode === "edit" && expenseData) {
        await updateExpense(expenseData.id, {
          amount: amountVal,
          category,
          note,
          date,
          type: legacyType,
          context,
          contextId,
        });

        updateExpenseData({
          amount: amountVal,
          category,
          note,
          date,
          type: legacyType,
          context,
          contextId,
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
          legacyType,
          context,
          contextId
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
    contextType,
    personalType,
    selectedEventId,
    addExpense,
    updateExpense,
    handleCloseModal,
    mode,
    expenseData,
    controls,
    setMode,
    updateExpenseData,
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
        relative h-14 sm:h-16 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-normal select-none touch-manipulation transition-colors duration-200
        ${transparent ? "bg-transparent text-gray-900 dark:text-white" : "bg-gray-100 dark:bg-[#1c1c1e] text-gray-900 dark:text-white"}
      `}
    >
      {label || val}
    </motion.button>
  );

  const isReadOnly = mode === "view";

  // Get display labels for view mode
  const contextLabel = () => {
    if (contextType === "event") {
      const ev = events.find(e => e.id === selectedEventId);
      return ev ? ev.name : "Event";
    }
    return personalType === "one-off" ? "One-off" : "Regular";
  };

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
              <>
              </>

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

                  {/* Main Amount Display — Hero */}
                  <div className="flex flex-col items-center justify-center py-2">
                    <motion.div
                      key={amountKey}
                      animate={controls}
                      initial={{ scale: 1.04 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="text-6xl font-bold text-gray-900 dark:text-white tracking-tight flex items-baseline"
                    >
                      <span className="text-4xl font-semibold text-gray-400 dark:text-gray-500 mr-1">
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
                                w-14 h-14 rounded-2xl flex items-center justify-center
                                transition-all duration-300
                                ${isSelected
                                  ? "shadow-lg border-2"
                                  : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500"
                                }
                              `}
                              style={isSelected ? {
                                backgroundColor: `${CATEGORY_COLORS[cat] || '#6366f1'}15`,
                                borderColor: `${CATEGORY_COLORS[cat] || '#6366f1'}50`,
                                boxShadow: `0 4px 20px ${CATEGORY_COLORS[cat] || '#6366f1'}20`,
                              } : undefined}
                            >
                              {getCategoryIcon(cat, isSelected ? "30px" : "24px")}
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

                  {/* Note Input Row */}
                  <div className="w-full">
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={isReadOnly ? "No note" : (NOTE_PLACEHOLDERS[category] || "Add a note...")}
                      readOnly={isReadOnly}
                      className={`w-full bg-gray-50 dark:bg-white/5 rounded-xl py-3 px-4 text-sm md:text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium ${isReadOnly ? 'focus:ring-0' : ''}`}
                    />
                  </div>

                  {/* Context Selector Row */}
                  <div className="grid grid-cols-2 gap-3 w-full">
                    {isReadOnly ? (
                      <>
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500">
                          {contextType === "event" ? <TentTree size={14} /> : <User size={14} />}
                          <span>{contextType === "event" ? "Event" : "Personal"}</span>
                        </div>
                        <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 truncate">
                          <span>{contextLabel()}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Personal / Event Toggle */}
                        <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-xl p-1 gap-1">
                          <button
                            onClick={() => setContextType("personal")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${contextType === "personal"
                              ? "bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-400 dark:text-gray-500"
                              }`}
                          >
                            <User size={14} />
                            <span>Personal</span>
                          </button>
                          <button
                            onClick={() => {
                              setContextType("event");
                              if (!selectedEventId && events.length > 0) {
                                setSelectedEventId(events[0].id);
                              }
                            }}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${contextType === "event"
                              ? "bg-white dark:bg-white/15 text-gray-900 dark:text-white shadow-sm"
                              : "text-gray-400 dark:text-gray-500"
                              }`}
                          >
                            <TentTree size={14} />
                            <span>Event</span>
                          </button>
                        </div>

                        {/* Sub-picker (Regular/One-off or Event name) */}
                        <div className="relative">
                          {contextType === "personal" ? (
                            <>
                              <button
                                ref={personalChipRef}
                                onClick={() => setShowPersonalDropdown((v) => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-white/10 transition-all"
                              >
                                <span>{personalType === "one-off" ? "One-off" : "Regular"}</span>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${showPersonalDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {showPersonalDropdown && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                    className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl overflow-hidden z-20"
                                  >
                                    {(["regular", "one-off"] as const).map((pt) => (
                                      <button
                                        key={pt}
                                        onClick={() => {
                                          setPersonalType(pt);
                                          setShowPersonalDropdown(false);
                                        }}
                                        className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${personalType === pt
                                          ? 'text-accent bg-accent/5'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                          }`}
                                      >
                                        {pt === "one-off" ? "One-off" : "Regular"}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <>
                              {events.length === 0 ? (
                                <div className="w-full px-4 py-3 rounded-xl text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 text-center">
                                  No events
                                </div>
                              ) : (
                                <>
                                  <button
                                    ref={eventChipRef}
                                    onClick={() => setShowEventDropdown((v) => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 active:bg-gray-200 dark:active:bg-white/10 transition-all"
                                  >
                                    <span className="truncate">
                                      {events.find(e => e.id === selectedEventId)?.name || "Pick event"}
                                    </span>
                                    <ChevronDown size={14} className={`shrink-0 transition-transform duration-200 ${showEventDropdown ? 'rotate-180' : ''}`} />
                                  </button>
                                  <AnimatePresence>
                                    {showEventDropdown && (
                                      <motion.div
                                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                                        className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-xl overflow-hidden z-20 max-h-48 overflow-y-auto"
                                      >
                                        {events.map((ev) => (
                                          <button
                                            key={ev.id}
                                            onClick={() => {
                                              setSelectedEventId(ev.id);
                                              setShowEventDropdown(false);
                                            }}
                                            className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${selectedEventId === ev.id
                                              ? 'text-accent bg-accent/5'
                                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                                              }`}
                                          >
                                            <p className="font-bold truncate">{ev.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
                                              {ev.startDate instanceof Timestamp
                                                ? format(ev.startDate.toDate(), "MMM d")
                                                : format(new Date(ev.startDate as any), "MMM d")}
                                            </p>
                                          </button>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Numpad & Actions Container */}
                  <div className="mt-auto pb-4 w-full relative">
                    {/* View Mode Actions (Visible only in View Mode) */}
                    {isReadOnly && expenseData && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-10"
                      >
                        <div className="w-full flex flex-col space-y-8">
                          <div className="space-y-4">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em] text-center mb-6">
                              Contribution to monthly spend
                            </p>

                            {(() => {
                              const monthKey = format(date, "yyyy-MM");
                              const monthStat = stats.find(s => s.monthKey === monthKey);
                              const total = monthStat?.total || expenseData.amount;
                              const pct = Math.min((expenseData.amount / total) * 100, 100);
                              const catColor = CATEGORY_COLORS[category] || '#6366f1';

                              return (
                                <div className="flex flex-col space-y-4">
                                  {/* Scale Component (Realistic Ruler) */}
                                  <div className="relative w-full h-16 flex flex-col items-center">
                                    <div className="relative w-full">
                                      {/* Ticks and Baseline Container */}
                                      <div className="relative w-full h-10 flex items-end">
                                        {/* Baseline */}
                                        <div className="absolute w-full h-[1px] bg-gray-200 dark:bg-white/20 bottom-0" />

                                        {/* Utilization Baseline Highlight */}
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                                          className="absolute left-0 h-[2px] bottom-[-0.5px] z-10 origin-left"
                                          style={{ backgroundColor: catColor }}
                                        />

                                        {/* Ticks (1% increments) */}
                                        <div className="absolute inset-0 flex justify-between items-end pointer-events-none">
                                          {Array.from({ length: 101 }).map((_, i) => {
                                            const isMajor = i % 10 === 0;
                                            const isMedium = i % 5 === 0 && !isMajor;
                                            const isFilled = i <= pct;

                                            let h = "4px";
                                            if (isMajor) h = "14px";
                                            else if (isMedium) h = "8px";

                                            return (
                                              <div
                                                key={i}
                                                className={`w-[1px] rounded-full transition-colors duration-500
                                                  ${isFilled ? '' : (isMajor ? 'bg-gray-300 dark:bg-white/30' : 'bg-gray-100 dark:bg-white/10')}
                                                `}
                                                style={{
                                                  height: h,
                                                  backgroundColor: isFilled ? catColor : undefined
                                                }}
                                              />
                                            );
                                          })}
                                        </div>

                                        {/* Labels (Every 10%) */}
                                        <div className="absolute left-0 right-0 top-full pt-2 flex justify-between pointer-events-none">
                                          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((t) => (
                                            <div key={t} className="flex flex-col items-center w-0 overflow-visible">
                                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                                {t}%
                                              </span>
                                            </div>
                                          ))}
                                        </div>

                                        {/* Precision Marker (Floating dot or Line) */}
                                        <motion.div
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0, left: `${pct}%` }}
                                          transition={{ duration: 0.4, delay: 1.5 }}
                                          className="absolute h-16 bottom-0 z-20 flex flex-col items-center -translate-x-1/2"
                                        >
                                          <div className="w-[1px] h-full bg-gray-300 dark:bg-white/20" />
                                          <div
                                            className="absolute top-0 w-3 h-3 rounded-full border-2 border-body shadow-lg z-30"
                                            style={{ backgroundColor: catColor }}
                                          />
                                        </motion.div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Vertical Stacked Contribution Info */}
                                  <div className="flex flex-col items-center pt-2 text-center">
                                    <AnimatedPercentage value={pct} color={catColor} />
                                    
                                    <motion.p 
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: 0.4 }}
                                      className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1 mb-2"
                                    >
                                      of your monthly spend
                                    </motion.p>

                                    <motion.div 
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      transition={{ delay: 0.6 }}
                                      className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
                                    >
                                      <span>₹{expenseData.amount.toLocaleString()}</span>
                                      <span className="text-gray-300 dark:text-gray-700 font-light">/</span>
                                      <span className="text-gray-500 dark:text-gray-400">₹{total.toLocaleString()}</span>
                                    </motion.div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="pt-4 border-t border-gray-100 dark:border-white/5 text-center">
                            <p className="text-[10px] text-gray-400 dark:text-gray-600 font-medium uppercase tracking-widest opacity-60">
                              Created on {format(date, "MMM dd, yyyy • hh:mm a")}
                            </p>
                          </div>
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

                      {/* Action Button — Smart CTA */}
                      <div className="mt-2">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={handleSave}
                          disabled={isSubmitting || parseFloat(amountStr) <= 0}
                          className={`w-full py-3 rounded-xl flex items-center justify-center text-lg font-semibold transition-all ${parseFloat(amountStr) > 0
                            ? 'bg-accent hover:brightness-110 active:scale-95 text-white shadow-md shadow-accent/25'
                            : 'bg-gray-200 dark:bg-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            }`}
                        >
                          {isSubmitting ? (
                            <IOSSpinner size={24} color="#fff" />
                          ) : parseFloat(amountStr) <= 0 ? (
                            "Enter amount"
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
