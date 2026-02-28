export type TransactionType = 'expense' | 'income';
export type TransactionCategory = 'Food' | 'Taxi' | 'Salary' | 'Utilities' | 'Shopping' | 'Transfer' | 'Freelance' | 'Rent' | 'Other';
export type IncomeFormat = 'cash' | 'card' | 'bank' | 'crypto';

export interface Transaction {
  readonly id: string;
  type: TransactionType;
  category: TransactionCategory;
  amountUZS: number;
  accountId: string;
  description?: string;
  date: Date;
  createdAt: Date;
}

export interface Income {
  readonly id: string;
  source: string;
  amountUZS: number;
  format: IncomeFormat;
  accountId: string;
  date: Date;
  notes?: string;
  createdAt: Date;
}
