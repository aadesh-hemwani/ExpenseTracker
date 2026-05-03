import { useState, useCallback } from "react";
import { 
  generateAnalyticsInsights,
  AnalyticsInsight 
} from "../services/gemini";
import { Expense } from "../types";

export const useAiInsights = () => {
  const [analyticsInsights, setAnalyticsInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const fetchAnalyticsInsights = useCallback(async (
    expenses: Expense[],
    budget: number,
    totalSpent: number
  ) => {
    setLoading(true);
    setError(null);

    const CACHE_KEY = "analytics_insights_cache";
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // 1. Check Cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        if (now - timestamp < ONE_DAY_MS) {
          console.log("🟢 Using Cached AI Insights (valid for 24h)");
          setAnalyticsInsights(data);
          setLoading(false);
          return;
        } else {
          console.log("🟡 Cache expired, fetching new AI Insights...");
        }
      }
    } catch (e) {
      console.warn("Failed to parse insight cache", e);
    }

    // 2. Fetch Fresh Data
    try {
      const results = await generateAnalyticsInsights(expenses, budget, totalSpent);
      if (results && results.length > 0) {
        setAnalyticsInsights(results);
        
        // 3. Save to Cache
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: results,
          timestamp: Date.now()
        }));

      } else {
        setAnalyticsInsights([]);
      }
    } catch (err) {
      console.error("👉 fetchAnalyticsInsights Error:", err);
      setError("Failed to get analytics insights");
    } finally {
      setLoading(false);
    }
  }, []);

  return { analyticsInsights, loading, error, fetchAnalyticsInsights };
};
