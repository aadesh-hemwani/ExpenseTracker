import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Trash2, Plus, Sparkles, ChevronLeft, Menu, X } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { useRecentExpenses } from "../hooks/useExpenses";
import { useChatHistory } from "../hooks/useChatHistory";
import { chatWithFinancialAssistant } from "../services/gemini";
import { useAuth } from "../context/AuthContext";
import { Timestamp } from "firebase/firestore";
import TextareaAutosize from 'react-textarea-autosize';
import { useNavigate } from "react-router-dom";
import "../components/ui/LiquidGlass.css";

const WelcomeMessage = memo(({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center text-center flex-1 px-4 mt-12 md:mt-24"
    >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-lg">
            <Sparkles className="text-white" size={32} />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            How can I help you today?
        </h2>
        <p className="text-[15px] text-gray-500 dark:text-gray-400 max-w-[280px] leading-relaxed mb-8">
            Ask me anything about your spending habits, trends, or budgets.
        </p>

        <div className="flex flex-wrap justify-center gap-3 w-full max-w-lg mt-4">
            {[
                "How much did I spend on food?",
                "What's my biggest category?",
                "Am I over my budget?"
            ].map((suggestion, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    onClick={() => onSuggestionClick(suggestion)}
                    className="cursor-pointer border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors px-4 py-3 rounded-2xl text-[14px] text-gray-700 dark:text-gray-300"
                >
                    {suggestion}
                </motion.div>
            ))}
        </div>
    </motion.div>
));

WelcomeMessage.displayName = "WelcomeMessage";

const Chat = memo(() => {
    const { user } = useAuth();
    const { messages, addMessage, clearHistory } = useChatHistory();
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const navigate = useNavigate();

    const groupedMessages = useMemo(() => {
        const groups: Record<string, typeof messages> = {};
        messages.forEach(msg => {
            const dateStr = format(msg.timestamp, 'yyyy-MM-dd');
            if (!groups[dateStr]) groups[dateStr] = [];
            groups[dateStr].push(msg);
        });
        return groups;
    }, [messages]);

    const availableDates = useMemo(() => {
        return Object.keys(groupedMessages).sort((a, b) => b.localeCompare(a));
    }, [groupedMessages]);

    const activeDate = useMemo(() => {
        if (selectedDate && availableDates.includes(selectedDate)) return selectedDate;
        return availableDates.length > 0 ? availableDates[0] : format(new Date(), 'yyyy-MM-dd');
    }, [selectedDate, availableDates]);

    const activeMessages = groupedMessages[activeDate] || [];

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    }, []);

    const formatMessageText = useCallback((text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => (
            <React.Fragment key={i}>
                {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
                {i < lines.length - 1 && <br />}
            </React.Fragment>
        ));
    }, []);

    const { expenses, loading } = useRecentExpenses(-1);

    const earliestDate = useMemo(() => {
        if (expenses.length === 0) return null;
        const timestamps = expenses.map(e => {
            if (e.date instanceof Timestamp) return e.date.toMillis();
            if (e.date instanceof Date) return e.date.getTime();
            return new Date(e.date).getTime();
        });
        return new Date(Math.min(...timestamps));
    }, [expenses]);

    useEffect(() => {
        scrollToBottom();
    }, [activeMessages, isTyping, scrollToBottom]);

    const submitMessage = async (text: string) => {
        if (!text.trim() || isTyping || loading) return;

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (activeDate !== todayStr) {
            setSelectedDate(todayStr);
        }

        setInputValue("");
        setIsTyping(true);

        await addMessage(text, "user");

        try {
            const responseText = await chatWithFinancialAssistant(
                text,
                expenses,
                user?.monthlyBudgetCap || 0
            );

            await addMessage(responseText, "ai");
        } catch (error) {
            await addMessage("Sorry, I ran into an error analyzing your request.", "ai");
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        submitMessage(inputValue.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleSuggestionClick = useCallback((suggestion: string) => {
        submitMessage(suggestion);
    }, [isTyping, loading, expenses, user]);

    const handleClearHistory = useCallback(() => {
        if (window.confirm("Clear entire chat history?")) {
            clearHistory();
        }
    }, [clearHistory]);

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-white/10 shrink-0 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chat History</h2>
                <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-full">
                    <X size={20} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {availableDates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No history yet</p>
                ) : (
                    availableDates.map(dateStr => {
                        const [year, month, day] = dateStr.split('-');
                        const localD = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        const label = isToday(localD) ? 'Today' : isYesterday(localD) ? 'Yesterday' : format(localD, 'MMM dd, yyyy');
                        const isActive = activeDate === dateStr;
                        return (
                            <button
                                key={dateStr}
                                onClick={() => {
                                    setSelectedDate(dateStr);
                                    setIsSidebarOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors text-[14px] ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                            >
                                {label}
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className="absolute inset-0 flex h-full bg-white dark:bg-[#0A0A0A]">
            {/* Sidebar for Desktop */}
            <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-[#0A0A0A] h-full overflow-y-auto">
                <SidebarContent />
            </div>

            {/* Sidebar Drawer for Mobile */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#111111] z-50 shadow-xl border-r border-gray-200 dark:border-white/10 overflow-y-auto flex flex-col"
                        >
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative min-w-0">
                {/* Header */}
                <div className={`sticky top-0 z-20 pt-[calc(env(safe-area-inset-top)+0.75rem)] px-5 md:px-8 pb-3 shrink-0 flex items-center justify-between transition-all duration-200 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md`}>
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full">
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full">
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            Chat
                        </h1>
                    </div>

                    {activeMessages.length > 0 && (
                        <button
                            onClick={handleClearHistory}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                            title="Clear Chat"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-8 flex flex-col min-h-0 pt-2">
                <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
                    {activeMessages.length === 0 ? (
                        <WelcomeMessage onSuggestionClick={handleSuggestionClick} />
                    ) : (
                        <div className="space-y-6 py-4 pb-6">
                            <AnimatePresence initial={false}>
                                {activeMessages.map((msg) => (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"} px-2`}
                                    >
                                        {msg.sender === "ai" && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 mr-4 shadow-sm mt-1">
                                                <Sparkles className="text-white" size={16} />
                                            </div>
                                        )}
                                        <div className={`text-[15px] leading-relaxed max-w-[85%] ${msg.sender === "user"
                                            ? "bg-[#f4f4f4] dark:bg-[#2f2f2f] text-gray-900 dark:text-white px-5 py-3 rounded-[24px]"
                                            : "text-gray-800 dark:text-gray-300 py-1"
                                            }`}>
                                            {formatMessageText(msg.text)}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start px-2"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0 mr-4 shadow-sm mt-1">
                                        <Sparkles className="text-white" size={16} />
                                    </div>
                                    <div className="py-3 flex items-center gap-1.5">
                                        <motion.div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                                        <motion.div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                                        <motion.div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} className="h-1" />
                        </div>
                    )}
                </div>
            </div>

            <div className="shrink-0 px-4 md:px-8 z-10 bg-white dark:bg-[#0A0A0A] transition-all duration-200 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-2 md:pb-6">
                <div className="max-w-3xl mx-auto relative">
                    <form onSubmit={handleSendMessage} className="liquid-glass-effect rounded-[24px] p-2 flex items-end gap-2 transition-all">
                        <TextareaAutosize
                            ref={inputRef}
                            minRows={1}
                            maxRows={6}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask AI..."
                            className="flex-1 bg-transparent py-2.5 pl-4 pr-1 text-[15px] placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none text-gray-900 dark:text-white resize-none"
                            disabled={isTyping || loading}
                        />

                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isTyping || loading}
                            className={`p-2.5 rounded-full transition-all shrink-0 ${!inputValue.trim() || isTyping || loading
                                ? "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-600"
                                : "bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95"}`}
                        >
                            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                        </button>
                    </form>
                    {loading && (
                        <p className="text-[11px] text-center text-gray-400 mt-2 absolute -bottom-5 left-0 right-0">
                            Loading expenses...
                        </p>
                    )}
                </div>
            </div>
            </div>
        </div>
    );
});

Chat.displayName = "Chat";

export default Chat;
