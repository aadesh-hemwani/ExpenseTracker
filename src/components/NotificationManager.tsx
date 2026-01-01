import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useRecentExpenses, useMonthlyStats } from "../hooks/useExpenses";
import {
  requestNotificationPermission,
  sendNotification,
} from "../utils/notificationUtils";
import { format, differenceInCalendarDays, subDays } from "date-fns";

const NotificationManager = () => {
  const { user } = useAuth();
  const { expenses } = useRecentExpenses();
  const { stats } = useMonthlyStats();
  const [budgetCap, setBudgetCap] = useState<number | null>(null);

  const getDate = (date: any): Date => {
    return date instanceof Date ? date : date.toDate();
  };

  // Initial Permission Request
  useEffect(() => {
    requestNotificationPermission();
  }, []);

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
      const sorted = [...expenses].sort((a, b) => {
        return getDate(b.date).getTime() - getDate(a.date).getTime();
      });

      let streak = 0;
      let checkDate = new Date();

      // Check if we logged today?
      const mostRecentStr = format(getDate(sorted[0].date), "yyyy-MM-dd");
      if (mostRecentStr === todayKey) {
        streak = 1;
      } else if (
        mostRecentStr === format(subDays(checkDate, 1), "yyyy-MM-dd")
      ) {
        // If we haven't logged today, but logged yesterday, streak is alive but '1' effectively for calculation
        // Actually complex to calc strict streak from loose list.
        // Simplified: Just check if we have data for Today, Yesterday, Day Before...
      }

      // Simplified Streak Logic: Count how many consecutive days back we have data for
      let currentDay = new Date();
      let streakCount = 0;
      const expenseDates = new Set(
        sorted.map((e) => format(getDate(e.date), "yyyy-MM-dd"))
      );

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
          .filter((e) => getDate(e.date) >= oneWeekAgo)
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

  return null; // Logic only component
};

export default NotificationManager;
