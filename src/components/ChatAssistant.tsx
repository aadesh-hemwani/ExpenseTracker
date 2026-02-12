import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, subMonths } from "date-fns";
import { chatWithFinancialAssistant } from "../services/gemini";
import { useRecentExpenses } from "../hooks/useExpenses";
import IOSSpinner from "./ui/IOSSpinner";
import { Send, Sparkles, X } from "lucide-react";

interface ChatAssistantProps {
  userId?: string;
  monthlyLimit?: number;
  mode?: "floating" | "card";
}

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  userId,
  monthlyLimit = 0,
  mode = "floating",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi! I'm your financial assistant. Ask me anything about your spending!",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch broader context (Current Month + Last Month)
  const { expenses } = useRecentExpenses(1, userId);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const responseText = await chatWithFinancialAssistant(
        userMsg.text,
        expenses,
        monthlyLimit,
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I had a brain fart. Try again?",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const chatUi = (
    <div
      className={`flex flex-col overflow-hidden bg-white dark:bg-[#1c1c1e] ${mode === "card" && isOpen
          ? "w-full h-full rounded-none"
          : mode === "card"
            ? "w-full h-[600px] rounded-[32px] border border-gray-100 dark:border-white/10 shadow-sm"
            : "fixed inset-x-4 bottom-4 top-20 md:top-auto md:bottom-24 md:right-24 md:left-auto md:w-[400px] md:h-[600px] rounded-[32px] shadow-2xl z-[10000] border border-gray-100 dark:border-white/10"
        }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200/50 dark:border-white/5 flex justify-between items-center bg-white/50 dark:bg-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles
              color="#fff"
              size={22}
              className="animate-pulse"
            />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
              Expense AI
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Data from {format(subMonths(new Date(), 1).setDate(1), "MMM dd")}{" "}
              to Today
            </p>
          </div>
        </div>
        {(mode === "floating" || (mode === "card" && isOpen)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X
              size={20}
              className="text-gray-500 dark:text-gray-400"
            />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50/50 dark:bg-black/20 scrollbar-hide"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3.5 px-4 rounded-2xl shadow-sm ${msg.sender === "user"
                  ? "bg-gradient-to-br from-gray-900 to-black dark:from-white dark:to-gray-200 text-white dark:text-black rounded-br-sm"
                  : "bg-white dark:bg-[#1c1c1e] text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-white/5 rounded-bl-sm"
                }`}
            >
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap font-medium">
                {msg.text}
              </p>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white dark:bg-[#1c1c1e] px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-white/5 flex space-x-1.5 items-center">
              <div
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area - Floating aesthetics */}
      <div className="p-4 bg-white/80 dark:bg-[#121214]/80 backdrop-blur-md border-t border-gray-100 dark:border-white/5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about spending..."
            className="w-full bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white rounded-2xl pl-4 pr-12 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-white/10 transition-all placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 p-2 bg-black dark:bg-white rounded-xl text-white dark:text-black disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-md"
          >
            {isTyping ? (
              <IOSSpinner size={16} color="currentColor" />
            ) : (
              <Send
                size={16}
                className="text-current"
              />
            )}
          </button>
        </form>
      </div>
    </div>
  );

  if (mode === "card") {
    return (
      <>
        {/* 1. Compact Trigger Card (Inline) */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(true)}
          className="w-full bg-white dark:bg-[#1c1c1e] rounded-[24px] p-4 flex items-center shadow-sm border border-gray-100 dark:border-white/5 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-4 shrink-0">
            <Sparkles color="#fff" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">
              Ask Expense AI
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tap to analyse your spending...
            </p>
          </div>
          <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-full">
            <Send
              size={20}
              className="text-gray-400"
            />
          </div>
        </motion.div>

        {/* 2. Full Screen Expanded View (Portal) */}
        {createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[10000] bg-white dark:bg-[#000]"
              >
                {chatUi}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
      </>
    );
  }

  return createPortal(
    <>
      <div className="fixed z-[9999] bottom-0 right-0 pointer-events-none">
        {/* Floating Action Button for Chat - enable pointer events */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-5 w-14 h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full shadow-xl flex items-center justify-center pointer-events-auto border border-white/10"
        >
          <Sparkles size={28} className="text-current" />
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            />

            {/* Chat Modal */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            // No wrapper div needed as chatUi has the styles
            >
              {chatUi}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body,
  );
};

export default ChatAssistant;
