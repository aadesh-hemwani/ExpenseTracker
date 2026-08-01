import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Trie } from '../utils/trie';
import { CATEGORIES } from '../utils/uiUtils';

interface NoteTrieContextType {
  getSuggestions: (category: string, prefix: string) => string[];
  addNote: (category: string, note: string) => void;
  isReady: boolean;
}

const NoteTrieContext = createContext<NoteTrieContextType | undefined>(undefined);

export const NoteTrieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  
  // Keep a map of category -> Trie instance
  const triesRef = useRef<Record<string, Trie>>({});

  // Initialize the empty Tries
  useEffect(() => {
    CATEGORIES.forEach(cat => {
      if (!triesRef.current[cat]) {
        triesRef.current[cat] = new Trie();
      }
    });
  }, []);

  // Fetch past expenses to populate the Tries on launch
  useEffect(() => {
    if (!user?.uid) {
      setIsReady(false);
      return;
    }

    let isMounted = true;

    const buildTries = async () => {
      try {
        // Fetch up to the last 500 expenses to build a healthy suggestion list
        // without incurring massive read costs for power users
        const expensesRef = collection(db, 'users', user.uid, 'expenses');
        const q = query(expensesRef, orderBy('date', 'desc'), limit(500));
        
        const snapshot = await getDocs(q);
        
        if (isMounted) {
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.note && data.category && typeof data.note === 'string') {
              const note = data.note.trim();
              if (note && triesRef.current[data.category]) {
                triesRef.current[data.category].insert(note);
              }
            }
          });
          setIsReady(true);
        }
      } catch (err) {
        console.error("Failed to build note suggestions trie:", err);
        // Even if it fails, we set ready so the app doesn't block, 
        // it just won't have initial suggestions
        if (isMounted) setIsReady(true);
      }
    };

    buildTries();

    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  const getSuggestions = (category: string, prefix: string): string[] => {
    if (!prefix || !triesRef.current[category]) return [];
    return triesRef.current[category].searchPrefix(prefix);
  };

  const addNote = (category: string, note: string) => {
    if (note && note.trim() && triesRef.current[category]) {
      triesRef.current[category].insert(note.trim());
    }
  };

  return (
    <NoteTrieContext.Provider value={{ getSuggestions, addNote, isReady }}>
      {children}
    </NoteTrieContext.Provider>
  );
};

export const useNoteTrie = () => {
  const context = useContext(NoteTrieContext);
  if (context === undefined) {
    throw new Error('useNoteTrie must be used within a NoteTrieProvider');
  }
  return context;
};
