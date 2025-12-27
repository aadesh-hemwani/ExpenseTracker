import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore'; // Added Timestamp
import { useAuth } from '../context/AuthContext';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      return;
    }

    const collectionRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(collectionRef, orderBy('date', 'desc'));

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

  // UPDATED: Now accepts a 'customDate' argument
  const addExpense = async (amount, category, note, customDate) => {
    if (!user) return;
    
    const collectionRef = collection(db, 'users', user.uid, 'expenses');
    
    // Convert string date (YYYY-MM-DD) to Firestore Timestamp
    // We add the current time to the selected date so it doesn't default to midnight
    let finalDate = serverTimestamp();
    
    if (customDate) {
      const now = new Date();
      const selected = new Date(customDate);
      // Keep the selected date but use current time for sorting accuracy
      selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
      finalDate = Timestamp.fromDate(selected);
    }

    await addDoc(collectionRef, {
      amount: Number(amount),
      category,
      note,
      date: finalDate
    });
  };

  return { expenses, loading, addExpense };
};