import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, Loader2, Trash2 } from "lucide-react";
import { useRecentExpenses } from "../hooks/useExpenses";
import { useChatHistory } from "../hooks/useChatHistory";
import { chatWithFinancialAssistant } from "../services/gemini";
import { useAuth } from "../context/AuthContext";

const WelcomeMessage = () => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center justify-center text-center flex-1 px-6"
    >
        <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Bot className="text-accent" size={28} />
        </div>
        <p className="text-[15px] text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
            Ask me anything about your spending habits, trends, or budgets.
        </p>

        <div className="grid gap-2 w-full max-w-xs mt-8">
            {[
                "How much did I spend on food?",
                "What's my biggest category?",
                "Am I over my budget?"
            ].map((suggestion, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="text-[13px] px-4 py-2.5 rounded-xl bg-gray-100/80 dark:bg-white/5 text-gray-600 dark:text-gray-400 pointer-events-none text-left"
                >
                    {suggestion}
                </motion.div>
            ))}
        </div>
    </motion.div>
);


const Chat = () => {
    const { user } = useAuth();
    const { messages, addMessage, clearHistory } = useChatHistory();
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    const handleInputFocus = useCallback(() => {
        setIsKeyboardOpen(true);
        document.documentElement.classList.add("keyboard-open");
        // Scroll to bottom after keyboard animation settles
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    }, []);

    const handleInputBlur = useCallback(() => {
        setIsKeyboardOpen(false);
        document.documentElement.classList.remove("keyboard-open");
    }, []);

    const formatMessageText = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => (
            <React.Fragment key={i}>
                {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                })}
                {i < lines.length - 1 && <br />}
            </React.Fragment>
        ));
    };

    const { expenses, loading } = useRecentExpenses(-1);

    const earliestDate = expenses.length > 0
        ? new Date(Math.min(...expenses.map(e => (e.date as any).toDate ? (e.date as any).toDate().getTime() : new Date(e.date as any).getTime())))
        : null;

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping, scrollToBottom]);

    // Cleanup keyboard-open class on unmount
    useEffect(() => {
        return () => document.documentElement.classList.remove("keyboard-open");
    }, []);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!inputValue.trim() || isTyping || loading) return;

        const userMessageText = inputValue.trim();
        setInputValue("");
        setIsTyping(true);

        await addMessage(userMessageText, "user");

        try {
            const responseText = await chatWithFinancialAssistant(
                userMessageText,
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

    return (
        <div className="absolute inset-0 flex flex-col h-full">
            {/* Minimal Header */}
            <div className={`pt-[calc(env(safe-area-inset-top)+0.75rem)] px-5 md:px-8 pb-3 shrink-0 flex items-center justify-between transition-all duration-200 ${isKeyboardOpen ? "hidden" : ""}`}>
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Ask AI
                    </h1>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {expenses.length} expenses{earliestDate && ` · since ${earliestDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`}
                    </p>
                </div>

                {messages.length > 0 && (
                    <button
                        onClick={() => {
                            if (window.confirm("Clear entire chat history?")) {
                                clearHistory();
                            }
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                        title="Clear History"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            {/* Divider */}
            {!isKeyboardOpen && <div className="h-px bg-gray-100 dark:bg-white/5 mx-5 md:mx-8 shrink-0" />}

            {/* Chat Area */}
            <div
                ref={chatAreaRef}
                className="flex-1 overflow-y-auto no-scrollbar px-5 md:px-8 flex flex-col min-h-0"
            >
                {messages.length === 0 ? (
                    <WelcomeMessage />
                ) : (
                    <div className="space-y-4 py-4 pb-40">
                        <AnimatePresence initial={false}>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div className={`max-w-[80%] px-4 py-3 text-[14px] leading-relaxed ${msg.sender === "user"
                                        ? "bg-accent text-white rounded-[16px] rounded-br-md"
                                        : "bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200 rounded-[16px] rounded-bl-md"
                                        }`}>
                                        {formatMessageText(msg.text)}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing Indicator */}
                        {isTyping && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex justify-start"
                            >
                                <div className="bg-gray-100 dark:bg-white/5 rounded-[16px] rounded-bl-md px-5 py-3.5 flex items-center gap-1.5">
                                    <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} />
                                    <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} />
                                    <motion.div className="w-1.5 h-1.5 bg-gray-400 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} />
                                </div>
                            </motion.div>
                        )}
                        <div ref={messagesEndRef} className="h-1" />
                    </div>
                )}
            </div>

            {/* Input — sticks to bottom, moves above keyboard on mobile */}
            <div
                className={`left-0 right-0 px-5 md:px-8 z-10 ${
                    isKeyboardOpen ? "sticky bottom-0 pb-1 pt-2 bg-white/90 dark:bg-[#0A0A0A]/90 backdrop-blur-md" : "fixed bottom-28 md:bottom-6"
                }`}
            >
                <div className="max-w-2xl mx-auto">
                    <form onSubmit={handleSendMessage} className="backdrop-blur-md bg-white/70 dark:bg-[#0A0A0A]/70 rounded-full p-1 flex items-center gap-1 border border-gray-200/50 dark:border-white/5 shadow-sm">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            placeholder="Ask anything..."
                            className="flex-1 bg-transparent py-3 px-5 text-[14px] placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none text-gray-900 dark:text-white"
                            disabled={isTyping || loading}
                        />
                        <button
                            type="submit"
                            disabled={!inputValue.trim() || isTyping || loading}
                            className="p-3 bg-accent disabled:bg-gray-200/50 dark:disabled:bg-white/5 text-white disabled:text-gray-400 dark:disabled:text-gray-600 rounded-full transition-all active:scale-95 shrink-0"
                        >
                            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                    </form>
                    {loading && (
                        <p className="text-[11px] text-center text-gray-400 mt-2">
                            Loading expenses...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Chat;

