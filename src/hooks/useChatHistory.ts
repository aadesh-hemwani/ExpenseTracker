import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../firebase";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    getDocs,
    Timestamp,
    writeBatch,
    QuerySnapshot,
    DocumentData
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
        if (!user?.uid) {
            setMessages([]);
            setLoading(false);
            return;
        }

        const chatsRef = collection(db, "users", user.uid, "chats");
        const q = query(chatsRef, orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const fetchedMessages = snapshot.docs.map(doc => {
                const data = doc.data();
                let timestamp = new Date();
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
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const addMessage = useCallback(async (text: string, sender: "user" | "ai") => {
        if (!user?.uid) return;
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
    }, [user?.uid]);

    const clearHistory = useCallback(async () => {
        if (!user?.uid) return;
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
    }, [user?.uid]);

    return useMemo(() => ({
        messages,
        loading,
        addMessage,
        clearHistory
    }), [messages, loading, addMessage, clearHistory]);
};

