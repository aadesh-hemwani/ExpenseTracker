import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase'; // Import from your firebase setup

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login Function
  const googleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user document exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          monthlyBudgetCap: 0 // Default budget
        });
      }
    } catch (error) {
      console.error("Error signing in: ", error);
    }
  };

  // Logout Function
  const logOut = () => {
    return signOut(auth);
  };

  // CACHE HELPER FUNCTIONS
  const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  const getCachedProfile = (uid) => {
    try {
      const stored = localStorage.getItem(`user_profile_${uid}`);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        return parsed;
      }
      return null; // Expired
    } catch (e) {
      console.warn("Failed to parse user cache", e);
      return null;
    }
  };

  const cacheProfile = async (firebaseUser) => {
    try {
      // 1. Fetch image as blob and convert to base64
      let photoBase64 = firebaseUser.photoURL;
      if (firebaseUser.photoURL && firebaseUser.photoURL.startsWith('http')) {
        try {
          const response = await fetch(firebaseUser.photoURL);
          const blob = await response.blob();
          photoBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fetchErr) {
          console.error("Failed to fetch/convert profile image", fetchErr);
          // Fallback to original URL if fetch fails
        }
      }

      // 2. Create cache object
      const cacheData = {
        displayName: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: photoBase64,
        uid: firebaseUser.uid,
        timestamp: Date.now()
      };

      // 3. Save to storage
      localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(cacheData));
      return cacheData;
    } catch (e) {
      console.error("Failed to cache profile", e);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 1. Check Cache First
        const cached = getCachedProfile(currentUser.uid);

        if (cached) {
          // Use cached data immediately
          console.log("Using cached user profile");
          setUser({ ...currentUser, ...cached });
          setLoading(false);
        } else {
          // 2. Fetch/Update Cache in Background (passively) if we didn't have it
          // Or initially just set the basic currentUser and let cache build
          console.log("Fetching and caching user profile...");
          setUser(currentUser);
          setLoading(false);

          // Build cache
          const newCache = await cacheProfile(currentUser);
          if (newCache) {
            setUser(prev => ({ ...prev, ...newCache }));
          }
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, googleSignIn, logOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};