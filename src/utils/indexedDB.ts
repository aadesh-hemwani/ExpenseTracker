import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Expense } from '../types';

interface MonthlyCache {
    monthKey: string;
    data: Expense[];
    total: number;
    count: number;
    timestamp: number;
}

interface ExpenseDB extends DBSchema {
    monthly_expenses: {
        key: string;
        value: MonthlyCache;
    };
}

const DB_NAME = 'ExpenseTrackerDB';
const DB_VERSION = 1;
const STORE_NAME = 'monthly_expenses';

let dbPromise: Promise<IDBPDatabase<ExpenseDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ExpenseDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'monthKey' });
                }
            },
        });
    }
    return dbPromise;
};

export const saveMonthToCache = async (
    monthKey: string,
    data: Expense[],
    total: number,
    count: number
) => {
    const db = await initDB();
    await db.put(STORE_NAME, {
        monthKey,
        data,
        total,
        count,
        timestamp: Date.now(),
    });
};

export const getMonthFromCache = async (monthKey: string): Promise<MonthlyCache | undefined> => {
    const db = await initDB();
    return await db.get(STORE_NAME, monthKey);
};

export const clearCache = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
};
