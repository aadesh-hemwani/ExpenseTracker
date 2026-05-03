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

export const chatWithFinancialAssistant = async (
  message: string,
  expenses: Expense[],
  monthlyLimit: number = 0
): Promise<string> => {
  if (!API_KEY) return "Sorry, I can't connect to my brain right now.";

  try {
    // Model fallback chain — if one model hits rate limit (429), automatically try the next
    const CHAT_MODELS = [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite"
    ];

    const queryEmbedding = await generateEmbedding(message);
    let relevantExpenses = expenses;

    // --- DEEP ANALYTICS ENGINE (all computed client-side, zero extra API cost) ---
    const categoryTotals: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const noteCounts: Record<string, number> = {};
    const noteKeywordCounts: Record<string, { count: number; total: number }> = {};
    const monthlySpend: Record<string, number> = {};
    let allTimeTotal = 0;
    let earliestDate = new Date();
    let latestDate = new Date(0);

    expenses.forEach(e => {
      const amt = Number(e.amount);
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amt;
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      allTimeTotal += amt;

      if (e.note) {
        const noteKey = e.note.trim().toLowerCase();
        noteCounts[noteKey] = (noteCounts[noteKey] || 0) + 1;

        // Keyword-level counting: split note into words so "lunch at cafe" counts toward keyword "lunch"
        const words = noteKey.split(/\s+/);
        words.forEach(word => {
          if (word.length >= 3) { // skip tiny words like "at", "on", "to"
            if (!noteKeywordCounts[word]) noteKeywordCounts[word] = { count: 0, total: 0 };
            noteKeywordCounts[word].count += 1;
            noteKeywordCounts[word].total += amt;
          }
        });
      }

      const d = e.date && (e.date as any).toDate ? (e.date as any).toDate() : new Date(e.date as any);
      if (d < earliestDate) earliestDate = d;
      if (d > latestDate) latestDate = d;

      const monthKey = format(d, "yyyy-MM");
      monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + amt;
    });

    // Category summary with counts
    const categorySummaryString = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => `${cat}: ₹${Math.round(total)} (${categoryCounts[cat]} txns)`)
      .join(" | ");

    // Keyword frequencies with amounts (covers partial note matches)
    const noteFrequencyString = Object.entries(noteKeywordCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 40)
      .map(([keyword, data]) => `"${keyword}": ${data.count}x, ₹${Math.round(data.total)} total`)
      .join(", ");

    // Monthly breakdown sorted chronologically
    const monthlyBreakdown = Object.entries(monthlySpend)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => `${month}: ₹${Math.round(total)}`)
      .join(" | ");

    // Current month spend
    const currentMonth = format(new Date(), "yyyy-MM");
    const currentMonthSpend = monthlySpend[currentMonth] || 0;
    const prevMonth = format(new Date(new Date().getFullYear(), new Date().getMonth() - 1), "yyyy-MM");
    const prevMonthSpend = monthlySpend[prevMonth] || 0;

    // Average monthly
    const monthCount = Object.keys(monthlySpend).length || 1;
    const avgMonthly = Math.round(allTimeTotal / monthCount);

    // Top category
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    const dateRangeStr = expenses.length > 0
      ? `${format(earliestDate, "MMM dd, yyyy")} → ${format(latestDate, "MMM dd, yyyy")}`
      : "N/A";
    // --- END ANALYTICS ---

    // RAG Implementation: Perform Semantic Retrieval if query embedding exists
    if (queryEmbedding && queryEmbedding.length > 0) {
      const cosineSimilarity = (vecA: number[], vecB: number[]) => {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
          dotProduct += vecA[i] * vecB[i];
          normA += vecA[i] * vecA[i];
          normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
      };

      const scoredExpenses = expenses.map(e => {
        if (!e.embedding) return { expense: e, score: -1 };
        return {
          expense: e,
          score: cosineSimilarity(queryEmbedding, e.embedding)
        };
      });

      scoredExpenses.sort((a, b) => b.score - a.score);
      relevantExpenses = scoredExpenses.slice(0, 50).map(item => item.expense);
      console.log(`🤖 Selected Contextual Expenses: ${relevantExpenses.length}`);
    } else {
      relevantExpenses = expenses.slice(-30);
    }

    // Format transaction list
    const recentTxns = relevantExpenses.map(e => {
      let dateObj: Date;
      if (e.date && typeof (e.date as any).toDate === 'function') {
        dateObj = (e.date as any).toDate();
      } else {
        dateObj = new Date(e.date as any);
      }
      return `${e.category}: ₹${e.amount} on ${format(dateObj, "MMM dd")}${e.note ? ` (${e.note})` : ""}`;
    }).join("\n      - ");

    const prompt = `
      You are the user's personal financial analyst. You have COMPLETE access to their entire expense database and you know their spending inside-out. You speak with quiet confidence — like someone who has already studied their data deeply. Never say things like "based on the data provided" or "from what I can see" — you simply KNOW.

      ═══ YOUR KNOWLEDGE BASE ═══

      TODAY: ${format(new Date(), "MMM dd, yyyy")}
      BUDGET: ${monthlyLimit > 0 ? `₹${monthlyLimit}/month` : "Not set"}

      DATABASE: ${expenses.length} transactions spanning ${dateRangeStr}
      TOTAL LIFETIME SPEND: ₹${Math.round(allTimeTotal)}
      
      MONTHLY BREAKDOWN: ${monthlyBreakdown || "N/A"}
      THIS MONTH (${format(new Date(), "MMM yyyy")}): ₹${Math.round(currentMonthSpend)}${prevMonthSpend > 0 ? ` (last month was ₹${Math.round(prevMonthSpend)})` : ""}
      AVERAGE MONTHLY: ₹${avgMonthly}
      ${topCategory ? `TOP CATEGORY: ${topCategory[0]} at ₹${Math.round(topCategory[1])} (${categoryCounts[topCategory[0]]} transactions)` : ""}
      ${monthlyLimit > 0 ? `BUDGET STATUS: ₹${Math.round(currentMonthSpend)} of ₹${monthlyLimit} used (${Math.round((currentMonthSpend / monthlyLimit) * 100)}%)` : ""}

      CATEGORY BREAKDOWN: ${categorySummaryString || "None"}
      NOTE FREQUENCIES: ${noteFrequencyString || "None"}

      ═══ RELEVANT TRANSACTIONS ═══
      - ${recentTxns || "No transactions found."}

      ═══ USER'S QUESTION ═══
      "${message}"

      ═══ RESPONSE RULES ═══
      - Use the CATEGORY BREAKDOWN and NOTE FREQUENCIES as ground truth for sums and counts. They cover ALL ${expenses.length} transactions, not just the sample above.
      - Be direct. Lead with the answer, then add context if useful. No filler.
      - **Bold** all amounts and dates.
      - Use bullet points for lists. Keep it scannable.
      - Use ₹ symbol.
      - If comparing months, cite the monthly breakdown numbers.
      - Never mention "context", "data provided", "based on records", or anything that reveals you're reading a prompt. You just know.
      - Sound like a sharp financial advisor who's been studying their account for months.
      - Keep responses concise — 3-5 lines for simple questions, more only if they ask for detail.
      - If you genuinely can't determine something, say so honestly.
    `;

    // Try each model in the fallback chain
    let lastError: any = null;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < CHAT_MODELS.length; i++) {
      const modelName = CHAT_MODELS[i];
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        console.log(`✅ Response from: ${modelName}`);
        return result.response.text();
      } catch (modelError: any) {
        lastError = modelError;
        const msg = String(modelError?.message || modelError?.status || '').toLowerCase();
        const isRateLimit = msg.includes('429') || msg.includes('resource has been exhausted') || msg.includes('quota');

        if (isRateLimit && i < CHAT_MODELS.length - 1) {
          console.warn(`⚠️ Rate limited on ${modelName}, waiting 2s before trying ${CHAT_MODELS[i + 1]}...`);
          await delay(2000);
          continue;
        }
        if (!isRateLimit) throw modelError;
      }
    }

    // All models exhausted
    console.error("All models rate limited:", lastError);
    return "I've hit the rate limit on all available models. Please try again in a few minutes.";

  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble analyzing your finances right now. Please try again.";
  }
};

export const generateEmbedding = async (text: string): Promise<number[] | null> => {
  if (!API_KEY) return null;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    return null;
  }
};
