import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, TentTree, ChevronLeft, Calendar, Wallet, AlertTriangle, X, Clock, Edit2 } from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { Timestamp, collection, query, where, onSnapshot, DocumentData, QuerySnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useEvents } from "../hooks/useEvents";
import { useExpenses } from "../hooks/useExpenses";
import { useTheme } from "../context/ThemeContext";
import { useGlobalModal } from "../context/GlobalModalContext";
import { Expense, Event } from "../types";
import { ExpenseCard } from "../components/ExpenseCard";
import { getEventGradient } from "../utils/uiUtils";
import { formatCurrency } from "../utils/formatUtils";
import IOSSpinner from "../components/ui/IOSSpinner";

const toDate = (d: Timestamp | Date | undefined): Date => {
  if (!d) return new Date();
  if (d instanceof Timestamp) return d.toDate();
  return new Date(d);
};

type DeleteAction = "move-regular" | "move-oneoff" | "delete-all";

const EventDetail = memo(() => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { events, loading: eventsLoading, deleteEvent, updateEvent } = useEvents();
  const { deleteExpense } = useExpenses();
  const { openModal } = useGlobalModal();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAction, setDeleteAction] = useState<DeleteAction>("move-regular");
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [isUpdatingEvent, setIsUpdatingEvent] = useState(false);

  const event: Event | undefined = useMemo(
    () => events.find((e) => e.id === eventId),
    [events, eventId]
  );

  useEffect(() => {
    if (!user?.uid || !eventId) {
      setExpensesLoading(false);
      return;
    }

    const expensesRef = collection(db, "users", user.uid, "expenses");
    const q = query(
      expensesRef,
      where("context", "==", "event"),
      where("contextId", "==", eventId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
          } as Expense;
        });

        docs.sort((a, b) => {
          const aDate = a.date instanceof Date ? a.date : new Date(a.date as any);
          const bDate = b.date instanceof Date ? b.date : new Date(b.date as any);
          return bDate.getTime() - aDate.getTime();
        });
        setExpenses(docs);
        setExpensesLoading(false);
      },
      (error) => {
        console.error("Firestore error:", error);
        setExpensesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, eventId]);

  const totalSpent = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses]
  );

  const handleDeleteEvent = useCallback(async () => {
    if (!eventId) return;
    setIsDeletingEvent(true);
    try {
      if (deleteAction === "delete-all") {
        await deleteEvent(eventId, "delete");
      } else {
        const targetContextId = deleteAction === "move-oneoff" ? "one-off" : "regular";
        await deleteEvent(eventId, "move", "personal", targetContextId);
      }
      navigate("/profile");
    } catch (e) {
      console.error("Failed to delete event", e);
    } finally {
      setIsDeletingEvent(false);
      setShowDeleteModal(false);
    }
  }, [eventId, deleteAction, deleteEvent, navigate]);

  const handleOpenEdit = useCallback(() => {
    if (!event) return;
    setEditName(event.name);
    setEditStart(format(toDate(event.startDate), "yyyy-MM-dd'T'HH:mm"));
    setEditEnd(format(toDate(event.endDate), "yyyy-MM-dd'T'HH:mm"));
    setEditBudget(event.budget ? event.budget.toString() : "");
    setShowEditModal(true);
  }, [event]);

  const handleUpdateEvent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId || !editName.trim() || !editStart || !editEnd) return;

    setIsUpdatingEvent(true);
    try {
      await updateEvent(eventId, {
        name: editName.trim(),
        startDate: new Date(editStart),
        endDate: new Date(editEnd),
        budget: editBudget ? parseFloat(editBudget) : undefined,
      });
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update event", err);
    } finally {
      setIsUpdatingEvent(false);
    }
  }, [eventId, editName, editStart, editEnd, editBudget, updateEvent]);

  const durationData = useMemo(() => {
    if (!event) return null;
    const start = toDate(event.startDate);
    const end = toDate(event.endDate);
    const days = differenceInDays(end, start);
    const hours = differenceInHours(end, start) % 24;

    let str = "";
    if (days > 0) str += `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) str += `${days > 0 ? ', ' : ''}${hours} hr${hours !== 1 ? 's' : ''}`;
    if (!str) str = "Less than an hour";

    return { str, start, end };
  }, [event]);

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <IOSSpinner size={32} />
      </div>
    );
  }

  if (!event || !durationData) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500 dark:text-gray-400 font-medium">Event not found.</p>
        <button onClick={() => navigate("/profile")} className="text-accent font-bold text-sm">
          ← Back to Profile
        </button>
      </div>
    );
  }

  const { str: durationStr, start, end } = durationData;
  const budgetUsed = event.budget ? (totalSpent / event.budget) * 100 : 0;
  const gradientClass = getEventGradient(event.id, theme);

  return (
    <div className="relative min-h-screen">
      {/* Seamless edge-to-edge background */}
      <div 
        className={`absolute top-0 left-0 right-0 h-[50vh] bg-gradient-to-br ${gradientClass} pointer-events-none opacity-80 dark:opacity-40`}
        style={{ 
          maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)', 
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)' 
        }}
      />

      <div className="relative z-10 pt-[calc(env(safe-area-inset-top)+1rem)] px-4 max-w-lg mx-auto pb-32">
        {/* Header Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/profile")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-black/40 backdrop-blur-md hover:bg-black/10 dark:hover:bg-black/60 transition-all"
          >
            <ChevronLeft size={20} className="text-gray-900 dark:text-white" />
          </button>
          <button
            onClick={handleOpenEdit}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 dark:bg-black/40 backdrop-blur-md hover:bg-black/10 dark:hover:bg-black/60 transition-all"
          >
            <Edit2 size={18} className="text-gray-900 dark:text-white" />
          </button>
        </div>

        {/* Seamless Immersive Info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-10 mt-2"
        >
          <div className="w-20 h-20 mb-6 bg-white/20 dark:bg-black/20 backdrop-blur-xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/30 dark:border-white/10 flex items-center justify-center">
             <TentTree size={36} className="text-gray-900 dark:text-white opacity-80" />
          </div>

          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2 drop-shadow-sm">
            {event.name}
          </h1>
          
          <div className="text-gray-800/70 dark:text-white/70 font-medium text-[13px] flex flex-col items-center gap-1.5 drop-shadow-sm">
            <p className="flex items-center justify-center">
              {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
              <span className="mx-2 opacity-40">•</span>
              <span className="uppercase tracking-widest text-[10px] font-bold">{durationStr}</span>
            </p>
            <p className="opacity-80">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="mt-8 flex flex-col items-center w-full">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600 dark:text-white/60 mb-1">Total Spent</p>
            <p className="text-5xl font-black text-gray-900 dark:text-white leading-none tracking-tighter drop-shadow-sm">
              {formatCurrency(totalSpent)}
            </p>
          </div>

          {event.budget && (
            <div className="w-full mt-10">
              <div className="flex items-center justify-between text-xs mb-2 px-1">
                <span className="text-gray-600 dark:text-white/60 font-bold uppercase tracking-[0.1em]">Budget</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalSpent)} / {formatCurrency(event.budget)}
                </span>
              </div>
              <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetUsed, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${budgetUsed > 100 ? "bg-red-500" : budgetUsed > 80 ? "bg-amber-400" : "bg-gray-900 dark:bg-white"}`}
                />
              </div>
              {budgetUsed > 100 && (
                <p className="text-red-600 dark:text-red-400 text-[11px] mt-3 font-bold flex items-center justify-center gap-1.5 w-full">
                  <AlertTriangle size={12} /> Over budget by {formatCurrency(totalSpent - event.budget)}
                </p>
              )}
            </div>
          )}
        </motion.div>

        <div className="mb-6 relative z-10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pl-1">Expenses</h2>
        {expensesLoading ? (
          <div className="flex items-center justify-center py-10">
            <IOSSpinner size={28} />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-[20px]">
            <TentTree size={36} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400 dark:text-gray-600">No expenses for this event yet.</p>
            <p className="text-xs text-gray-300 dark:text-gray-700 mt-1">Add an expense and select this event.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onDelete={(id, amount, date) => deleteExpense(id, amount, date instanceof Timestamp ? date.toDate() : new Date(date as any))}
                  onClick={(e) => openModal("view", e)}
                  onEdit={(e) => openModal("edit", e)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowDeleteModal(true)}
        className="w-full py-4 flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
      >
        <Trash2 size={18} />
        Delete Event
      </button>

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showDeleteModal && (
            <div className="fixed top-0 left-0 right-0 z-[9999] flex items-end md:items-center justify-center pointer-events-none pb-8" style={{ height: "100lvh" }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-gray-900/30 dark:bg-black/50 backdrop-blur-sm pointer-events-auto"
                onClick={() => !isDeletingEvent && setShowDeleteModal(false)}
              />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 bg-white dark:bg-[#121316] w-full md:w-[95%] max-w-md rounded-t-[20px] md:rounded-[20px] p-6 shadow-lg border-t border-gray-200/50 dark:border-none flex flex-col pointer-events-auto pb-safe md:mb-0"
              >
                <div className="w-full h-4 flex items-center justify-center md:hidden mb-2 absolute top-0 left-0 right-0">
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mt-2" />
                </div>

                <div className="flex items-start justify-between mb-4 mt-2 md:mt-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center">
                      <Trash2 size={18} className="text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete "{event.name}"?</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {expenses.length} expense{expenses.length !== 1 ? "s" : ""} will be affected.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeletingEvent}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                  What should happen to the expenses tied to this event?
                </p>

                <div className="space-y-2 mb-6">
                  {[
                    { id: "move-regular", label: "Move to Personal → Regular", description: "Expenses will appear as regular personal expenses." },
                    { id: "move-oneoff", label: "Move to Personal → One-off", description: "Expenses will appear as one-off personal expenses." },
                    { id: "delete-all", label: "Delete all expenses", description: "Permanently removes all expenses. This cannot be undone.", danger: true },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDeleteAction(opt.id as DeleteAction)}
                      className={`w-full p-3.5 rounded-2xl text-left border-2 transition-all ${deleteAction === opt.id
                        ? opt.danger
                          ? "border-red-500 bg-red-50 dark:bg-red-500/10"
                          : "border-accent bg-accent/5"
                        : "border-gray-100 dark:border-white/10 hover:border-gray-200 dark:hover:border-white/20"
                        }`}
                    >
                      <p className={`font-semibold text-sm ${deleteAction === opt.id
                        ? opt.danger ? "text-red-600 dark:text-red-400" : "text-accent"
                        : "text-gray-800 dark:text-white"
                        }`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.description}</p>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeletingEvent}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 ${deleteAction === "delete-all"
                    ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25"
                    : "bg-accent hover:brightness-110 shadow-lg shadow-accent/25"
                    }`}
                >
                  {isDeletingEvent ? <IOSSpinner size={20} color="#fff" /> : (
                    <>
                      <Trash2 size={16} />
                      {deleteAction === "delete-all" ? "Delete Event & Expenses" : "Confirm & Delete Event"}
                    </>
                  )}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed top-0 left-0 right-0 z-[9999] flex items-end md:items-center justify-center pointer-events-none pb-8" style={{ height: "100lvh" }}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-gray-900/30 dark:bg-black/50 backdrop-blur-sm pointer-events-auto"
                onClick={() => !isUpdatingEvent && setShowEditModal(false)}
              />
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 bg-white dark:bg-black w-full md:w-[95%] max-w-md rounded-t-[20px] md:rounded-[20px] p-6 shadow-2xl border-t border-gray-200/50 dark:border-white/10 flex flex-col pointer-events-auto pb-safe md:mb-0"
              >
                <div className="w-full h-4 flex items-center justify-center md:hidden mb-2 absolute top-0 left-0 right-0">
                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mt-2" />
                </div>

                <div className="flex items-start justify-between mb-6 mt-2 md:mt-0">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Event</h3>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={isUpdatingEvent}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleUpdateEvent} className="space-y-4">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Event name"
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  />

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Start</label>
                      <input
                        type="datetime-local"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        required
                        className="w-full px-3 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">End</label>
                      <input
                        type="datetime-local"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        required
                        className="w-full px-3 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">₹</span>
                    <input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      placeholder="Budget (optional)"
                      min="0"
                      className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingEvent || !editName.trim() || !editStart || !editEnd}
                      className="w-full py-4 bg-accent text-white rounded-2xl text-sm font-bold shadow-lg shadow-accent/25 disabled:opacity-50 transition-all active:scale-98 flex items-center justify-center cursor-pointer"
                    >
                      {isUpdatingEvent ? <IOSSpinner size={20} color="#fff" /> : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      </div>
    </div>
  );
});

EventDetail.displayName = "EventDetail";

export default EventDetail;