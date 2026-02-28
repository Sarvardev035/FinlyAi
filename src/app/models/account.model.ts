export type AccountType = 'humo' | 'uzcard' | 'visa' | 'mastercard' | 'cash' | 'crypto' | string;

export interface Account {
  readonly id: string;
  name: string;
  type: AccountType;
  balanceUZS: number;
  currency: 'UZS';
  isActive: boolean;
  createdAt: Date;
}

export interface AccountSummary {
  totalBalanceUZS: number;
  totalBalanceUSD: number;
  accountCount: number;
}
