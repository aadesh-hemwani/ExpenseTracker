import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useMonthlyStats, useExpensesForMonth } from "../hooks/useExpenses";
import {
  requestNotificationPermission,
  sendNotification,
} from "../utils/notificationUtils";
import { format, subDays, subMonths } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Notifications } from "react-ionicons";

const NotificationManager = () => {
  const { user } = useAuth();
  /* Replaced useRecentExpenses with combined monthly fetching */
  const { stats, loading: loadingStats } = useMonthlyStats();

  const now = useMemo(() => new Date(), []);
  const lastMonthDate = useMemo(() => subMonths(now, 1), [now]);

  const { expenses: lastMonthExpenses } = useExpensesForMonth(
    lastMonthDate,
    stats,
    !loadingStats
  );

  const { expenses: thisMonthExpenses } = useExpensesForMonth(
    now,
    stats,
    !loadingStats
  );

  const expenses = useMemo(() => {
    return [...thisMonthExpenses, ...lastMonthExpenses];
  }, [thisMonthExpenses, lastMonthExpenses]);
  const [budgetCap, setBudgetCap] = useState<number | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const getDate = (date: any): Date | null => {
    if (!date) return null;
    try {
      return date instanceof Date ? date : date.toDate();
    } catch (e) {
      console.error("Invalid date object:", date, e);
      return null;
    }
  };

  // Initial Permission Request Logic
  useEffect(() => {
    // Check if browser supports notifications
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        // Show our nice modal instead of native prompt immediately
        setIsPermissionModalOpen(true);
      } else if (Notification.permission === "granted") {
        // Already granted, ensure we are set up (e.g. server workers if needed)
        requestNotificationPermission();
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setIsPermissionModalOpen(false);
      // Optional: Send a welcome notification?
      sendNotification(
        "✅ Notifications Enabled",
        "You'll now receive updates about your budget!"
      );
    } else {
      // User denied native prompt
      setIsPermissionModalOpen(false);
    }
  };

  const handleCloseModal = () => {
    setIsPermissionModalOpen(false);
    // Could save to localStorage to not ask again for X days
  };

  // Fetch User Budget
  useEffect(() => {
    const fetchBudget = async () => {
      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setBudgetCap(docSnap.data().monthlyBudgetCap || null);
        }
      }
    };
    fetchBudget();
  }, [user]);

  // 1. Daily Reminder (8 PM)
  useEffect(() => {
    const checkDailyReminder = () => {
      const now = new Date();
      const currentHour = now.getHours(); // 0-23
      const todayKey = format(now, "yyyy-MM-dd");
      const lastReminded = localStorage.getItem("lastDailyReminder");

      // Logic: If it's past 8 PM (20:00) and we haven't reminded TODAY
      if (currentHour >= 20 && lastReminded !== todayKey) {
        sendNotification(
          "📝 Daily Reminder",
          "Running low on budget? Log your expenses for today!"
        );
        localStorage.setItem("lastDailyReminder", todayKey);
      }
    };

    const interval = setInterval(checkDailyReminder, 60 * 60 * 1000); // Check every hour
    checkDailyReminder(); // Check on mount
    return () => clearInterval(interval);
  }, []);

  // 2. Budget Alert (> 80%)
  useEffect(() => {
    if (!budgetCap || stats.length === 0) return;

    const currentMonthKey = format(new Date(), "yyyy-MM");
    // @ts-ignore
    const currentStats = stats.find((s) => s.monthKey === currentMonthKey);

    if (currentStats) {
      const total = Number(currentStats.total);
      const percentage = (total / budgetCap) * 100;
      const lastAlertKey = localStorage.getItem("lastBudgetAlert");

      // Alert if > 80% and we haven't alerted THIS month
      if (percentage >= 80 && lastAlertKey !== currentMonthKey) {
        sendNotification(
          "⚠️ Budget Alert",
          `Heads up! You've used ${percentage.toFixed(
            0
          )}% of your monthly limit.`
        );
        localStorage.setItem("lastBudgetAlert", currentMonthKey);
      }
    }
  }, [budgetCap, stats]);

  // 3. Streak Builder
  useEffect(() => {
    if (expenses.length === 0) return;

    const checkStreak = () => {
      const todayKey = format(new Date(), "yyyy-MM-dd");
      const lastStreakNotif = localStorage.getItem("lastStreakNotification");

      // Don't spam streak notifications today
      if (lastStreakNotif === todayKey) return;

      // Calculate Streak
      // Sort expenses just in case, though hook usually returns sorted
      // Filter out invalid expenses first
      const validExpenses = expenses.filter((e) => getDate(e.date) !== null);

      const sorted = [...validExpenses].sort((a, b) => {
        const dateA = getDate(a.date);
        const dateB = getDate(b.date);
        if (!dateA || !dateB) return 0; // Should not happen due to filter
        return dateB.getTime() - dateA.getTime();
      });

      // Simplified Streak Logic
      let currentDay = new Date();
      let streakCount = 0;
      const expenseDates = new Set();

      sorted.forEach((e) => {
        const d = getDate(e.date);
        if (d) expenseDates.add(format(d, "yyyy-MM-dd"));
      });

      // Check up to 30 days back
      for (let i = 0; i < 30; i++) {
        const dayStr = format(subDays(currentDay, i), "yyyy-MM-dd");
        if (expenseDates.has(dayStr)) {
          streakCount++;
        } else {
          // If it's today and we haven't logged, don't break streak yet?
          // No, streak means CONSECUTIVE days.
          // Special case: If i==0 (Today) and missing, allows break? No, simple logic first.
          if (i === 0) continue; // Skip today for streak calc if missing, start from yesterday
          break;
        }
      }

      if (streakCount >= 3) {
        sendNotification(
          "🔥 Streak Builder",
          `Great job! You've tracked expenses for ${streakCount} days in a row.`
        );
        localStorage.setItem("lastStreakNotification", todayKey);
      }
    };

    checkStreak();
  }, [expenses]);

  // 4. Weekly Report
  useEffect(() => {
    if (expenses.length === 0) return;

    const checkWeekly = () => {
      const lastReportTime = localStorage.getItem("lastWeeklyReportTime");
      const now = Date.now();
      const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

      if (!lastReportTime || now - Number(lastReportTime) > ONE_WEEK) {
        // Generate Report
        const oneWeekAgo = subDays(new Date(), 7);
        const recentTotal = expenses
          .filter((e) => {
            const date = getDate(e.date);
            return date && date >= oneWeekAgo;
          })
          .reduce((sum, e) => sum + Number(e.amount), 0);

        if (recentTotal > 0) {
          sendNotification(
            "📊 Weekly Report",
            `You spent ₹${recentTotal.toLocaleString()} this week. Keep tracking!`
          );
          localStorage.setItem("lastWeeklyReportTime", now.toString());
        }
      }
    };

    checkWeekly();
  }, [expenses]);

  return (
    <AnimatePresence>
      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[5px] pointer-events-auto"
            onClick={handleCloseModal}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.8,
            }}
            className="relative z-10 bg-white dark:bg-black w-[90%] md:w-[28rem] max-w-full rounded-[40px] md:rounded-3xl p-6 md:p-8 shadow-2xl mx-auto mb-6 md:mb-0 border border-gray-200 dark:border-white/10 pointer-events-auto flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-6 text-accent">
              <Notifications color="#6366f1" height="32px" width="32px" />
            </div>

            <h3 className="text-xl font-bold dark:text-white mb-2">
              Stay on Track
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">
              Enable notifications to get daily reminders, budget alerts, and
              weekly summaries. We promise not to spam you!
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={handleEnableNotifications}
                className="w-full bg-accent text-white py-3.5 rounded-xl font-bold text-base hover:bg-accent-hover transition-all active:scale-[0.98] shadow-lg shadow-accent/20"
              >
                Enable Notifications
              </button>
              <button
                onClick={handleCloseModal}
                className="w-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 py-3.5 rounded-xl font-bold text-base hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                Not Now
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NotificationManager;
