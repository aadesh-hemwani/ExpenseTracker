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
  getDoc,
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
import { format, isSameMonth } from "date-fns";
import { Expense } from "../types";
import { useExpenseData } from "../context/ExpenseContext";
import { getMonthFromCache, saveMonthToCache, updateExpenseInCache, deleteMonthFromCache } from "../utils/indexedDB";
import { generateEmbedding } from "../services/gemini";

export interface MonthlyStat {
  monthKey: string;
  total: number;
  count: number;
}

// 2. Hook for History Screen (Fetch Aggregated Stats)
export const useMonthlyStats = (userId?: string) => {
  const { user } = useAuth();
  const { stats: globalStats, loadingStats: globalLoading } = useExpenseData();
  
  // If it's the current user, use the centralized data
  const isSelf = !userId || userId === user?.uid;

  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isSelf) {
        setStats(globalStats);
        setLoading(globalLoading);
        return;
    }

    // Fallback for OTHER users (e.g. admin viewing someone else)
    let unsubscribe: (() => void) | undefined;
    const statsRef = collection(db, "users", userId!, "stats");
    unsubscribe = onSnapshot(statsRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ monthKey: d.id, ...d.data() })) as MonthlyStat[];
      setStats(docs);
      setLoading(false);
    });

    return () => unsubscribe?.();
  }, [userId, isSelf, globalStats, globalLoading]);

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

  const { currentMonthExpenses: globalExpenses, loadingCurrentMonth: globalLoading } = useExpenseData();

  // Effect A: Centralized Data (Current Month Only)
  useEffect(() => {
    if (!targetUserId || !date) return;

    const isSelf = targetUserId === user?.uid;
    if (!isSelf || !subscribe) return;

    const isToday = isSameMonth(date, new Date());
    if (isToday) {
      setExpenses(globalExpenses);
      setLoading(globalLoading);
    }
  }, [targetUserId, date, subscribe, globalExpenses, globalLoading, user?.uid]);

  // Effect B: Historical Data Fetching (Past Months)
  useEffect(() => {
    let isActive = true;

    if (!targetUserId || !date) return;

    const monthKey = format(date, "yyyy-MM");
    const currentMonthKey = format(new Date(), "yyyy-MM");
    const isCurrentMonth = monthKey === currentMonthKey;

    if (subscribe && isCurrentMonth) return;

    if (!statsLoaded) {
      setLoading(true);
      return;
    }

    const matchingStat = allStats.find((s) => s.monthKey === monthKey);

    const fetchHistorical = async () => {
      if (!isActive) return;
      setLoading(true);

      setExpenses((prev) => {
        if (prev.length > 0 && prev[0].date) {
          const prevMonth = format(prev[0].date instanceof Date ? prev[0].date : new Date(), "yyyy-MM");
          if (prevMonth !== monthKey) return [];
        }
        return prev;
      });

      const isSelf = targetUserId === user?.uid;

      try {
        if (isSelf && matchingStat && matchingStat.count > 0) {
          const cached = await getMonthFromCache(monthKey);
          if (
            isActive &&
            cached &&
            cached.total === matchingStat.total &&
            cached.count === matchingStat.count
          ) {
            setExpenses(cached.data);
            setLoading(false);
            return;
          }
        }

        if (!navigator.onLine) {
          setLoading(false);
          return;
        }

        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        const collectionRef = collection(db, "users", targetUserId, "expenses");
        const q = query(
          collectionRef,
          where("date", ">=", Timestamp.fromDate(start)),
          where("date", "<=", Timestamp.fromDate(end)),
          orderBy("date", "desc")
        );

        const snapshot = await getDocs(q);
        if (!isActive) return;

        const docs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          };
        }) as Expense[];

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
  }, [targetUserId, date, subscribe, statsLoaded, allStats, user?.uid]);

  // Effect C: Listen for local updates
  useEffect(() => {
    const handleLocalUpdate = (e: CustomEvent<{ id: string; updates: Partial<Expense> }>) => {
       const { id, updates } = e.detail;
       setExpenses(prev => prev.map(exp => {
           if (exp.id === id) {
               const newExp = { ...exp, ...updates };
               if (updates.date) {
                   newExp.date = updates.date instanceof Timestamp ? updates.date.toDate() : new Date(updates.date);
               }
               return newExp;
           }
           return exp;
       }));
    };
    window.addEventListener('local_expense_update', handleLocalUpdate as EventListener);
    return () => window.removeEventListener('local_expense_update', handleLocalUpdate as EventListener);
  }, []);

  return { expenses, loading };
};

// 3.5. Hook for fetching RECENT expenses based on time range
export const useRecentExpenses = (monthsLookback: number = 1, userId?: string) => {
  const { user } = useAuth();
  const { currentMonthExpenses: globalExpenses, loadingCurrentMonth: globalLoading } = useExpenseData();
  const isSelf = !userId || userId === user?.uid;
  const targetUserId = userId || user?.uid;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isSelf && monthsLookback === 1) {
      setExpenses(globalExpenses);
      setLoading(globalLoading);
      return;
    }

    if (!targetUserId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const collectionRef = collection(db, "users", targetUserId, "expenses");

    let q;
    if (monthsLookback === -1) {
      q = query(collectionRef, orderBy("date", "desc"));
    } else {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsLookback, 1);
      startDate.setHours(0, 0, 0, 0);

      q = query(
        collectionRef,
        where("date", ">=", Timestamp.fromDate(startDate)),
        orderBy("date", "desc")
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
          };
        }) as Expense[];
        setExpenses(docs);
        setLoading(false);
      },
      (error) => {
        console.error("useRecentExpenses error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetUserId, monthsLookback, isSelf, globalExpenses, globalLoading]);

  return { expenses, loading };
};

// 4. Global Action Hook
export const useExpenses = () => {
  const { user } = useAuth();

  const addExpense = useCallback(
    async (
      amount: number | string,
      category: string,
      note: string,
      customDate?: Date | string,
      icon?: string,
      iconType?: 'lucide' | 'ion' | 'emoji',
      type?: 'Regular' | 'One-off',
      context?: 'personal' | 'event',
      contextId?: string
    ) => {
      if (!user) return;

      const collectionRef = collection(db, "users", user.uid, "expenses");
      const statsRef = collection(db, "users", user.uid, "stats");

      let dateObj = new Date();
      let finalDate: Timestamp | ReturnType<typeof serverTimestamp> = serverTimestamp();

      if (customDate) {
        dateObj = new Date(customDate);
        finalDate = Timestamp.fromDate(dateObj);
      }

      const monthKey = format(dateObj, "yyyy-MM");
      const statDocRef = doc(statsRef, monthKey);
      const newExpenseRef = doc(collectionRef);

      const resolvedContext = context || 'personal';
      const resolvedContextId = contextId || (type === 'One-off' ? 'one-off' : 'regular');

      try {
        const batch = writeBatch(db);

        const expenseData: any = {
          amount: Number(amount),
          category,
          note,
          date: finalDate,
          ...(icon && { icon }),
          ...(iconType && { iconType }),
          type: type || 'Regular',
          context: resolvedContext,
          contextId: resolvedContextId,
        };

        batch.set(newExpenseRef, expenseData);
        batch.set(statDocRef, { total: increment(Number(amount)), count: increment(1) }, { merge: true });

        // Commit batch in the background without awaiting, making this write INSTANT and fully offline-friendly
        batch.commit().catch((err) => {
          console.error("Background add batch commit failed:", err);
          alert("Failed to save expense to the server. Your change is saved locally but may not sync. Error: " + err.message);
        });

        // Generate and update embedding asynchronously in the background if the user is online
        if (navigator.onLine) {
          const expenseString = `Spent ${amount} on ${category} on ${format(dateObj, "yyyy-MM-dd")}. Note: ${note}`;
          generateEmbedding(expenseString).then((embedding) => {
            if (embedding && user?.uid) {
              const docToUpdate = doc(db, "users", user.uid, "expenses", newExpenseRef.id);
              setDoc(docToUpdate, { embedding }, { merge: true }).catch(err => {
                console.error("Failed to update background embedding:", err);
              });
            }
          }).catch(err => {
            console.error("Background embedding generation error:", err);
          });
        }

        return newExpenseRef.id;
      } catch (e) {
        console.error("Failed to save expense: ", e);
        return undefined;
      }
    },
    [user]
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Expense>, oldExpense?: Expense) => {
      if (!user) return;

      const docRef = doc(db, "users", user.uid, "expenses", id);
      const statsRef = collection(db, "users", user.uid, "stats");

      try {
        let currentData: any = oldExpense;
        if (!currentData) {
          // Fallback: fetch from firestore (works offline using local cache)
          const expenseDoc = await getDoc(docRef);
          if (!expenseDoc.exists()) throw new Error("Expense document does not exist!");
          currentData = expenseDoc.data();
        }

        const oldAmount = Number(currentData.amount);
        const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldAmount;
        const amountChanged = oldAmount !== newAmount;

        let oldDateObj = currentData.date instanceof Timestamp 
          ? currentData.date.toDate() 
          : (currentData.date instanceof Date ? currentData.date : new Date(currentData.date));
        const oldMonthKey = format(oldDateObj, "yyyy-MM");

        let newMonthKey = oldMonthKey;
        let dateChanged = false;
        let finalNewDate = currentData.date;

        if (updates.date) {
          const newDateObj = updates.date instanceof Timestamp 
            ? updates.date.toDate() 
            : (updates.date instanceof Date ? updates.date : new Date(updates.date));
          newMonthKey = format(newDateObj, "yyyy-MM");
          dateChanged = oldMonthKey !== newMonthKey;
          finalNewDate = updates.date;
        }

        const batch = writeBatch(db);

        if (amountChanged || dateChanged) {
          const oldStatDocRef = doc(statsRef, oldMonthKey);
          const newStatDocRef = doc(statsRef, newMonthKey);

          if (dateChanged) {
            batch.set(oldStatDocRef, { total: increment(-oldAmount), count: increment(-1) }, { merge: true });
            batch.set(newStatDocRef, { total: increment(newAmount), count: increment(1) }, { merge: true });
          } else if (amountChanged) {
            const diff = newAmount - oldAmount;
            if (diff !== 0) {
              batch.set(oldStatDocRef, { total: increment(diff) }, { merge: true });
            }
          }
        }

        const sanitized = Object.fromEntries(
          Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        if (updates.date !== undefined) sanitized.date = finalNewDate;

        batch.set(docRef, sanitized, { merge: true });

        // Commit batch in the background without awaiting, making this write INSTANT and fully offline-friendly
        batch.commit().catch((err) => {
          console.error("Background update batch commit failed:", err);
          alert("Failed to update expense on the server. Error: " + err.message);
        });

        // Update local IndexedDB caches & dispatch custom event immediately for instant UI response
        if (oldMonthKey === newMonthKey) {
          updateExpenseInCache(oldMonthKey, id, sanitized).catch(e => console.error(e));
        } else {
          deleteMonthFromCache(oldMonthKey).catch(e => console.error(e));
          deleteMonthFromCache(newMonthKey).catch(e => console.error(e));
        }
        window.dispatchEvent(new CustomEvent('local_expense_update', { detail: { id, updates: sanitized } }));

      } catch (e) {
        console.error("Failed to update expense", e);
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
        let expenseAmount = amount;
        let monthKey = "";

        if (expenseAmount !== undefined && date) {
          expenseAmount = Number(amount);
          const d = date instanceof Timestamp ? date.toDate() : (date as Date);
          monthKey = format(d, "yyyy-MM");
        } else {
          // Fallback: fetch document (works offline using cache)
          const expenseDoc = await getDoc(docRef);
          if (expenseDoc.exists()) {
            const data = expenseDoc.data();
            expenseAmount = Number(data.amount);
            const d = data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date);
            monthKey = format(d, "yyyy-MM");
          }
        }

        const batch = writeBatch(db);
        batch.delete(docRef);
        if (expenseAmount !== undefined && monthKey) {
          const statDocRef = doc(statsRef, monthKey);
          batch.set(statDocRef, { total: increment(-expenseAmount), count: increment(-1) }, { merge: true });
        }

        // Commit batch in the background without awaiting, making this write INSTANT and fully offline-friendly
        batch.commit().catch((err) => {
          console.error("Background delete batch commit failed:", err);
          alert("Failed to delete expense on the server. Error: " + err.message);
        });

      } catch (e) {
        console.error("Delete failed: ", e);
      }
    },
    [user]
  );

  const updateMonthlyStat = useCallback(
    async (monthKey: string, total: number, count: number, targetUserId?: string) => {
      const uid = targetUserId || user?.uid;
      if (!uid) return;

      const statsRef = collection(db, "users", uid, "stats");
      const statDocRef = doc(statsRef, monthKey);
      try {
        await setDoc(statDocRef, { total, count }, { merge: true });
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

