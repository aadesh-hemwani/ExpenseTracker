import { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    getDocs,
    Timestamp,
    writeBatch
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

export interface ChatMessage {
    id: string;
    text: string;
    sender: "user" | "ai";
    timestamp: Date;
}

export const useChatHistory = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setMessages([]);
            setLoading(false);
            return;
        }

        const chatsRef = collection(db, "users", user.uid, "chats");
        const q = query(chatsRef, orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                let timestamp = new Date(); // fallback
                if (data.timestamp instanceof Timestamp) {
                    timestamp = data.timestamp.toDate();
                } else if (data.timestamp) {
                    timestamp = new Date(data.timestamp);
                }

                return {
                    id: doc.id,
                    text: data.text,
                    sender: data.sender,
                    timestamp
                } as ChatMessage;
            });

            setMessages(fetchedMessages);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching chat history:", err);
            // Fallback: If index is still building or permissions fail, just don't crash the app
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const addMessage = useCallback(async (text: string, sender: "user" | "ai") => {
        if (!user) return;
        try {
            const chatsRef = collection(db, "users", user.uid, "chats");
            await addDoc(chatsRef, {
                text,
                sender,
                timestamp: Timestamp.now()
            });
        } catch (err) {
            console.error("Failed to add message to history:", err);
        }
    }, [user]);

    const clearHistory = useCallback(async () => {
        if (!user) return;
        try {
            const chatsRef = collection(db, "users", user.uid, "chats");
            const snapshot = await getDocs(chatsRef);

            if (snapshot.empty) return;

            const batch = writeBatch(db);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
        } catch (err) {
            console.error("Failed to clear chat history:", err);
        }
    }, [user]);

    return { messages, loading, addMessage, clearHistory };
};
