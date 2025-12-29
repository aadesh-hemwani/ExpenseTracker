import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  doc,
  setDoc,
  increment,
  runTransaction,
  writeBatch,
  where,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

// --- FILE LEVEL CACHE ---
const expensesCache = {}; // Format: { "yyyy-MM": { data: [], validation: { total: 0, count: 0 } } }

// --- HUB FOR ALL EXPENSE LOGIC ---

// 1. Hook for Home Screen (Limit to recent 20)
export const useRecentExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    const collectionRef = collection(db, 'users', user.uid, 'expenses');
    // Limit to 20 for performance on home screen
    const q = query(collectionRef, orderBy('date', 'desc'), limit(20));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));
      setExpenses(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { expenses, loading };
};

// 2. Hook for History Screen (Fetch Aggregated Stats)
export const useMonthlyStats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const statsRef = collection(db, 'users', user.uid, 'stats');
    // Listen to the stats collection (small docs, very cheap)
    const unsubscribe = onSnapshot(statsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        monthKey: doc.id, // "2023-12"
        ...doc.data()
      }));
      setStats(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { stats, loading };
};

// 3. Hook for fetching detailed expenses for a SPECIFIC month (On Demand)
// 3. Hook for fetching detailed expenses for a SPECIFIC month (On Demand)
export const useExpensesForMonth = (date, allStats = []) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !date) {
      setExpenses([]);
      return;
    }

    const monthKey = format(date, 'yyyy-MM');
    const currentMonthKey = format(new Date(), 'yyyy-MM');
    const isPastMonth = monthKey < currentMonthKey; // Actually, strictly just != current is probably safer for "static" assumption, but logic holds.

    // If it's the CURRENT month, we want REAL-TIME updates (onSnapshot) always.
    if (monthKey === currentMonthKey) {
      // ... existing onSnapshot logic ...
      setLoading(true);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const collectionRef = collection(db, 'users', user.uid, 'expenses');
      const q = query(
        collectionRef,
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate()
        }));
        setExpenses(docs);
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // PAST MONTHS: Attempt Cache with Validation
      const cached = expensesCache[monthKey];
      const matchingStat = allStats.find(s => s.monthKey === monthKey);

      // Validate Cache
      let isValid = false;
      if (cached && matchingStat) {
        // Check if cached validation tokens match current real-time stats
        if (cached.validation.total === matchingStat.total && cached.validation.count === matchingStat.count) {
          isValid = true;
        }
      } else if (cached && !matchingStat) {
        // Edge case: Maybe stats haven't loaded yet? Or month has no stats?
        // If month has no stats (empty), cache should probably be empty too.
        // For safety, if we have cache but no current stats to verify, we might trust cache OR refetch.
        // Let's assume if we lack stats, we refetch to be safe.
        isValid = false;
      }

      if (isValid) {
        console.log(`[Cache Hit] Serving ${monthKey} from memory.`);
        setExpenses(cached.data);
        setLoading(false);
        return; // No subscription needed
      }

      // Cache Miss or Invalid -> Fetch Once
      console.log(`[Cache Miss] Fetching ${monthKey}...`);
      setLoading(true);

      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      const collectionRef = collection(db, 'users', user.uid, 'expenses');
      const q = query(
        collectionRef,
        where('date', '>=', Timestamp.fromDate(start)),
        where('date', '<=', Timestamp.fromDate(end)),
        orderBy('date', 'desc')
      );

      getDocs(q).then((snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate()
        }));

        // Update Cache (only if we have validation data to lock it)
        if (matchingStat) {
          expensesCache[monthKey] = {
            data: docs,
            validation: { total: matchingStat.total, count: matchingStat.count }
          };
        }

        setExpenses(docs);
        setLoading(false);
      });
    }

  }, [user, date, allStats]); // Re-run if stats change (this ensures auto-invalidation if someone else adds expense!)

  return { expenses, loading };
};

// 4. Global Action Hook (Add/Delete/Sync) - Exposed as 'useExpenses' for backward compatibility
export const useExpenses = () => {
  const { user } = useAuth();

  // Backward compatibility signatures (will check if they are still needed)
  // For now, we return the actions.

  const addExpense = useCallback(async (amount, category, note, customDate) => {
    if (!user) return;

    const collectionRef = collection(db, 'users', user.uid, 'expenses');
    const statsRef = collection(db, 'users', user.uid, 'stats');

    // Date Logic
    let finalDate = serverTimestamp(); // Default to server time
    let dateObj = new Date();

    if (customDate) {
      dateObj = new Date(customDate);
      const now = new Date();
      dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      finalDate = Timestamp.fromDate(dateObj);
    }

    const monthKey = format(dateObj, 'yyyy-MM');
    const statDocRef = doc(statsRef, monthKey);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Add to Expenses Collection
        // Note: We can't use 'addDoc' in a transaction easily for the generated ID in one step if we want to reference it,
        // but for a simple "fire and forget" with stats update, we can generate a ref first.
        const newExpenseRef = doc(collectionRef);

        transaction.set(newExpenseRef, {
          amount: Number(amount),
          category,
          note,
          date: finalDate
        });

        // 2. Update Aggregated Stats
        transaction.set(statDocRef, {
          total: increment(Number(amount)),
          count: increment(1)
        }, { merge: true });
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  }, [user]);

  const deleteExpense = useCallback(async (id, amount, date) => {
    if (!user) return;
    // We need amount and date to update the stats correctly. 
    // If not passed, we might need to fetch the doc first.
    // For now, let's assume we fetch if missing or UI passes it.

    // UI Simplification: The UI calls deleteExpense(id). It usually has the expense object.
    // Let's change the signature or fetch inside.

    // FETCH FIRST METHOD (Safe)
    const docRef = doc(db, 'users', user.uid, 'expenses', id);
    const statsRef = collection(db, 'users', user.uid, 'stats');

    try {
      await runTransaction(db, async (transaction) => {
        const expenseDoc = await transaction.get(docRef);
        if (!expenseDoc.exists()) throw "Document does not exist!";

        const expenseData = expenseDoc.data();
        const expenseAmount = Number(expenseData.amount);
        const expenseDate = expenseData.date.toDate(); // Firestore timestamp to JS Date
        const monthKey = format(expenseDate, 'yyyy-MM');
        const statDocRef = doc(statsRef, monthKey);

        // 1. Delete Expense
        transaction.delete(docRef);

        // 2. Decrement Stats
        transaction.set(statDocRef, {
          total: increment(-expenseAmount),
          count: increment(-1)
        }, { merge: true });
      });
    } catch (e) {
      console.error("Delete failed: ", e);
    }
  }, [user]);

  const updateMonthlyStat = useCallback(async (monthKey, total, count) => {
    if (!user) return;
    const statsRef = collection(db, 'users', user.uid, 'stats');
    const statDocRef = doc(statsRef, monthKey);
    try {
      await setDoc(statDocRef, { total, count }, { merge: true });
      console.log(`Stats updated for ${monthKey}: Total ${total}, Count ${count}`);
    } catch (e) {
      console.error("Failed to update stats:", e);
    }
  }, [user]);

  return {
    addExpense,
    deleteExpense,
    updateMonthlyStat,
    // Keep 'expenses' and 'loading' for backward compatibility if needed,
    // but better to force migration.
    // We'll return empty arrays for compatibility to prevent crashes until we update UI.
    expenses: [],
    loading: false
  };
};