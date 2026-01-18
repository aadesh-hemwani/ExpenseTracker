import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  setDoc,
  increment,
  runTransaction,
  where,
  getDocs,
  DocumentData,
  QuerySnapshot,
  writeBatch,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { Expense } from "../types";
import { getMonthFromCache, saveMonthToCache } from "../utils/indexedDB";



export interface MonthlyStat {
  monthKey: string;
  total: number;
  count: number;
}

// --- HUB FOR ALL EXPENSE LOGIC ---



// 2. Hook for History Screen (Fetch Aggregated Stats)
export const useMonthlyStats = (userId?: string) => {
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const targetUserId = userId || user?.uid;

  useEffect(() => {
    let unsubscribe: () => void;
    let retryTimeout: NodeJS.Timeout;
    let isActive = true;

    if (!targetUserId) {
      setLoading(false);
      return;
    }

    const connect = () => {
      const statsRef = collection(db, "users", targetUserId, "stats");
      unsubscribe = onSnapshot(
        statsRef,
        (snapshot: QuerySnapshot<DocumentData>) => {
          if (!isActive) return;
          const docs = snapshot.docs.map((doc) => ({
            monthKey: doc.id,
            ...doc.data(),
          })) as MonthlyStat[];
          setStats(docs);
          setLoading(false);
        },
        (error) => {
          console.error("useMonthlyStats error:", error);
          if (isActive) {
            setLoading(false);
            // Retry after 2 seconds if not a permission denied error
            if (error.code !== "permission-denied") {
              retryTimeout = setTimeout(connect, 2000);
            }
          }
        }
      );
    };

    connect();

    return () => {
      isActive = false;
      if (unsubscribe) unsubscribe();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [targetUserId]);

  return { stats, loading };
};

// 3. Hook for fetching detailed expenses for a SPECIFIC month (On Demand)
export const useExpensesForMonth = (
  date: Date | null,
  allStats: MonthlyStat[] = [],
  statsLoaded: boolean = false,
  subscribe: boolean = true,
  userId?: string
) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useAuth();
  const targetUserId = userId || user?.uid;

  // Effect A: Real-time Subscription (Current Month Only)
  // Dependencies: user, date, subscribe. NOT stats.
  useEffect(() => {
    let isActive = true;

    if (!targetUserId || !date) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const monthKey = format(date, "yyyy-MM");
    const currentMonthKey = format(new Date(), "yyyy-MM");
    const isCurrentMonth = monthKey === currentMonthKey;

    if (subscribe && isCurrentMonth) {
      setLoading(true);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      const collectionRef = collection(db, "users", targetUserId, "expenses");
      const q = query(
        collectionRef,
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
        orderBy("date", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          if (!isActive) return;
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
          })) as Expense[];
          setExpenses(docs);
          setLoading(false);
        },
        (error) => {
          if (!isActive) return;
          console.error("Snapshot error:", error);
          setLoading(false);
        }
      );

      return () => {
        isActive = false;
        unsubscribe();
      };
    }
  }, [targetUserId, date, subscribe]);

  // Effect B: Historical Data Fetching (Past Months)
  // Dependencies: user, date, stats (to verify cache).
  useEffect(() => {
    let isActive = true;

    if (!targetUserId || !date) return;

    const monthKey = format(date, "yyyy-MM");
    const currentMonthKey = format(new Date(), "yyyy-MM");
    const isCurrentMonth = monthKey === currentMonthKey;

    // Skip if this is the current month (handled by Effect A)
    if (subscribe && isCurrentMonth) return;

    if (!statsLoaded) {
      setLoading(true);
      return;
    }

    const matchingStat = allStats.find((s) => s.monthKey === monthKey);

    const fetchHistorical = async () => {
      if (!isActive) return;
      setLoading(true);
      
      // Only clear if we are switching to a completely different month
      // This prevents flashing when merely re-validating stats (like in Home screen)
      setExpenses((prev) => {
        if (prev.length > 0 && prev[0].date) {
           const prevMonth = format(prev[0].date instanceof Date ? prev[0].date : new Date(), "yyyy-MM");
           if (prevMonth !== monthKey) return [];
        }
        return prev;
      }); 

      const isSelf = targetUserId === user?.uid;

      try {
        // A. Try Cache (Self only)
        if (isSelf && matchingStat && matchingStat.count > 0) {
          const cached = await getMonthFromCache(monthKey);
          if (
            isActive &&
            cached &&
            cached.total === matchingStat.total &&
            cached.count === matchingStat.count
          ) {
            console.log(`[Cache Hit] ${monthKey}`);
            setExpenses(cached.data);
            setLoading(false);
            return;
          }
        }

        // B. Fetch from Network
        console.log(`[Network Fetch] ${monthKey}`);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59
        );
        const collectionRef = collection(db, "users", targetUserId, "expenses");
        const q = query(
          collectionRef,
          where("date", ">=", Timestamp.fromDate(start)),
          where("date", "<=", Timestamp.fromDate(end)),
          orderBy("date", "desc")
        );

        const snapshot = await getDocs(q);
        if (!isActive) return;

        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
        })) as Expense[];

        // C. Update Cache (Self only)
        if (isSelf) {
          const trueTotal = docs.reduce((sum, e) => sum + Number(e.amount), 0);
          const trueCount = docs.length;

          await saveMonthToCache(
            monthKey,
            docs,
            matchingStat ? matchingStat.total : trueTotal,
            matchingStat ? matchingStat.count : trueCount
          );
        }

        setExpenses(docs);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        if (isActive) {
           setLoading(false);
        }
      }
    };

    fetchHistorical();

    return () => {
      isActive = false;
    };

  }, [targetUserId, date, subscribe, statsLoaded, allStats, user]); // Dependencies merged

  return { expenses, loading };
};

// 4. Global Action Hook (Add/Delete/Sync) - Exposed as 'useExpenses'
export const useExpenses = () => {
  const { user } = useAuth();

  const addExpense = useCallback(
    async (
      amount: number | string,
      category: string,
      note: string,
      customDate?: Date | string,
      icon?: string,
      iconType?: 'lucide' | 'ion' | 'emoji'
    ) => {
      if (!user) return;

      const collectionRef = collection(db, "users", user.uid, "expenses");
      const statsRef = collection(db, "users", user.uid, "stats");

      // Date Logic
      let finalDate: any = serverTimestamp(); // Default to server time
      let dateObj = new Date();

      if (customDate) {
        dateObj = new Date(customDate);
        const now = new Date();
        dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        finalDate = Timestamp.fromDate(dateObj);
      }

      const monthKey = format(dateObj, "yyyy-MM");
      const statDocRef = doc(statsRef, monthKey);

      // Create doc ref outside to get ID
      const newExpenseRef = doc(collectionRef); 

      try {
        const batch = writeBatch(db);

        // 1. Set Expense
        batch.set(newExpenseRef, {
            amount: Number(amount),
            category,
            note,
            date: finalDate,
            ...(icon && { icon }),
            ...(iconType && { iconType }),
        });

        // 2. Update Aggregated Stats (Optimistic with increment)
        batch.set(
            statDocRef,
            {
              total: increment(Number(amount)),
              count: increment(1),
            },
            { merge: true }
        );

        await batch.commit();
        return newExpenseRef.id;
      } catch (e) {
        console.error("Batch failed: ", e);
        return undefined;
      }
    },
    [user]
  );

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
      if(!user) return;
      
      const docRef = doc(db, "users", user.uid, "expenses", id);
      try {
          // Removes undefined values to avoid Firestore errors
          const sanitized = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
          );
          await setDoc(docRef, sanitized, { merge: true });
      } catch(e) {
          console.error("Failed to update expense", e);
      }
  }, [user]);

  const deleteExpense = useCallback(
    async (id: string, amount?: number, date?: Date | Timestamp) => {
      if (!user) return;

      const docRef = doc(db, "users", user.uid, "expenses", id);
      const statsRef = collection(db, "users", user.uid, "stats");

      try {
        await runTransaction(db, async (transaction) => {
          let expenseAmount = amount;
          let monthKey = "";

          if (amount !== undefined && date) {
             // OPTIMIZATION: Use passed constraints to avoid reading the doc
             // This is crucial if Read quota is exceeded
             expenseAmount = Number(amount);
             // Ensure we have a Date object
             const d = date instanceof Timestamp ? date.toDate() : (date as Date);
             monthKey = format(d, "yyyy-MM");
          } else {
             // Fallback: Read doc if we don't have details (Will fail if quota exceeded)
             const expenseDoc = await transaction.get(docRef);
             if (!expenseDoc.exists()) throw "Document does not exist!";
             const data = expenseDoc.data();
             expenseAmount = Number(data.amount);
             const dateField = data.date;
             const d = dateField instanceof Timestamp ? dateField.toDate() : new Date(dateField);
             monthKey = format(d, "yyyy-MM");
          }

          const statDocRef = doc(statsRef, monthKey);

          // 1. Delete Expense
          transaction.delete(docRef);

          // 2. Decrement Stats
          if (expenseAmount !== undefined && monthKey) {
            transaction.set(
                statDocRef,
                {
                total: increment(-expenseAmount),
                count: increment(-1),
                },
                { merge: true }
            );
          }
        });
      } catch (e) {
        console.error("Delete failed: ", e);
      }
    },
    [user]
  );

  const updateMonthlyStat = useCallback(
    async (
      monthKey: string,
      total: number,
      count: number,
      targetUserId?: string
    ) => {
      const uid = targetUserId || user?.uid;
      if (!uid) return;
      
      const statsRef = collection(db, "users", uid, "stats");
      const statDocRef = doc(statsRef, monthKey);
      try {
        await setDoc(statDocRef, { total, count }, { merge: true });
        console.log(
          `Stats updated for ${monthKey}: Total ${total}, Count ${count}`
        );
      } catch (e) {
        console.error("Failed to update stats:", e);
      }
    },
    [user]
  );

  return useMemo(() => ({
    addExpense,
    deleteExpense,
    updateMonthlyStat,
    updateExpense,
    expenses: [],
    loading: false,
  }), [addExpense, deleteExpense, updateMonthlyStat, updateExpense]);
};
