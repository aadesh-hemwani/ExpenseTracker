import * as XLSX from 'xlsx';
import officeCrypto from 'officecrypto-tool';
import { Buffer } from 'buffer';
import { ParsedTransaction, MerchantRule, CategoryRule } from '../types/analytics';
import { getCleanDescription, cleanMerchantName } from '../utils/statementParserUtils';

export interface WorkerInput {
  fileBuffer: ArrayBuffer;
  accountId: string;
  mapping: {
    date: string;
    description: string;
    debit: string;
    credit: string;
    amount: string; // If single column
    balance: string;
    dateFormat?: string;
  };
  password?: string;
  merchantRules: MerchantRule[];
  categoryRules: CategoryRule[];
}

export interface WorkerOutput {
  transactions: ParsedTransaction[];
  error?: string;
}

// Generate SHA-256 hash using Web Crypto API
async function generateHash(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function parseDateString(dateStr: string, format: string): string | null {
  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return null;

  // Split date components by common separators: /, -, ., space, comma
  const parts = cleanStr.split(/[-/\.\s,]+/);
  if (parts.length < 3) return null;

  const MONTH_MAP: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
  };

  let day = 1;
  let month = 0;
  let year = 2000;

  const getMonthFromString = (str: string): number | null => {
    const clean = str.toLowerCase().trim();
    if (clean in MONTH_MAP) return MONTH_MAP[clean];
    return null;
  };

  // Try to parse parts
  const p0 = parts[0];
  const p1 = parts[1];
  const p2 = parts[2];

  const val0 = parseInt(p0, 10);
  const val1 = parseInt(p1, 10);
  const val2 = parseInt(p2, 10);

  // Check if month is written as a word
  const m0 = getMonthFromString(p0);
  const m1 = getMonthFromString(p1);

  if (m0 !== null) {
    month = m0;
    day = val1;
    year = val2;
  } else if (m1 !== null) {
    day = val0;
    month = m1;
    year = val2;
  } else {
    if (isNaN(val0) || isNaN(val1) || isNaN(val2)) return null;

    let matchedFormat = format;

    if (format === 'Auto-detect' || !format) {
      if (p0.length === 4) {
        matchedFormat = 'YYYY-MM-DD';
      } else if (val0 > 12 && val1 <= 12) {
        matchedFormat = 'DD/MM/YYYY';
      } else if (val1 > 12 && val0 <= 12) {
        matchedFormat = 'MM/DD/YYYY';
      } else {
        matchedFormat = 'DD/MM/YYYY';
      }
    }

    if (matchedFormat === 'YYYY-MM-DD') {
      year = val0;
      month = val1 - 1;
      day = val2;
    } else if (matchedFormat === 'MM/DD/YYYY') {
      month = val0 - 1;
      day = val1;
      year = val2;
    } else {
      // DD/MM/YYYY
      day = val0;
      month = val1 - 1;
      year = val2;
    }
  }

  // Handle 2-digit years
  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }

  // Validate date is real
  const date = new Date(year, month, day);
  if (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  ) {
    const yStr = String(year);
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
  }

  return null;
}



self.onmessage = async (e: MessageEvent<WorkerInput>) => {
  try {
    const { fileBuffer, accountId, mapping, password, merchantRules, categoryRules } = e.data;

    let bufferToParse: any = Buffer.from(fileBuffer);

    // 1. Decrypt if needed
    if (officeCrypto.isEncrypted(bufferToParse)) {
       if (!password) {
         throw new Error("This statement is password protected, but no password was provided for this account.");
       }
       try {
         bufferToParse = await officeCrypto.decrypt(bufferToParse, { password });
       } catch (err: any) {
         throw new Error(`Failed to decrypt statement. Please check the account's saved password. (${err.message})`);
       }
    }

    // 2. Parse Excel File
    const workbook = XLSX.read(bufferToParse as any, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Get raw data as array of arrays to scan for headers manually
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    // Find the header row
    console.log(`[Worker] Scanning ${rawData.length} rows for headers matching Date="${mapping.date}", Description="${mapping.description}"...`);
    let headerRowIndex = -1;
    let colIndices: Record<string, number> = {};

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      // Look for the date and description columns (case insensitive, trim whitespace)
      const dateIdx = row.findIndex(cell => String(cell).trim().toLowerCase() === mapping.date.trim().toLowerCase());
      const descIdx = row.findIndex(cell => String(cell).trim().toLowerCase() === mapping.description.trim().toLowerCase());
      
      if (dateIdx !== -1 && descIdx !== -1) {
        headerRowIndex = i;
        colIndices['date'] = dateIdx;
        colIndices['description'] = descIdx;
        
        if (mapping.amount) colIndices['amount'] = row.findIndex(cell => String(cell).trim().toLowerCase() === mapping.amount.trim().toLowerCase());
        if (mapping.debit) colIndices['debit'] = row.findIndex(cell => String(cell).trim().toLowerCase() === mapping.debit.trim().toLowerCase());
        if (mapping.credit) colIndices['credit'] = row.findIndex(cell => String(cell).trim().toLowerCase() === mapping.credit.trim().toLowerCase());
        if (mapping.balance) colIndices['balance'] = row.findIndex(cell => String(cell).trim().toLowerCase() === mapping.balance.trim().toLowerCase());
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.error("[Worker] Header scan failed. Could not find matched columns.");
      throw new Error(`Could not find a header row containing both "${mapping.date}" and "${mapping.description}". Please check your mapping or the file contents.`);
    }

    console.log(`[Worker] Header found at row ${headerRowIndex + 1} (Excel row). Column indices:`, colIndices);

    const parsedTransactions: ParsedTransaction[] = [];
    let skippedMissingData = 0;
    let skippedZeroAmount = 0;
    const seenCounts = new Map<string, number>();

    // 2. Process rows
    console.log(`[Worker] Beginning row extraction from row ${headerRowIndex + 2} (Excel row)...`);
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      // Extract mapped fields
      const rawDate = row[colIndices['date']];
      const desc = row[colIndices['description']];
      
      // Skip if essential data is missing (often indicates end of table)
      if (!rawDate || !desc) {
         skippedMissingData++;
         continue;
      }

      let amount = 0;

      // Handle dual columns vs single column
      if (mapping.amount && colIndices['amount'] !== undefined) {
        const rawAmt = row[colIndices['amount']];
        if (typeof rawAmt === 'number') {
           amount = rawAmt;
        } else if (typeof rawAmt === 'string') {
          // Check for DR/CR
          const cleanAmt = parseFloat(rawAmt.replace(/[^\d.-]/g, ''));
          if (rawAmt.toUpperCase().includes('DR')) amount = -Math.abs(cleanAmt);
          else if (rawAmt.toUpperCase().includes('CR')) amount = Math.abs(cleanAmt);
          else amount = cleanAmt;
        }
      } else {
        const debitCell = colIndices['debit'] !== undefined ? row[colIndices['debit']] : '0';
        const creditCell = colIndices['credit'] !== undefined ? row[colIndices['credit']] : '0';
        
        const debit = parseFloat(String(debitCell || '0').replace(/[^\d.-]/g, ''));
        const credit = parseFloat(String(creditCell || '0').replace(/[^\d.-]/g, ''));
        if (debit > 0) amount = -debit;
        else if (credit > 0) amount = credit;
      }

      if (amount === 0) {
         skippedZeroAmount++;
         continue; // Skip zero amount rows
      }

      const balanceStr = colIndices['balance'] !== undefined ? row[colIndices['balance']] : '';
      const balance = balanceStr ? parseFloat(String(balanceStr).replace(/[^\d.-]/g, '')) : undefined;

      // Ensure date format is standardized (YYYY-MM-DD for Postgres)
      let finalDate = String(rawDate);
      try {
        if (typeof rawDate === 'number') {
           // Excel date number
           const date = new Date(Math.round((rawDate - 25569)*86400*1000));
           if (!isNaN(date.getTime())) finalDate = date.toISOString().split('T')[0];
        } else if (rawDate instanceof Date) {
           // JS Date object
           const y = rawDate.getUTCFullYear();
           const m = String(rawDate.getUTCMonth() + 1).padStart(2, '0');
           const d = String(rawDate.getUTCDate()).padStart(2, '0');
           finalDate = `${y}-${m}-${d}`;
        } else {
           // String date
           const parsed = parseDateString(String(rawDate), mapping.dateFormat || 'Auto-detect');
           if (parsed) {
              finalDate = parsed;
           } else {
              console.warn(`[Worker] Could not parse date format for value: "${rawDate}". Using raw string.`);
           }
        }
      } catch (e) {
        console.error(`[Worker] Error parsing date: ${rawDate}`, e);
      }

      // Categorization & Normalization
      // 1. Try to extract a cleaner merchant name using the slash parsing helper
      const extractedMerchant = getCleanDescription(desc);

      // Extract UPI/IMPS Reference Number (12 digit code)
      let reference_number: string | undefined = undefined;
      const rrnMatch = desc.match(/\b\d{12}\b/);
      if (rrnMatch) {
        reference_number = rrnMatch[0];
      }

      let normalizedMerchant = extractedMerchant;
      let assignedCategory = 'Other';

      // 2. Apply merchant rules to full description first
      let matchedRule = false;
      for (const rule of merchantRules) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(desc)) {
            normalizedMerchant = rule.normalized_merchant;
            matchedRule = true;
            break;
          }
        } catch (err) {
          // ignore invalid regex
        }
      }

      // If no explicit rule matched description, check if the extracted name matches any rules
      if (!matchedRule && extractedMerchant !== desc) {
        for (const rule of merchantRules) {
          try {
            const regex = new RegExp(rule.pattern, 'i');
            if (regex.test(extractedMerchant)) {
              normalizedMerchant = rule.normalized_merchant;
              matchedRule = true;
              break;
            }
          } catch (err) {
            // ignore
          }
        }
      }

      // 3. Apply category rules to normalized merchant
      for (const rule of categoryRules) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(normalizedMerchant)) {
            assignedCategory = rule.category;
            break;
          }
        } catch (err) {
          // ignore
        }
      }

      // 4. Apply The Signal Stack (Credit Classification Heuristics)
      if (amount > 0 && assignedCategory === 'Other') {
        const descUpper = desc.toUpperCase();
        const isRound = amount % 100 === 0 || amount % 50 === 0;
        const hasUPI = descUpper.includes('UPI');

        if (descUpper.includes('NACH CR') || descUpper.includes('ECS CR')) {
          assignedCategory = 'Salary';
        } else if (descUpper.includes('INT PAID') || descUpper.includes('INT CR') || descUpper.includes('INTEREST')) {
          assignedCategory = 'Interest';
        } else if (descUpper.includes('DIV ') || descUpper.includes('DIVIDEND')) {
          assignedCategory = 'Dividend';
        } else if (descUpper.includes('NEFT') || descUpper.includes('RTGS') || descUpper.includes('IMPS')) {
          assignedCategory = isRound ? 'Reimbursement' : 'Salary';
        } else if (hasUPI) {
          // Counterparty Type for UPI
          if (descUpper.includes('@') || isRound) {
            assignedCategory = 'Reimbursement';
          } else {
            assignedCategory = 'Refund'; // Tentative, StatementImportService will verify
          }
        } else {
          // Fallback Amount Heuristic
          assignedCategory = isRound ? 'Reimbursement' : 'Salary';
        }
      }

      // 3. Generate Fingerprint / Hash
      // SHA256(date + amount + description + accountId)
      // If sequence > 0, include it in the hash to distinguish duplicate transactions on the same day.
      const txKey = `${finalDate}|${amount}|${desc}`;
      const sequence = seenCounts.get(txKey) || 0;
      seenCounts.set(txKey, sequence + 1);

      const hashInput = sequence > 0 
        ? `${finalDate}|${amount}|${desc}|${accountId}|${sequence}`
        : `${finalDate}|${amount}|${desc}|${accountId}`;
      const hash = await generateHash(hashInput);

      // 5. Determine Internal Classification Flag
      let classification = 'unclassified';
      const catLower = assignedCategory.toLowerCase();
      const expenseCats = [
        'housing', 'food', 'transport', 'health', 'shopping', 
        'entertainment', 'subscriptions', 'education', 
        'personal care', 'financial'
      ];
      const isExpenseCat = expenseCats.includes(catLower) || catLower.includes('refund') || catLower.includes('split') || catLower.includes('settle');

      if (assignedCategory === 'Transfer') {
        classification = 'transfer';
      } else if (assignedCategory === 'Other') {
        classification = 'unclassified';
      } else if (catLower === 'investments') {
        classification = 'investment';
      } else if (assignedCategory === 'Refund') {
        classification = 'refund';
      } else if (amount > 0) {
        if (isExpenseCat) {
          classification = 'refund'; // Credit to an expense category acts as a refund
        } else {
          classification = 'income';
        }
      } else {
        classification = 'expense';
      }

      parsedTransactions.push({
        account_id: accountId,
        transaction_date: finalDate,
        description: desc.substring(0, 500), // safety truncate
        amount,
        balance,
        merchant: normalizedMerchant,
        category: assignedCategory,
        classification: classification as any,
        transaction_hash: hash,
        is_transfer: false,
        reference_number
      });
    }

    console.log(`[Worker] Finished parsing. Extracted ${parsedTransactions.length} valid transactions. Skipped missing data: ${skippedMissingData}. Skipped zero amount: ${skippedZeroAmount}.`);
    // Send back to main thread
    self.postMessage({ transactions: parsedTransactions });

  } catch (error: any) {
    self.postMessage({ error: error.message || 'Unknown error during parsing' });
  }
};
