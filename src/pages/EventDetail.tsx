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
    <div className="pt-[calc(env(safe-area-inset-top)+2rem)] max-w-lg mx-auto pb-32">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/profile")}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
        >
          <ChevronLeft size={20} className="text-gray-700 dark:text-white" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight truncate flex-1">
          {event.name}
        </h1>
        <button
          onClick={handleOpenEdit}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-all"
        >
          <Edit2 size={18} />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${gradientClass} rounded-[20px] p-6 mb-6 shadow-sm relative overflow-hidden border border-transparent dark:border-none`}
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-white/40 dark:bg-white/10 rounded-2xl shadow-sm backdrop-blur-md">
              <TentTree size={28} className="text-gray-900 dark:text-white" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900 dark:text-white leading-none mb-1">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-800/60 dark:text-white/60">
                Total spent
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
              {event.name}
            </h1>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-gray-800/80 dark:text-white/80 font-medium text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="opacity-60" />
                <span>{format(start, "MMM d")} – {format(end, "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="opacity-60" />
                <span className="uppercase tracking-widest font-bold text-[10px]">{durationStr}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-current opacity-40"></div>
                <span>{expenses.length} expense{expenses.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>

          {event.budget && (
            <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-800/60 dark:text-white/60 font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
                  <Wallet size={12} /> Budget
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalSpent)} / {formatCurrency(event.budget)}
                </span>
              </div>
              <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetUsed, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${budgetUsed > 100 ? "bg-red-500" : budgetUsed > 80 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                />
              </div>
              {budgetUsed > 100 && (
                <p className="text-red-600 dark:text-red-400 text-[11px] mt-2 font-bold flex items-center gap-1.5 bg-red-500/10 dark:bg-red-500/20 w-fit px-2 py-0.5 rounded-md">
                  <AlertTriangle size={12} /> Over budget by {formatCurrency(totalSpent - event.budget)}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Expenses</h2>
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
            <AnimatePresence>
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
  );
});

EventDetail.displayName = "EventDetail";

export default EventDetail;