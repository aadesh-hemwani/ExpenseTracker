export function cleanMerchantName(name: string): string {
  // A mapping dictionary for common Indian merchants
  const merchantMap: Record<string, string> = {
    "SWIGGY I": "Swiggy",
    "HARDCAST": "McDonald's",
    "ZERODHA BROKING LTD": "Zerodha",
    "iZerodha": "Zerodha",
    "CRED Clu": "CRED",
    "CRED": "CRED",
    "NPCI BHI": "BHIM Cashback",
    "Indian R": "Indian Railways (IRCTC)",
    "EVERSUB": "Subway"
  };

  if (merchantMap[name]) {
    return merchantMap[name];
  }

  // Default formatting: Convert "ADES PR" or "SARVESH" to Title Case
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function getCleanDescription(narration: string): string {
  if (!narration) return "Unknown Transaction";

  const cleanDesc = narration.trim();

  // 1. Handle UPI
  if (cleanDesc.toUpperCase().startsWith("UPI/")) {
    const parts = cleanDesc.split("/");
    const name = parts[3] ? parts[3].trim() : "UPI Transfer";
    return cleanMerchantName(name);
  }

  // 2. Handle ACH
  if (cleanDesc.toUpperCase().startsWith("ACH/")) {
    const parts = cleanDesc.split("/");
    let name = "Bank Mandate";
    if (parts[1]) {
      const p1Upper = parts[1].toUpperCase().trim();
      if ((p1Upper === "DR" || p1Upper === "CR") && parts[2]) {
        name = parts[2].trim();
      } else {
        name = parts[1].trim();
      }
    }
    return cleanMerchantName(name);
  }

  // Support other types if they contain slash and map/clean their results
  if (cleanDesc.includes('/')) {
    const parts = cleanDesc.split('/').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const prefix = parts[0].toUpperCase();

      // IMPS, NEFT, RTGS
      if (['IMPS', 'NEFT', 'RTGS'].includes(prefix)) {
        if (parts.length >= 4 && ['DR', 'CR'].includes(parts[1].toUpperCase())) {
          return cleanMerchantName(parts[3] || cleanDesc);
        }
        if (parts.length >= 3) {
          return cleanMerchantName(parts[2] || cleanDesc);
        }
      }

      // POS or ECOM (Point of Sale / E-Commerce Card Transactions)
      if (['POS', 'ECOM', 'E-COM', 'IPS'].includes(prefix)) {
        return cleanMerchantName(parts[1] || cleanDesc);
      }

      // ATM
      if (prefix === 'ATM') {
        if (parts.length >= 3) {
          return `ATM - ${cleanMerchantName(parts[2])}`;
        }
        if (parts.length >= 2) {
          return `ATM - ${cleanMerchantName(parts[1])}`;
        }
        return 'ATM Withdrawal';
      }

      // Generic fallback for slash descriptions
      if (prefix.length <= 4) {
        const bankCodes = ['HDFC', 'ICICI', 'SBI', 'YESB', 'UTIB', 'KKBK', 'BARB', 'UBIN', 'IBKL', 'PUNB', 'YES BANK', 'AXIS'];
        const standardCodes = ['DR', 'CR', 'INF', 'ACH', 'TRF', 'FT', 'NEFT', 'RTGS', 'IMPS', 'UPI', 'POS', 'ECOM', 'ATM', 'WDL', 'DEP', 'TXN'];
        
        for (let i = 1; i < parts.length; i++) {
          const p = parts[i];
          const pUpper = p.toUpperCase();
          if (/^\d+$/.test(p)) continue;
          if (bankCodes.includes(pUpper)) continue;
          if (standardCodes.includes(pUpper)) continue;
          if (p.length < 3) continue;
          return cleanMerchantName(p);
        }
      }
    }
  }

  // 3. Fallback for SMS, Interest, or Misc Charges
  return cleanDesc;
}
