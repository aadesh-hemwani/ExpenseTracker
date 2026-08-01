import { supabase } from '../../lib/supabase';
import { ParsedTransaction, Transaction } from '../../types/analytics';
import { WorkerInput } from '../../workers/statementProcessor.worker';
import { TransferMatcher } from './TransferMatcher';

export class StatementImportService {

  /**
   * Main entry point for processing a statement.
   * 1. Fetches rules & existing transactions
   * 2. Offloads parsing to Web Worker
   * 3. Filters duplicates
   * 4. Detects transfers
   * 5. Bulk inserts into Supabase
   */
  static async processStatement(
    file: File,
    accountId: string,
    mapping: WorkerInput['mapping'],
    fileName: string,
    password?: string
  ): Promise<{ insertedCount: number; duplicateCount: number; transferCount: number }> {

    console.log(`[ImportService] Starting import for file: ${fileName}, Account: ${accountId}`);

    // 1. Fetch rules first
    console.log(`[ImportService] Fetching rules from Supabase...`);
    const rulesRes = await this.fetchRules();

    // 2. Read file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 3. Offload to Web Worker
    console.log(`[ImportService] Sending buffer to Web Worker for parsing...`);
    const parsedTransactions = await this.runWorker({
      fileBuffer: arrayBuffer,
      accountId,
      mapping,
      password,
      merchantRules: rulesRes.merchantRules,
      categoryRules: rulesRes.categoryRules
    });

    console.log(`[ImportService] Worker returned ${parsedTransactions.length} parsed transactions.`);

    if (parsedTransactions.length === 0) {
      console.log(`[ImportService] 0 parsed transactions. Aborting import.`);
      return { insertedCount: 0, duplicateCount: 0, transferCount: 0 };
    }

    // 3.5 Smart Classification Learning
    console.log(`[ImportService] Fetching historical classifications for learning...`);
    const uniqueMerchants = [...new Set(parsedTransactions.map(t => t.merchant).filter(Boolean))] as string[];
    
    if (uniqueMerchants.length > 0) {
      const { data: learningRules } = await supabase
        .from('classification_learning')
        .select('merchant, direction, classification')
        .in('merchant', uniqueMerchants);

      if (learningRules && learningRules.length > 0) {
        const learningMap: Record<string, string> = {};
        for (const rule of learningRules) {
          const key = `${rule.merchant}_${rule.direction}`;
          learningMap[key] = rule.classification;
        }

        let learnedCount = 0;
        for (const pt of parsedTransactions) {
          if (!pt.merchant) continue;
          const direction = pt.amount < 0 ? 'dr' : 'cr';
          const key = `${pt.merchant}_${direction}`;
          if (learningMap[key] && pt.classification !== learningMap[key]) {
            pt.classification = learningMap[key] as any;
            learnedCount++;
          }
        }
        console.log(`[ImportService] Smart Classification applied to ${learnedCount} transactions based on learning map.`);
      }
    }

    // 4. Calculate transaction date range and fetch existing transactions
    // Sort transactions by date (alphabetical since it's YYYY-MM-DD) to get min/max dates
    const dateSorted = [...parsedTransactions]
      .filter(t => t.transaction_date)
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

    if (dateSorted.length === 0) {
      console.log(`[ImportService] No transactions with valid dates. Aborting import.`);
      return { insertedCount: 0, duplicateCount: 0, transferCount: 0 };
    }

    const minParsedDate = dateSorted[0].transaction_date;
    const maxParsedDate = dateSorted[dateSorted.length - 1].transaction_date;

    // Safety pad of 60 days before min (for Refund Matching) and 3 days after max
    const queryMinDate = this.addDays(minParsedDate, -60);
    const queryMaxDate = this.addDays(maxParsedDate, 3);

    console.log(`[ImportService] Statement Date Range: ${minParsedDate} to ${maxParsedDate}`);
    console.log(`[ImportService] Fetching transactions in range ${queryMinDate} to ${queryMaxDate} from Supabase...`);

    const existingTransactions = await this.fetchTransactionsInRange(queryMinDate, queryMaxDate);
    const existingHashes = new Set(existingTransactions.map(t => t.transaction_hash));
    console.log(`[ImportService] Fetched ${existingTransactions.length} transactions in range. Found ${existingHashes.size} unique hashes.`);

    // 5. Filter duplicates locally
    const uniqueTransactions: ParsedTransaction[] = [];
    let duplicateCount = 0;

    for (const pt of parsedTransactions) {
      if (existingHashes.has(pt.transaction_hash)) {
        duplicateCount++;
      } else {
        uniqueTransactions.push(pt);
      }
    }

    if (uniqueTransactions.length === 0) {
      console.log(`[ImportService] 0 unique transactions found. Aborting import.`);
      return { insertedCount: 0, duplicateCount, transferCount: 0 };
    }

    console.log(`[ImportService] Found ${uniqueTransactions.length} unique transactions. Running TransferMatcher...`);

    // 6. Transfer Detection
    const { updatedTransactions, newTransfers, matchedExistingTransactions } = TransferMatcher.detectTransfers(uniqueTransactions, existingTransactions);

    console.log(`[ImportService] TransferMatcher found ${newTransfers.length} potential transfers.`);

    // 6.5 Refund Matching
    console.log(`[ImportService] Running Refund Matching...`);
    const sameBatchRefundLinks: { refundIndex: number, debitIndex: number }[] = [];

    for (let i = 0; i < updatedTransactions.length; i++) {
      const tx1 = updatedTransactions[i];
      if (tx1.amount > 0 && !tx1.is_transfer && (tx1.category === 'Refund' || tx1.category === 'Other')) {
        // Need a valid merchant to match
        if (!tx1.merchant || tx1.merchant === 'Other' || tx1.merchant === 'Unknown') continue;

        // Combine existing and new debits for the same merchant and account
        const allDebits = [
          ...existingTransactions.map(t => ({ ...t, isNew: false, index: -1 })),
          ...updatedTransactions.map((t, idx) => ({ ...t, isNew: true, index: idx }))
        ].filter(t => 
           t.amount < 0 && 
           !t.is_transfer && 
           t.account_id === tx1.account_id &&
           t.merchant === tx1.merchant
        );

        // Sort by date descending (most recent first)
        allDebits.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

        const targetAmount = Math.abs(tx1.amount);
        const tx1Date = new Date(tx1.transaction_date).getTime();

        for (const debit of allDebits) {
           // Exact RRN Match overrides amount/date heuristics
           if (tx1.reference_number && debit.reference_number && tx1.reference_number === debit.reference_number) {
                 tx1.category = 'Refund';
                 tx1.classification = 'refund';
                 if (!debit.isNew && (debit as any).id) {
                   tx1.linked_transaction_id = (debit as any).id;
                 } else {
                   sameBatchRefundLinks.push({ refundIndex: i, debitIndex: debit.index });
                 }
                 break;
           }

           const debitDate = new Date(debit.transaction_date).getTime();
           const daysDiff = (tx1Date - debitDate) / (1000 * 60 * 60 * 24);

           if (daysDiff >= 0 && daysDiff <= 60) {
             const debitAmt = Math.abs(debit.amount);
             // Exact or +/- 5%
             if (Math.abs(debitAmt - targetAmount) <= debitAmt * 0.05) {
                // Match found!
                tx1.category = 'Refund';
                tx1.classification = 'refund';
                 if (!debit.isNew && (debit as any).id) {
                   tx1.linked_transaction_id = (debit as any).id; // Existing transaction
                 } else {
                  // Same batch
                  sameBatchRefundLinks.push({ refundIndex: i, debitIndex: debit.index });
                }
                break;
             }
           }
        }
      }
    }

    // 7. Database Insertion
    console.log(`[ImportService] Preparing to insert statement record...`);
    // A. Insert Statement record
    const dates = updatedTransactions
      .map(t => new Date(t.transaction_date).getTime())
      .filter(t => !isNaN(t)); // Filter out invalid dates before min/max calculation

    let minDate = new Date().toISOString().split('T')[0];
    let maxDate = minDate;

    if (dates.length > 0) {
      minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
      maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
    }

    const { data: statement, error: stmtError } = await supabase
      .from('statements')
      .insert({
        account_id: accountId,
        file_name: fileName,
        statement_start_date: minDate,
        statement_end_date: maxDate
      })
      .select('id')
      .single();

    if (stmtError) {
      console.error(`[ImportService] Statement Insert Error:`, stmtError);
      throw new Error(`Failed to create statement: ${stmtError.message}`);
    }

    // B. Assign statement_id and Insert Transactions
    const transactionsToInsert = updatedTransactions.map(t => ({
      ...t,
      statement_id: statement.id
    }));

    console.log(`[ImportService] Statement inserted with ID: ${statement.id}. Preparing ${transactionsToInsert.length} transactions for bulk insert...`);

    const { data: insertedTxs, error: txError } = await supabase
      .from('transactions')
      .insert(transactionsToInsert)
      .select('id, transaction_hash'); // Need IDs to create transfer links

    if (txError) {
      console.error(`[ImportService] Transactions Insert Error:`, txError);
      throw new Error(`Failed to insert transactions: ${txError.message}`);
    }

    console.log(`[ImportService] Successfully inserted ${insertedTxs?.length || 0} transactions.`);

    // 7.5 Update Same-Batch Refund Links
    if (sameBatchRefundLinks.length > 0 && insertedTxs) {
       console.log(`[ImportService] Linking ${sameBatchRefundLinks.length} same-batch refunds...`);
       const updates = sameBatchRefundLinks.map(link => {
         const refundTxId = insertedTxs[link.refundIndex].id;
         const debitTxId = insertedTxs[link.debitIndex].id;
         return supabase
           .from('transactions')
           .update({ linked_transaction_id: debitTxId })
           .eq('id', refundTxId);
       });
       await Promise.all(updates);
    }

    // C. Insert Transfers (if any)
    if (newTransfers.length > 0 && insertedTxs) {
      console.log(`[ImportService] Inserting ${newTransfers.length} transfers...`);
      const transfersToInsert = newTransfers.map(tr => {
        let fromId = tr.from_transaction_id;
        let toId = tr.to_transaction_id;

        if (fromId.startsWith('NEW_')) {
          const idx = parseInt(fromId.split('_')[1], 10);
          fromId = insertedTxs[idx].id;
        }
        if (toId.startsWith('NEW_')) {
          const idx = parseInt(toId.split('_')[1], 10);
          toId = insertedTxs[idx].id;
        }

        return {
          from_transaction_id: fromId,
          to_transaction_id: toId
        };
      });

      const { error: transferError } = await supabase
        .from('transfers')
        .insert(transfersToInsert);

      if (transferError) {
        console.error(`[ImportService] Error inserting transfers:`, transferError);
      }
    }

    // D. Update matched existing transactions in the database to be marked as transfers
    if (matchedExistingTransactions.length > 0) {
      const existingIdsToUpdate = matchedExistingTransactions.map(t => t.id);
      console.log(`[ImportService] Updating ${existingIdsToUpdate.length} existing transactions in database to be marked as transfers...`);
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ is_transfer: true, category: 'Transfer', classification: 'transfer' })
        .in('id', existingIdsToUpdate);

      if (updateError) {
        console.error(`[ImportService] Error updating existing transfers:`, updateError);
      }
    }

    return {
      insertedCount: uniqueTransactions.length,
      duplicateCount,
      transferCount: newTransfers.length
    };
  }

  private static async fetchRules() {
    const [{ data: merchantRules }, { data: categoryRules }] = await Promise.all([
      supabase.from('merchant_rules').select('*'),
      supabase.from('category_rules').select('*')
    ]);
    return {
      merchantRules: merchantRules || [],
      categoryRules: categoryRules || []
    };
  }

  private static addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }

  private static async fetchTransactionsInRange(minDate: string, maxDate: string): Promise<Transaction[]> {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', minDate)
      .lte('transaction_date', maxDate);

    return data || [];
  }

  private static runWorker(input: WorkerInput): Promise<ParsedTransaction[]> {
    return new Promise((resolve, reject) => {
      // Vite Web Worker syntax
      const worker = new Worker(new URL('../../workers/statementProcessor.worker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(new Error(e.data.error));
        } else {
          resolve(e.data.transactions);
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage(input, [input.fileBuffer]); // Transfer ownership of buffer
    });
  }
}
