import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, startAfter, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { Trie } from '../utils/trie';
import { CATEGORIES } from '../utils/uiUtils';

interface NoteCache {
  lastSyncTimestamp: number;
  notes: Record<string, string[]>;
}

interface NoteTrieContextType {
  getSuggestions: (category: string, prefix: string) => string[];
  addNote: (category: string, note: string) => void;
  isReady: boolean;
}

const NoteTrieContext = createContext<NoteTrieContextType | undefined>(undefined);

export const NoteTrieProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  
  // Keep a map of category -> Trie instance and a Set of known notes
  const triesRef = useRef<Record<string, Trie>>({});
  const cachedNotesRef = useRef<Record<string, Set<string>>>({});

  // Initialize the empty Tries
  useEffect(() => {
    CATEGORIES.forEach(cat => {
      if (!triesRef.current[cat]) {
        triesRef.current[cat] = new Trie();
        cachedNotesRef.current[cat] = new Set();
      }
    });
  }, []);

  // Fetch past expenses to populate the Tries on launch
  useEffect(() => {
    if (!user?.uid) {
      triesRef.current = {};
      cachedNotesRef.current = {};
      CATEGORIES.forEach(cat => {
        triesRef.current[cat] = new Trie();
        cachedNotesRef.current[cat] = new Set();
      });
      setIsReady(false);
      return;
    }

    const cacheKey = `expense_notes_cache_${user.uid}`;

    let isMounted = true;

    const buildTries = async () => {
      try {
        const cacheRaw = localStorage.getItem(cacheKey);
        let cache: NoteCache | null = null;
        let lastSync = 0;

        if (cacheRaw) {
          try {
            cache = JSON.parse(cacheRaw);
            lastSync = cache?.lastSyncTimestamp || 0;
            // Populate tries from cache immediately for instant UI response
            if (cache?.notes) {
              Object.entries(cache.notes).forEach(([cat, notesArr]) => {
                if (triesRef.current[cat]) {
                  notesArr.forEach(n => {
                    triesRef.current[cat].insert(n);
                    cachedNotesRef.current[cat].add(n);
                  });
                }
              });
            }
          } catch (e) {
            console.error("Failed to parse note cache", e);
          }
        }

        const expensesRef = collection(db, 'users', user.uid, 'expenses');
        let newNotesCount = 0;
        let highestTimestamp = lastSync;
        
        // Track unique notes fetched in this session to update the cache
        const newlyFetchedNotes: Record<string, Set<string>> = {};

        if (lastSync > 0) {
           // Delta Sync: Only fetch expenses added since the last sync
           const q = query(
             expensesRef, 
             where("date", ">", Timestamp.fromMillis(lastSync)),
             orderBy("date", "desc")
           );
           const snapshot = await getDocs(q);
           
           if (!isMounted) return;

           snapshot.forEach(doc => {
             const data = doc.data();
             const docTime = data.date?.toMillis ? data.date.toMillis() : (data.date as Timestamp).toMillis();
             if (docTime > highestTimestamp) highestTimestamp = docTime;

             if (data.note && data.category && typeof data.note === 'string') {
               const note = data.note.trim();
               if (note && triesRef.current[data.category]) {
                 if (!cachedNotesRef.current[data.category].has(note)) {
                   triesRef.current[data.category].insert(note);
                   cachedNotesRef.current[data.category].add(note);
                   if (!newlyFetchedNotes[data.category]) newlyFetchedNotes[data.category] = new Set();
                   newlyFetchedNotes[data.category].add(note);
                   newNotesCount++;
                 }
               }
             }
           });

        } else {
           // Initial Batched Sync: Fetch all expenses in chunks of 500
           let lastDoc: any = null;
           let hasMore = true;

           while (hasMore && isMounted) {
               let q = query(expensesRef, orderBy("date", "desc"), limit(500));
               if (lastDoc) {
                   q = query(expensesRef, orderBy("date", "desc"), startAfter(lastDoc), limit(500));
               }
               
               const snapshot = await getDocs(q);
               if (snapshot.empty) {
                   hasMore = false;
                   break;
               }

               snapshot.forEach(doc => {
                   const data = doc.data();
                   const docTime = data.date?.toMillis ? data.date.toMillis() : (data.date as Timestamp).toMillis();
                   if (docTime > highestTimestamp) highestTimestamp = docTime;
                   
                   if (data.note && data.category && typeof data.note === 'string') {
                       const note = data.note.trim();
                       if (note && triesRef.current[data.category]) {
                           if (!cachedNotesRef.current[data.category].has(note)) {
                             triesRef.current[data.category].insert(note);
                             cachedNotesRef.current[data.category].add(note);
                             if (!newlyFetchedNotes[data.category]) newlyFetchedNotes[data.category] = new Set();
                             newlyFetchedNotes[data.category].add(note);
                             newNotesCount++;
                           }
                       }
                   }
               });

               lastDoc = snapshot.docs[snapshot.docs.length - 1];
               if (snapshot.docs.length < 500) {
                   hasMore = false;
               }
           }
        }

        // Update Cache if there were new notes fetched
        if (isMounted && (newNotesCount > 0 || !cache)) {
            const finalNotes: Record<string, string[]> = {};
            CATEGORIES.forEach(cat => {
                const oldNotes = cache?.notes?.[cat] || [];
                const newCatNotes = newlyFetchedNotes[cat] ? Array.from(newlyFetchedNotes[cat]) : [];
                finalNotes[cat] = Array.from(new Set([...oldNotes, ...newCatNotes]));
            });
            
            const newCache: NoteCache = {
                lastSyncTimestamp: highestTimestamp > 0 ? highestTimestamp : Date.now(),
                notes: finalNotes
            };
            localStorage.setItem(cacheKey, JSON.stringify(newCache));
        }

        if (isMounted) setIsReady(true);
      } catch (err) {
        console.error("Failed to build note suggestions trie:", err);
        // Even if it fails, we set ready so the app doesn't block
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
    const trimmed = note?.trim();
    if (!trimmed || !triesRef.current[category] || !user?.uid) return;
    
    // Check in-memory set to avoid redundant work
    if (cachedNotesRef.current[category]?.has(trimmed)) return;

    const cacheKey = `expense_notes_cache_${user.uid}`;
    
    // 1. Insert into in-memory Trie & Set
    triesRef.current[category].insert(trimmed);
    cachedNotesRef.current[category].add(trimmed);
    
    // 2. Insert into LocalStorage cache incrementally
    try {
      const cacheRaw = localStorage.getItem(cacheKey);
      let cache: NoteCache = { lastSyncTimestamp: Date.now(), notes: {} };
      if (cacheRaw) {
        cache = JSON.parse(cacheRaw) as NoteCache;
      }
      
      if (!cache.notes[category]) cache.notes[category] = [];
      
      if (!cache.notes[category].includes(trimmed)) {
        cache.notes[category].push(trimmed);
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      }
    } catch (e) {
      // fail silently if storage quota exceeded or parse fails
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
