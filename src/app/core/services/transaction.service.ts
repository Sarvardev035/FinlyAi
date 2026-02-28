import { Injectable, signal, computed } from '@angular/core';
import { Transaction, TransactionType, TransactionCategory } from '../../models';
import { AccountService } from './account.service';
import { IncomeService } from './income.service';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly transactions = signal<Transaction[]>([]);

  readonly allTransactions = this.transactions.asReadonly();

  readonly totalExpenses = computed(() =>
    this.transactions()
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amountUZS, 0)
  );

  readonly totalIncome = computed(() =>
    this.incomeService.totalIncome()
  );

  readonly recentTransactions = computed(() =>
    [...this.transactions()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20)
  );

  readonly categoryBreakdown = computed(() => {
    const breakdown: Record<string, number> = {};
    for (const t of this.transactions().filter((tx) => tx.type === 'expense')) {
      breakdown[t.category] = (breakdown[t.category] || 0) + t.amountUZS;
    }
    return breakdown;
  });

  constructor(
    private readonly accountService: AccountService,
    private readonly incomeService: IncomeService
  ) {}

  addTransaction(
    type: TransactionType,
    category: TransactionCategory,
    amountUZS: number,
    accountId: string,
    description?: string
  ): boolean {
    if (type === 'expense') {
      const success = this.accountService.deductBalance(accountId, amountUZS);
      if (!success) return false;
    } else {
      this.accountService.updateBalance(accountId, amountUZS);
    }

    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      category,
      amountUZS: Math.max(amountUZS, 0),
      accountId,
      description,
      date: new Date(),
      createdAt: new Date(),
    };
    this.transactions.update((list) => [...list, transaction]);
    return true;
  }
}
