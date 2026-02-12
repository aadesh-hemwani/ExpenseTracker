/// <reference types="vite/client" />
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Expense } from "../types";
import { format } from "date-fns";

// Initialize the API
// Note: It's safer to use a backend proxy for production to hide the key,
// but for this personal project/demo, client-side is acceptable if key is restricted.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
console.log("🔑 Gemini API Key Status:", API_KEY ? "Present" : "Missing", API_KEY ? `(Length: ${API_KEY.length})` : "");
const genAI = new GoogleGenerativeAI(API_KEY);

export interface GeminiInsight {
  title: string;
  message: string;
  actionableTip: string;
  sentiment: "positive" | "neutral" | "warning";
}

export const generateFinancialInsight = async (
  expenses: Expense[],
  monthlyLimit: number,
  totalSpent: number
): Promise<GeminiInsight | null> => {
  if (!API_KEY) {
    console.warn("Gemini API Key is missing.");
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Prepare data summary for the prompt
    // We don't want to send too much PII, just categories and amounts
    const recentTxns = expenses
      .slice(0, 15)
      .map(
        (e) => {
          let dateObj: Date;
          if (e.date && typeof (e.date as any).toDate === 'function') {
            dateObj = (e.date as any).toDate();
          } else {
            dateObj = new Date(e.date as any);
          }
          return `- ${e.category}: ${e.amount} (${format(dateObj, "MMM dd")})`;
        }
      )
      .join("\n");

    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      const val = Number(e.amount);
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + val;
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, val]) => `${cat}: ${val.toFixed(0)}`)
      .join(", ");

    const prompt = `
      Act as a friendly but savvy financial advisor.
      Here is my current financial snapshot for this month:
      - Total Spent: ${totalSpent}
      - Monthly Budget: ${monthlyLimit > 0 ? monthlyLimit : "Not set"}
      - Top Categories: ${topCategories}
      - Recent Transactions:
      ${recentTxns}

      Based on this, provide a concise financial insight in JSON format with the following fields:
      - title: Short headline (max 5 words)
      - message: 1-2 sentence analysis of my spending pattern.
      - actionableTip: One specific thing I can do to save or improve.
      - sentiment: "positive", "neutral", or "warning" (based on if I'm overspending or doing well).

      Do not use Markdown code blocks. Just valid JSON string.
    `;
    
    console.log("🤖 Sending Prompt to Gemini:", prompt);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("🤖 Gemini Response:", text);

    // Clean up if the model wraps it in backticks
    const jsonStr = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(jsonStr) as GeminiInsight;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export interface AnalyticsInsight {
  type: "warning" | "trendingUp" | "trendingDown" | "success" | "info" | "category";
  title: string;
  message: string;
  priority: number;
}

export const generateAnalyticsInsights = async (
  expenses: Expense[],
  monthlyLimit: number,
  totalSpent: number
): Promise<AnalyticsInsight[]> => {
  if (!API_KEY) return [];

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const recentTxns = expenses.slice(0, 30).map(e => {
        const dateStr = format(e.date instanceof Date ? e.date : (e.date as any).toDate(), "MMM dd");
        const noteStr = e.note ? ` (Note: "${e.note}")` : "";
        return `${e.category}: ${e.amount} on ${dateStr}${noteStr}`;
    }).join("\n      - ");

    const prompt = `
      Analyze these finances for this month:
      - Total Spent: ${totalSpent}
      - Budget: ${monthlyLimit}
      - Recent Transactions:
      - ${recentTxns}

      Generate 3 distinct, brief insights as a JSON array.
      Use the transaction notes (if available) to make the insights feel personal (e.g., mention specific purchases like "that dinner" or "the trip").
      
      Types: "warning" (overspending), "trendingUp" (spending fast), "trendingDown" (saving), "success" (under budget), "info" (prediction), "category" (top spend).
      
      Format:
      [
        {
          "type": "warning",
          "title": "Short Title",
          "message": "One sentence explanation.",
          "priority": 1 (1=Urgent, 5=Low)
        }
      ]
      Output ONLY valid JSON.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as AnalyticsInsight[];
  } catch (error) {
    console.error("Gemini Analytics Error:", error);
    return [];
  }
};

export interface BudgetRecommendation {
  recommendedBudget: number;
  reasoning: string;
  savingsPotential: number; // Percentage like 5, 10, etc.
}

export const calculateRecommendedBudget = async (
  recentExpenses: Expense[]
): Promise<BudgetRecommendation | null> => {
  if (!API_KEY) return null;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 1. Pre-process Data: Group by Month -> Category
    const monthlyData: Record<string, { total: number; categories: Record<string, number> }> = {};

    recentExpenses.forEach((e) => {
        let dateObj: Date;
        if (e.date && typeof (e.date as any).toDate === 'function') {
        dateObj = (e.date as any).toDate();
        } else {
        dateObj = new Date(e.date as any);
        }
        
        const monthKey = format(dateObj, "yyyy-MM");
        const amount = Number(e.amount);

        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { total: 0, categories: {} };
        }

        monthlyData[monthKey].total += amount;
        monthlyData[monthKey].categories[e.category] = (monthlyData[monthKey].categories[e.category] || 0) + amount;
    });

    const breakdownJson = JSON.stringify(monthlyData, null, 2);
    const totalSpent = recentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const monthsCount = Object.keys(monthlyData).length || 1;
    const stats = `Total Spent: ${totalSpent} over ${monthsCount} months.`;

    const prompt = `
      Act as a financial expert. Analyze the customer's spending history which is grouped by Month and then Category.
      
      DATA SUMMARY:
      ${stats}
      
      DETAILED BREAKDOWN:
      ${breakdownJson}

      TASK:
      Calculate a realistic monthly budget cap.
      1. Identify the "stable" baseline spending (ignoring one-off partial months if obvious).
      2. Look for category trends (e.g., "Food increased in Dec").
      3. Suggest a budget that is slightly lower (5-10%) than their average to strictly drive savings.
      4. Round to nearest 500.

      IMPORTANT FORMATTING RULES:
      - Use **INR (₹)** for all currency values. Do NOT use '$'.
      - The "reasoning" field must be a short, punchy summary using bullet points (unicode •) for key insights.
      - Mention specific category spikes if relevant (e.g. "High Food spend in Dec").

      Return JSON:
      {
        "recommendedBudget": 25000,
        "reasoning": "• Avg spend is ₹27k\n• Food spiked to ₹8k in Dec\n• Cut incidental shopping to save ₹2k",
        "savingsPotential": 8
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr) as BudgetRecommendation;
  } catch (error) {
    console.error("Gemini Budget Error:", error);
    return null;
  }
};

export const suggestIcon = async (note: string): Promise<string | null> => {
  if (!API_KEY || !note) return null;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Check if simple keyword match is enough to save API call? 
    // No, user wants AI.

    const prompt = `
      You are an icon suggester used by an expense tracker app.
      The app uses the "Lucide React" icon library.
      
      Task: Based on the following expense note, suggest the single best Lucide icon name that visually represents the purchase.
      
      Note: "${note}"
      
      Rules:
      1. Return ONLY the icon component name in PascalCase (e.g., "Coffee", "Ticket", "Banana", "Car", "Gamepad2").
      2. Do not include "Lucide" or "Icon" suffix unless it's part of the actual name.
      3. If unsure, return "CreditCard".
      4. Output nothing else. No JSON, no backticks.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const iconName = text.trim().replace(/['"`]/g, ""); // Clean up quotes
    return iconName;
  } catch (error) {
    console.error("Gemini Icon Suggestion Error:", error);
    return null;
  }
};

export const chatWithFinancialAssistant = async (
  message: string,
  expenses: Expense[],
  monthlyLimit: number = 0
): Promise<string> => {
  if (!API_KEY) return "Sorry, I can't connect to my brain right now.";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Summarize data for context
    // 1. Organize data into a structured JSON format helper
    const monthlyData: Record<string, {
      month: string;
      total: number;
      categoryTotals: Record<string, number>;
      transactions: Array<{ date: string; amount: number; category: string; note: string }>;
    }> = {};

    expenses.forEach((e) => {
      let dateObj: Date;
      if (e.date && typeof (e.date as any).toDate === 'function') {
        dateObj = (e.date as any).toDate();
      } else {
        dateObj = new Date(e.date as any);
      }
      
      const monthKey = format(dateObj, "MMMM yyyy"); // e.g., "February 2026"
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          total: 0,
          categoryTotals: {},
          transactions: []
        };
      }
      
      const data = monthlyData[monthKey];
      const val = Number(e.amount);

      // Update aggregates
      data.total += val;
      data.categoryTotals[e.category] = (data.categoryTotals[e.category] || 0) + val;

      // Add transaction detail
      data.transactions.push({
        date: format(dateObj, "yyyy-MM-dd"),
        amount: val,
        category: e.category,
        note: e.note || ""
      });
    });

    // Convert to array
    const structuredContext = Object.values(monthlyData);
    const jsonContext = JSON.stringify(structuredContext, null, 2);

    const prompt = `
      You are a specific, helpful, and friendly financial assistant for an Expense Tracker app.
      
      USER SETTINGS:
      - Monthly Budget Cap: ${monthlyLimit > 0 ? monthlyLimit : "Not set"}

      DATA CONTEXT (JSON Format):
      ${jsonContext}

      USER QUESTION: "${message}"

      INSTRUCTIONS:
      - Answer based ONLY on the provided JSON data.
      - The JSON contains a list of months. Each month has a 'total', 'categoryTotals', and 'transactions'.
      - Use 'categoryTotals' for high-level summaries and 'transactions' for specific details.
      - If answering about a specific month, use the data from that detailed object.
      - Be concise but conversational.
      - Use INR (₹) symbol.
      - If you can't find the answer in the data, honestly say so.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();

  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble analyzing your finances right now. Please try again.";
  }
};
