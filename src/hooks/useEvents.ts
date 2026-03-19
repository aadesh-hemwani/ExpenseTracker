import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  writeBatch,
  QuerySnapshot,
  DocumentData,
  where,
  increment,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Event } from "../types";
import { format } from "date-fns";

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Real-time listener on events collection
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const eventsRef = collection(db, "users", user.uid, "events");
    const q = query(eventsRef, orderBy("startDate", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Event[];
        setEvents(docs);
        setLoading(false);
      },
      (error) => {
        console.error("useEvents error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const addEvent = useCallback(
    async (
      name: string,
      startDate: Date,
      endDate: Date,
      budget?: number
    ): Promise<string | undefined> => {
      if (!user?.uid) return;

      const eventsRef = collection(db, "users", user.uid, "events");
      try {
        const docRef = await addDoc(eventsRef, {
          name,
          startDate: Timestamp.fromDate(startDate),
          endDate: Timestamp.fromDate(endDate),
          ...(budget !== undefined && { budget }),
          createdAt: serverTimestamp(),
        });
        return docRef.id;
      } catch (e) {
        console.error("Failed to add event:", e);
        return undefined;
      }
    },
    [user?.uid]
  );

  const updateEvent = useCallback(
    async (id: string, updates: Partial<Omit<Event, "id">>) => {
      if (!user?.uid) return;

      const eventRef = doc(db, "users", user.uid, "events", id);
      try {
        // Convert any Date fields to Timestamps
        const data: Record<string, any> = { ...updates };
        if (updates.startDate instanceof Date) {
          data.startDate = Timestamp.fromDate(updates.startDate);
        }
        if (updates.endDate instanceof Date) {
          data.endDate = Timestamp.fromDate(updates.endDate);
        }
        await updateDoc(eventRef, data);
      } catch (e) {
        console.error("Failed to update event:", e);
      }
    },
    [user?.uid]
  );

  /**
   * Delete an event.
   * - action "move": reassigns all expenses under this event to the given targetContextId (e.g. 'regular' for personal regular)
   * - action "delete": deletes all expenses under this event, decrementing stats accordingly
   */
  const deleteEvent = useCallback(
    async (
      eventId: string,
      action: "move" | "delete",
      targetContext?: "personal",
      targetContextId?: string // 'regular' | 'one-off' | another eventId
    ) => {
      if (!user?.uid) return;

      const eventRef = doc(db, "users", user.uid, "events", eventId);
      const expensesRef = collection(db, "users", user.uid, "expenses");

      // Find all expenses under this event
      const expensesQuery = query(
        expensesRef,
        where("context", "==", "event"),
        where("contextId", "==", eventId)
      );

      try {
        const snapshot = await getDocs(expensesQuery);

        const batch = writeBatch(db);

        if (action === "move" && targetContextId) {
          // Move all expenses to the target context
          snapshot.docs.forEach((d) => {
            batch.update(d.ref, {
              context: targetContext || "personal",
              contextId: targetContextId,
              // Also keep type for backward compat
              type:
                targetContextId === "one-off" ? "One-off" : "Regular",
            });
          });
        } else {
          // Delete all expenses and decrement stats
          const statsRef = collection(db, "users", user.uid, "stats");

          snapshot.docs.forEach((d) => {
            const data = d.data();
            const amount = Number(data.amount);
            const dateField = data.date;
            const dateObj =
              dateField instanceof Timestamp
                ? dateField.toDate()
                : new Date(dateField);
            const monthKey = format(dateObj, "yyyy-MM");
            const statDocRef = doc(statsRef, monthKey);

            batch.delete(d.ref);
            batch.set(
              statDocRef,
              {
                total: increment(-amount),
                count: increment(-1),
              },
              { merge: true }
            );
          });
        }

        // Delete the event itself
        batch.delete(eventRef);

        await batch.commit();
      } catch (e) {
        console.error("Failed to delete event:", e);
      }
    },
    [user?.uid]
  );

  return { events, loading, addEvent, updateEvent, deleteEvent };
};
