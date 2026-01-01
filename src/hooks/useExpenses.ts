import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
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
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { Expense } from "../types";

// --- FILE LEVEL CACHE ---
interface CacheData {
  data: Expense[];
  validation: { total: number; count: number };
}
const expensesCache: Record<string, CacheData> = {}; // Format: { "yyyy-MM": { data: [], validation: { total: 0, count: 0 } } }

export interface MonthlyStat {
  monthKey: string;
  total: number;
  count: number;
}

// --- HUB FOR ALL EXPENSE LOGIC ---

// 1. Hook for Home Screen (Limit to recent 20)
export const useRecentExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    const collectionRef = collection(db, "users", user.uid, "expenses");
    // Limit to 20 for performance on home screen
    const q = query(collectionRef, orderBy("date", "desc"), limit(20));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
        })) as Expense[];
        setExpenses(docs);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { expenses, loading };
};

// 2. Hook for History Screen (Fetch Aggregated Stats)
export const useMonthlyStats = () => {
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const statsRef = collection(db, "users", user.uid, "stats");
    // Listen to the stats collection (small docs, very cheap)
    const unsubscribe = onSnapshot(
      statsRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map((doc) => ({
          monthKey: doc.id, // "2023-12"
          ...doc.data(),
        })) as MonthlyStat[];
        setStats(docs);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  return { stats, loading };
};

// 3. Hook for fetching detailed expenses for a SPECIFIC month (On Demand)
export const useExpensesForMonth = (
  date: Date | null,
  allStats: MonthlyStat[] = [],
  statsLoaded: boolean = false
) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !date) {
      setExpenses([]);
      return;
    }

    const monthKey = format(date, "yyyy-MM");
    const currentMonthKey = format(new Date(), "yyyy-MM");

    // If it's the CURRENT month, we want REAL-TIME updates (onSnapshot) always.
    if (monthKey === currentMonthKey) {
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

      const collectionRef = collection(db, "users", user.uid, "expenses");
      const q = query(
        collectionRef,
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
        orderBy("date", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
          })) as Expense[];
          setExpenses(docs);
          setLoading(false);
        }
      );
      return unsubscribe;
    } else {
      // OPTIMIZATION 1: Wait for stats to load before deciding to fetch past months
      if (!statsLoaded) {
        // If stats aren't loaded yet, we can't efficiently decide if we should fetch.
        // Keep loading state until stats arrive.
        setLoading(true);
        return;
      }

      // PAST MONTHS: Attempt Cache with Validation
      const cached = expensesCache[monthKey];
      const matchingStat = allStats.find((s) => s.monthKey === monthKey);

      // OPTIMIZATION 2: If stats are loaded, but no stat exists for this month, it means 0 expenses.
      if (!matchingStat) {
        console.log(`[Optimization] No stats for ${monthKey}, skipping fetch.`);
        setExpenses([]);
        setLoading(false);
        return;
      }

      // Validate Cache
      let isValid = false;
      if (cached) {
        // Check if cached validation tokens match current real-time stats
        // Since we KNOW matchingStat exists here (checked above), we can compare safely
        if (
          cached.validation.total === matchingStat.total &&
          cached.validation.count === matchingStat.count
        ) {
          isValid = true;
        }
      }

      if (isValid) {
        console.log(`[Cache Hit] Serving ${monthKey} from memory.`);
        setExpenses(cached!.data);
        setLoading(false);
        return; // No subscription needed
      }

      // Cache Miss -> Fetch Once
      console.log(`[Cache Miss] Fetching ${monthKey}...`);
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
      const collectionRef = collection(db, "users", user.uid, "expenses");
      const q = query(
        collectionRef,
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
        orderBy("date", "desc")
      );

      getDocs(q)
        .then((snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            date: doc.data().date?.toDate(),
          })) as Expense[];

          // Update Cache (only if we have validation data to lock it)
          if (matchingStat) {
            expensesCache[monthKey] = {
              data: docs,
              validation: {
                total: matchingStat.total,
                count: matchingStat.count,
              },
            };
          }

          setExpenses(docs);
          setLoading(false);
        })
        .catch((e) => {
          console.error("Fetch failed", e);
          setLoading(false);
        });
    }
  }, [user, date, allStats, statsLoaded]); // Re-run if stats change or load

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
      customDate?: Date | string
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

      try {
        await runTransaction(db, async (transaction) => {
          // 1. Add to Expenses Collection
          const newExpenseRef = doc(collectionRef);

          transaction.set(newExpenseRef, {
            amount: Number(amount),
            category,
            note,
            date: finalDate,
          });

          // 2. Update Aggregated Stats
          transaction.set(
            statDocRef,
            {
              total: increment(Number(amount)),
              count: increment(1),
            },
            { merge: true }
          );
        });
      } catch (e) {
        console.error("Transaction failed: ", e);
      }
    },
    [user]
  );

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
             // @ts-ignore
             const d = date.toDate ? date.toDate() : date;
             monthKey = format(d, "yyyy-MM");
          } else {
             // Fallback: Read doc if we don't have details (Will fail if quota exceeded)
             const expenseDoc = await transaction.get(docRef);
             if (!expenseDoc.exists()) throw "Document does not exist!";
             const data = expenseDoc.data();
             expenseAmount = Number(data.amount);
             // @ts-ignore
             monthKey = format(data.date.toDate(), "yyyy-MM");
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
    async (monthKey: string, total: number, count: number) => {
      if (!user) return;
      const statsRef = collection(db, "users", user.uid, "stats");
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

  return {
    addExpense,
    deleteExpense,
    updateMonthlyStat,
    expenses: [],
    loading: false,
  };
};
