export interface ParsedExpense {
  amount: string;
  note?: string;
  category?: string;
}

export const parseTransactionText = (text: string): ParsedExpense | null => {
  if (!text) return null;

  // Normalize text
  const cleanText = text.replace(/,/g, "").trim();

  // Regex patterns for common transaction formats (Indian context focused)
  // 1. "Debited INR 500.00" or "Debited Rs 500"
  // 2. "Sent Rs. 500 to"
  // 3. "Paid INR 500"
  // 4. "Spent Rs 500"
  // 5. "Transaction of Rs 500"
  // 6. UPI: "Rs 500 paid to"
  
  const amountPatterns = [
    /(?:INR|Rs\.?|₹)\s*(\d+(?:\.\d{1,2})?)/i, // Rs. 500
    /(?:debited|spent|paid|sent)\s*(?:by|via)?\s*(?:INR|Rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)/i, // Paid 500
    /(\d+(?:\.\d{1,2})?)\s*(?:INR|Rs\.?|₹)/i, // 500 INR
  ];

  let amount: string | null = null;

  for (const pattern of amountPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      amount = match[1];
      break;
    }
  }

  if (!amount) return null;

  // Extract potential note (Business name or receiver)
  // Look for "to <Name>", "at <Name>", "via <Name>"
  let note = "";
  
  const notePatterns = [
    /(?:to|at)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:on|from|via|ref|txn)|$|\.)/i,
    /(?:paid)\s+to\s+([a-zA-Z0-9\s]+)/i,
  ];

  for (const pattern of notePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      // Clean up the note
      note = match[1].trim();
      // Remove common suffix words if captured
      note = note.replace(/\s+(?:on|via|ref|txn|successfully).*$/i, "");
      break;
    }
  }

  // Simple heuristic for common merchants (could be expanded)
  let category = "Misc";
  const lowerNote = note.toLowerCase();
  
  if (lowerNote.includes("swiggy") || lowerNote.includes("zomato") || lowerNote.includes("food")) category = "Food";
  else if (lowerNote.includes("uber") || lowerNote.includes("ola") || lowerNote.includes("fuel") || lowerNote.includes("petrol")) category = "Transport";
  else if (lowerNote.includes("amazon") || lowerNote.includes("flipkart") || lowerNote.includes("mart")) category = "Shopping";
  else if (lowerNote.includes("recharge") || lowerNote.includes("bill") || lowerNote.includes("electricity")) category = "Bills";
  else if (lowerNote.includes("movie") || lowerNote.includes("cinema") || lowerNote.includes("netflix")) category = "Entertainment";
  else if (lowerNote.includes("pharmacy") || lowerNote.includes("hospital") || lowerNote.includes("med")) category = "Health";

  return {
    amount,
    note: note || undefined,
    category
  };
};
