import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Expense } from "../types";

type ModalMode = "add" | "view" | "edit";

interface GlobalModalContextType {
    isOpen: boolean;
    mode: ModalMode;
    expenseData: Expense | null;
    openModal: (mode?: ModalMode, data?: Expense | null) => void;
    closeModal: () => void;
    setMode: (mode: ModalMode) => void;
    updateExpenseData: (data: Partial<Expense>) => void;
}

const GlobalModalContext = createContext<GlobalModalContextType | undefined>(undefined);

export const GlobalModalProvider = ({ children }: { children: ReactNode }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setModeState] = useState<ModalMode>("add");
    const [expenseData, setExpenseData] = useState<Expense | null>(null);

    const openModal = useCallback((newMode: ModalMode = "add", data: Expense | null = null) => {
        setModeState(newMode);
        setExpenseData(data);
        setIsOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsOpen(false);
        // slight delay to clear data for animation, or clear immediately if needed
        setTimeout(() => {
            setModeState("add");
            setExpenseData(null);
        }, 300);
    }, []);

    const setMode = useCallback((newMode: ModalMode) => {
        setModeState(newMode);
    }, []);

    const updateExpenseData = useCallback((data: Partial<Expense>) => {
        setExpenseData(prev => prev ? { ...prev, ...data } : null);
    }, []);

    return (
        <GlobalModalContext.Provider
            value={{
                isOpen,
                mode,
                expenseData,
                openModal,
                closeModal,
                setMode,
                updateExpenseData,
            }}
        >
            {children}
        </GlobalModalContext.Provider>
    );
};

export const useGlobalModal = () => {
    const context = useContext(GlobalModalContext);
    if (context === undefined) {
        throw new Error("useGlobalModal must be used within a GlobalModalProvider");
    }
    return context;
};
