import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  Timestamp, 
  QuerySnapshot, 
  DocumentData 
} from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Expense } from "../types";
import { MonthlyStat } from "../hooks/useExpenses";

interface ExpenseContextType {
  stats: MonthlyStat[];
  currentMonthExpenses: Expense[];
  loadingStats: boolean;
  loadingCurrentMonth: boolean;
  refreshStats: () => void;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export const useExpenseData = () => {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error("useExpenseData must be used within ExpenseProvider");
  return context;
};

export const ExpenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<Expense[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCurrentMonth, setLoadingCurrentMonth] = useState(true);

  // 1. Singleton Listener for Stats
  useEffect(() => {
    if (!user?.uid) {
      setStats([]);
      setLoadingStats(false);
      return;
    }

    const statsRef = collection(db, "users", user.uid, "stats");
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        monthKey: d.id,
        ...d.data()
      })) as MonthlyStat[];
      setStats(docs);
      setLoadingStats(false);
    }, (err) => {
      console.error("Stats listener error:", err);
      setLoadingStats(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 2. Singleton Listener for Current Month Expenses
  useEffect(() => {
    if (!user?.uid) {
      setCurrentMonthExpenses([]);
      setLoadingCurrentMonth(false);
      return;
    }

    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const expensesRef = collection(db, "users", user.uid, "expenses");
    const q = query(
      expensesRef,
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
        };
      }) as Expense[];
      setCurrentMonthExpenses(docs);
      setLoadingCurrentMonth(false);
    }, (err) => {
      console.error("Current month listener error:", err);
      setLoadingCurrentMonth(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const refreshStats = useCallback(() => {
    // This is mostly handled by onSnapshot, but can be used to force UI refresh if needed
  }, []);

  const value = useMemo(() => ({
    stats,
    currentMonthExpenses,
    loadingStats,
    loadingCurrentMonth,
    refreshStats
  }), [stats, currentMonthExpenses, loadingStats, loadingCurrentMonth, refreshStats]);

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>;
};
