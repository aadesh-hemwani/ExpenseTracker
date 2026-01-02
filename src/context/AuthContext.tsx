import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase"; // Import from your firebase setup
import { AuthContextType, User } from "../types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Login Function
  const googleSignIn = async (): Promise<void> => {
    try {
      const result: UserCredential = await signInWithPopup(
        auth,
        googleProvider
      );
      const user = result.user;

      // Check if user document exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(userRef, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          monthlyBudgetCap: 0, // Default budget
          isAdmin: false, // Default to false
        });
      } else {
        // Fetch isAdmin from existing doc
        // @ts-ignore
        user.isAdmin = userSnap.data().isAdmin;
      }
    } catch (error) {
      console.error("Error signing in: ", error);
    }
  };

  // Logout Function
  const logOut = async (): Promise<void> => {
    return signOut(auth);
  };

  // CACHE HELPER FUNCTIONS
  const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  const getCachedProfile = (uid: string): any | null => {
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

  const cacheProfile = async (
    firebaseUser: FirebaseUser
  ): Promise<any | null> => {
    try {
      // 0. Fetch latest data from Firestore
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const firestoreData = userSnap.exists() ? userSnap.data() : {};

      // 1. Fetch image as blob and convert to base64
      let photoBase64: string | null = firebaseUser.photoURL;
      if (firebaseUser.photoURL && firebaseUser.photoURL.startsWith("http")) {
        try {
          const response = await fetch(firebaseUser.photoURL);
          const blob = await response.blob();
          photoBase64 = (await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })) as string;
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
        isAdmin: firestoreData.isAdmin || false,
        monthlyBudgetCap: firestoreData.monthlyBudgetCap || 0,
        timestamp: Date.now(),
      };

      // 3. Save to storage
      localStorage.setItem(
        `user_profile_${firebaseUser.uid}`,
        JSON.stringify(cacheData)
      );
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
          // @ts-ignore - Merging firebase user with cached data
          setUser({ ...currentUser, ...cached });
          setLoading(false);

          // BREAKING CHANGE: Always verify against Firestore for critical flags (isAdmin)
          // This ensures if I manually set isAdmin in DB, it picks it up on refresh
          cacheProfile(currentUser).then((freshData) => {
            if (freshData) {
              // @ts-ignore
              setUser((prev) => ({ ...prev, ...freshData }));
            }
          });
        } else {
          // 2. Fetch/Update Cache in Background (passively) if we didn't have it
          // Or initially just set the basic currentUser and let cache build
          console.log("Fetching and caching user profile...");
          // @ts-ignore
          setUser(currentUser);
          setLoading(false);

          // Build cache
          const newCache = await cacheProfile(currentUser);
          if (newCache) {
            // @ts-ignore
            setUser((prev) => ({ ...prev, ...newCache }));
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
