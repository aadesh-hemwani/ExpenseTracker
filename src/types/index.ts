import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

export interface Expense {
    id: string;
    amount: number;
    category: string;
    date: Timestamp | Date;
    note?: string;
    type?: 'Regular' | 'One-off';
    userId: string;
    createdAt?: Timestamp;
}

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    accentColor: string;
    setAccentColor: (color: string) => void;
    accentColors: Record<string, { name: string; default: string; hover: string }>;
}

export interface AuthContextType {
    user: User | null;
    loading?: boolean;
    googleSignIn: () => Promise<void>;
    logOut: () => Promise<void>;
}

export interface User extends FirebaseUser {
    monthlyBudgetCap?: number;
    isAdmin?: boolean;
}
