export type DebtType = 'owed' | 'collect';
export type DebtStatus = 'OPEN' | 'CLOSED';

export interface Debt {
  readonly id: string;
  type: DebtType;
  personName: string;
  amountUZS: number;
  status: DebtStatus;
  dueDate: Date;
  notes?: string;
  createdAt: Date;
}

export interface DebtAlert {
  debt: Debt;
  daysRemaining: number;
  isOverdue: boolean;
  isUrgent: boolean;
}
