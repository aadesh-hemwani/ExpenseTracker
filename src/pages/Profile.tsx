import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { calculateRecommendedBudget } from "../services/gemini";
import {
  LogOut,
  Save,
  User,
  Wallet,
  Palette,
  Check,
  ShieldCheck,
  Moon,
  Sun,
  Plus,
  ChevronRight,
  X,
  TentTree,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card from "../components/Card";
import { useEvents } from "../hooks/useEvents";
import { Event } from "../types";
import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { getEventGradient } from "../utils/uiUtils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const toDate = (d: Timestamp | Date | undefined): Date => {
  if (!d) return new Date();
  if (d instanceof Timestamp) return d.toDate();
  return new Date(d);
};

const Profile = React.memo(() => {
  const { user, logOut } = useAuth();
  const { theme, toggleTheme, accentColor, setAccentColor, accentColors } = useTheme();
  const navigate = useNavigate();
  const { events, loading: eventsLoading, addEvent } = useEvents();

  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [newEventStart, setNewEventStart] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [newEventEnd, setNewEventEnd] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [newEventBudget, setNewEventBudget] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setBudget(docSnap.data().monthlyBudgetCap?.toString() || "");
        }
      }
    };
    fetchUserData();
  }, [user?.uid]);

  const handleSaveBudget = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setLoading(true);
    setMessage("");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        monthlyBudgetCap: Number(budget),
      });
      setMessage("Budget updated successfully.");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating budget:", error);
      setMessage("Failed to update budget.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, budget]);

  const handleLogout = useCallback(async () => {
    try {
      await logOut();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }, [logOut]);

  const handleAddEvent = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventName.trim()) return;
    setSavingEvent(true);
    try {
      const startDate = new Date(newEventStart);
      const endDate = new Date(newEventEnd);
      await addEvent(
        newEventName.trim(),
        startDate,
        endDate,
        newEventBudget ? Number(newEventBudget) : undefined
      );
      setNewEventName("");
      setNewEventStart(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setNewEventEnd(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setNewEventBudget("");
      setShowAddEventForm(false);
    } catch (err) {
      console.error("Failed to add event:", err);
    } finally {
      setSavingEvent(false);
    }
  }, [newEventName, newEventStart, newEventEnd, newEventBudget, addEvent]);

  const handleAutoCalculate = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const { collection, query, limit, getDocs } = await import("firebase/firestore");
      const q = query(collection(db, "users", user.uid, "expenses"), limit(300));

      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map((d) => d.data());

      if (expenses.length === 0) {
        setMessage("No transaction history found to analyze.");
        setLoading(false);
        return;
      }

      const rec = await calculateRecommendedBudget(expenses as any);

      if (rec) {
        setBudget(rec.recommendedBudget.toString());
        setMessage(`✨ AI Suggestion: ₹${rec.recommendedBudget}\n${rec.reasoning}`);
      } else {
        setMessage("Could not generate a suggestion.");
      }
    } catch (e) {
      console.error(e);
      setMessage("Failed to analyze data.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const accentColorList = useMemo(() => Object.entries(accentColors), [accentColors]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="pt-[calc(env(safe-area-inset-top)+2rem)] pb-32 max-w-lg mx-auto"
    >
      <motion.h1
        variants={itemVariants}
        className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-8"
      >
        Profile
      </motion.h1>

      <motion.div variants={itemVariants}>
        <Card className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-lg">
                <User color="var(--color-accent)" size={40} className="text-accent" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white dark:border-gray-900"></div>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {user?.displayName}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {user?.email}
          </p>

          {user?.isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="mt-4 px-4 py-1.5 bg-accent/20 text-gray-900 dark:text-white rounded-full text-xs font-bold border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
            >
              Admin Dashboard
            </button>
          )}

          <div className="mt-3 flex items-center gap-1.5 px-2.5 py-0.5 bg-green-500/20 dark:bg-green-900/40 text-green-800 dark:text-green-600 text-[10px] font-medium rounded-full border border-gray-100 dark:border-white/5">
            <ShieldCheck size={12} color="currentColor" />
            <span>Google Verified</span>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-6 pb-32">
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Palette size={20} color="currentColor" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Appearance</h3>
          </div>

          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full transition-colors ${theme === "dark" ? "bg-gray-800 text-yellow-400" : "bg-yellow-100 text-yellow-600"}`}>
                {theme === "dark" ? <Moon size={20} color="currentColor" /> : <Sun size={20} color="currentColor" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Adjust the appearance to reduce glare.</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${theme === "dark" ? "bg-accent" : "bg-gray-200"}`}
            >
              <span className={`${theme === "dark" ? "translate-x-6" : "translate-x-1"} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
              Accent Color{" "}
              <span className="text-gray-900 dark:text-white ml-1 font-normal opacity-60">• {accentColors[accentColor as keyof typeof accentColors]?.name || "Custom"}</span>
            </label>
            <div className="flex flex-wrap gap-4">
              {accentColorList.map(([key, colors]) => (
                <button
                  key={key}
                  onClick={() => setAccentColor(key as any)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${accentColor === key ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white scale-110 shadow-md" : "ring-1 ring-black/5 dark:ring-white/10"}`}
                  style={{ backgroundColor: colors.default }}
                  aria-label={`Select ${colors.name} accent color`}
                  title={colors.name}
                >
                  {accentColor === key && <Check color="#ffffff" size={20} />}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-purple-600 dark:text-purple-400">
                <TentTree size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Events</h3>
            </div>
            <button
              onClick={() => setShowAddEventForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-full text-xs font-bold hover:bg-accent/20 transition-colors"
            >
              <Plus size={14} />
              Add Event
            </button>
          </div>

          <AnimatePresence>
            {showAddEventForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleAddEvent}
                className="overflow-hidden mb-4"
              >
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl space-y-3 border border-gray-100 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">New Event</p>
                    <button type="button" onClick={() => setShowAddEventForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                      <X size={16} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    placeholder="Event name (e.g. Goa Trip)"
                    required
                    className="w-full px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  />

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Start</label>
                      <input
                        type="datetime-local"
                        value={newEventStart}
                        onChange={(e) => setNewEventStart(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">End</label>
                      <input
                        type="datetime-local"
                        value={newEventEnd}
                        onChange={(e) => setNewEventEnd(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all dark:[color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      value={newEventBudget}
                      onChange={(e) => setNewEventBudget(e.target.value)}
                      placeholder="Budget (optional)"
                      min="0"
                      className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingEvent || !newEventName.trim()}
                    className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all active:scale-95"
                  >
                    {savingEvent ? "Creating..." : "Create Event"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {eventsLoading ? (
            <div className="py-4 text-center text-sm text-gray-400">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="py-6 text-center">
              <TentTree size={32} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-600 font-medium">No events yet.</p>
              <p className="text-xs text-gray-300 dark:text-gray-700 mt-1">Create one to group trip or party expenses.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((ev: Event) => {
                const start = toDate(ev.startDate);
                const end = toDate(ev.endDate);
                const gradientClass = getEventGradient(ev.id, theme);

                return (
                  <motion.button
                    key={ev.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/event/${ev.id}`)}
                    className={`w-full flex items-center gap-3 p-4 bg-gradient-to-r ${gradientClass} dark:text-white hover:brightness-110 rounded-2xl transition-all text-left shadow-md shadow-purple-500/10 group border border-transparent dark:border-white/5`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/40 dark:bg-white/10 flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-transparent">
                      <TentTree size={18} className="text-gray-900 dark:text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base truncate text-gray-900 dark:text-white">{ev.name}</p>
                      <p className="text-xs text-gray-800/60 dark:text-white/80 mt-0.5 font-medium">
                        {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
                        {ev.budget ? ` • ₹${ev.budget.toLocaleString("en-IN")} budget` : ""}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-gray-900/40 dark:text-white/60 group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-accent/10 rounded-lg text-accent">
              <Wallet size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Budget</h3>
          </div>

          <form onSubmit={handleSaveBudget}>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Spending Cap (₹)</label>
              <button
                type="button"
                onClick={handleAutoCalculate}
                className="text-xs flex items-center gap-1 text-indigo-500 font-bold hover:text-indigo-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                </svg>
                Auto-Calculate
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex: 25000"
                className="w-full min-w-0 appearance-none bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-2 text-base font-semibold text-gray-900 dark:text-white focus:ring-0 focus:border-white/20 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-black dark:bg-white text-white dark:text-black px-6 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? "..." : <Save size={16} />}
                {loading ? "" : "Save"}
              </button>
            </div>
            {message && (
              <p className={`text-xs mt-3 ${message.includes("Failed") ? "text-red-500" : "text-green-600"} font-medium whitespace-pre-wrap leading-relaxed`}>
                {message}
              </p>
            )}
          </form>
        </Card>

        <button
          onClick={handleLogout}
          className="w-full p-4 flex items-center justify-center gap-2 text-red-600 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </motion.div>

      <motion.p variants={itemVariants} className="text-center text-xs text-gray-300 dark:text-gray-600 pt-4">
        Version 1.0.0 • Expense Tracker PWA
      </motion.p>
    </motion.div>
  );
});

Profile.displayName = "Profile";

export default Profile;