import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

export interface Expense {
    id: string;
    amount: number;
    category: string;
    date: Timestamp | Date; // Depending on if it's from Firestore or local state
    description?: string;
    note?: string;
    type: 'income' | 'expense';
    userId: string;
    createdAt?: Timestamp;
}

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    accentColor: string;
    setAccentColor: (color: string) => void;
    accentColors: Record<string, { default: string; hover: string }>;
}

export interface AuthContextType {
    user: User | null;
    loading?: boolean; // Optional because we might not always use it or it might be implicit
    googleSignIn: () => Promise<void>;
    logOut: () => Promise<void>;
}

export interface User extends FirebaseUser {
    // Add any custom user properties if we extend the firebase user
    monthlyBudgetCap?: number;
    isAdmin?: boolean;
}
