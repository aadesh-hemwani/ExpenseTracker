export interface Account {
  id: string;
  firebase_uid: string;
  bank_name: string;
  account_name: string;
  created_at: string;
}

export interface Statement {
  id: string;
  account_id: string;
  file_name: string;
  statement_start_date?: string;
  statement_end_date?: string;
  uploaded_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  statement_id: string;
  transaction_date: string;
  description: string;
  amount: number;
  balance?: number;
  merchant?: string;
  category?: string;
  transaction_hash: string;
  is_transfer: boolean;
  classification?: 'income' | 'expense' | 'investment' | 'refund' | 'transfer' | 'unclassified';
  linked_transaction_id?: string;
  reference_number?: string;
  created_at: string;
}

export interface Transfer {
  id: string;
  from_transaction_id: string;
  to_transaction_id: string;
}

export interface MerchantRule {
  id: string;
  pattern: string;
  normalized_merchant: string;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  category: string;
}

export interface Subscription {
  id: string;
  merchant: string;
  average_amount: number;
  billing_frequency: string;
}

export interface AnalyticsCache {
  id: string;
  firebase_uid: string;
  metric_name: string;
  metric_value: number;
  period: string;
  generated_at: string;
}

// For use in the parser/normalizer before generating IDs
export type ParsedTransaction = Omit<Transaction, 'id' | 'statement_id' | 'created_at'> & {
  statement_id?: string;
};
