import { ParsedTransaction, Transaction, Transfer } from '../../types/analytics';

interface TransferMatchResult {
  updatedTransactions: ParsedTransaction[];
  newTransfers: Omit<Transfer, 'id'>[]; // Without ID since they aren't saved yet
  matchedExistingTransactions: Transaction[];
}

export class TransferMatcher {

  /**
   * Detects internal transfers between the newly parsed transactions and existing transactions.
   * Modifies the `is_transfer` flag on the matching transactions.
   */
  static detectTransfers(
    parsedTransactions: ParsedTransaction[],
    existingTransactions: Transaction[]
  ): TransferMatchResult {

    const newTransfers: Omit<Transfer, 'id'>[] = [];
    const matchedExistingTransactions: Transaction[] = [];

    // Create a pool of all transactions we can match against
    // We only care about transactions that are NOT already marked as transfers
    const availableExisting = existingTransactions.filter(t => !t.is_transfer);

    // We also need to be able to match new transactions against other new transactions
    // (e.g., if the user uploads 2 statements at once)
    const availableNew = [...parsedTransactions];

    for (let i = 0; i < availableNew.length; i++) {
      const tx1 = availableNew[i];
      if (tx1.is_transfer) continue; // Already matched

      // Look for a match in the existing transactions
      let matchIdx = availableExisting.findIndex(tx2 => this.isMatch(tx1, tx2));
      if (matchIdx !== -1) {
        const tx2 = availableExisting[matchIdx];

        // Match found!
        tx1.is_transfer = true;
        tx1.category = 'Transfer';
        tx1.classification = 'transfer';

        // Update the existing transaction representation
        tx2.is_transfer = true;
        tx2.category = 'Transfer';
        tx2.classification = 'transfer';
        matchedExistingTransactions.push(tx2);

        newTransfers.push({
          from_transaction_id: tx1.amount < 0 ? `NEW_${i}` : tx2.id,
          to_transaction_id: tx1.amount > 0 ? `NEW_${i}` : tx2.id
        });

        // Remove from available pool
        availableExisting.splice(matchIdx, 1);
        continue;
      }

      // If not found in existing, look in the rest of the new transactions
      matchIdx = availableNew.findIndex((tx2, idx) => idx > i && !tx2.is_transfer && this.isMatch(tx1, tx2 as Transaction));
      if (matchIdx !== -1) {
        const tx2 = availableNew[matchIdx];

        tx1.is_transfer = true;
        tx1.category = 'Transfer';
        tx1.classification = 'transfer';
        tx2.is_transfer = true;
        tx2.category = 'Transfer';
        tx2.classification = 'transfer';

        newTransfers.push({
          from_transaction_id: tx1.amount < 0 ? `NEW_${i}` : `NEW_${matchIdx}`,
          to_transaction_id: tx1.amount > 0 ? `NEW_${i}` : `NEW_${matchIdx}`
        });
      }
    }

    return {
      updatedTransactions: availableNew,
      newTransfers,
      matchedExistingTransactions
    };
  }

  private static isMatch(tx1: ParsedTransaction | Transaction, tx2: ParsedTransaction | Transaction): boolean {
    // Must be from different accounts
    if (tx1.account_id === tx2.account_id) return false;

    // Must be equal and opposite amounts
    if (Math.abs(tx1.amount) !== Math.abs(tx2.amount)) return false;
    if (Math.sign(tx1.amount) === Math.sign(tx2.amount)) return false;

    // Exact RRN Match overrides time proximity (if both are present)
    if (tx1.reference_number && tx2.reference_number && tx1.reference_number === tx2.reference_number) {
      return true; // 100% deterministic transfer
    }

    // Time proximity: within 3 days
    const date1 = new Date(tx1.transaction_date).getTime();
    const date2 = new Date(tx2.transaction_date).getTime();
    const diffDays = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);

    if (diffDays > 3) return false;

    // Optional: Keyword matching (NEFT, IMPS, TRANSFER) could increase confidence
    // but amounts + dates + opposite signs + different accounts is usually enough for personal finance.

    return true;
  }
}
