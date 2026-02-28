export interface Budget {
  readonly id: string;
  category: string;
  usedUSD: number;
  limitUSD: number;
}

export interface BudgetProgress {
  budget: Budget;
  percentage: number;
  status: 'healthy' | 'warning' | 'danger';
  color: string;
}

export type GoalType = 'travel' | 'vehicle' | 'business' | 'emergency' | 'education' | 'custom';

export interface SavingsGoal {
  readonly id: string;
  name: string;
  icon: string;
  type: GoalType;
  targetUZS: number;
  currentUZS: number;
  color: string;
  createdAt: Date;
}

export interface SpendingLimit {
  daily: number;
  monthly: number;
}

export type FamilyPermission = 'give' | 'receive' | 'debt';

export interface FamilyMember {
  readonly id: string;
  initial: string;
  name: string;
  relation: string;
  color: string;
  permissions: FamilyPermission[];
}

export type FamilyTransactionType = 'give' | 'receive' | 'debt';
export type FamilyTransactionStatus = 'completed' | 'pending';

export interface FamilyTransaction {
  readonly id: string;
  memberId: string;
  type: FamilyTransactionType;
  amountUZS: number;
  accountId: string;
  note?: string;
  status: FamilyTransactionStatus;
  date: Date;
  createdAt: Date;
}
