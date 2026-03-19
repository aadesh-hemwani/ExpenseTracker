import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

export interface Event {
    id: string;
    name: string;
    startDate: Timestamp | Date;
    endDate: Timestamp | Date;
    budget?: number;
    createdAt?: Timestamp;
}

export interface Expense {
    id: string;
    amount: number;
    category: string;
    date: Timestamp | Date;
    note?: string;
    /** @deprecated Use context + contextId instead. Kept for backward compatibility. */
    type?: 'Regular' | 'One-off';
    /** 'personal' | 'event'. Missing means 'personal' (backward compat). */
    context?: 'personal' | 'event';
    /** For personal: 'regular' | 'one-off'. For event: eventId. Missing defaults based on type field. */
    contextId?: string;
    userId: string;
    createdAt?: Timestamp;
    embedding?: number[];
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
