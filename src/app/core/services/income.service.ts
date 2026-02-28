import { Injectable, signal, computed } from '@angular/core';
import { Income, IncomeFormat } from '../../models';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly incomes = signal<Income[]>([]);

  readonly allIncomes = this.incomes.asReadonly();

  readonly totalIncome = computed(() =>
    this.incomes().reduce((sum, inc) => sum + inc.amountUZS, 0)
  );

  readonly incomeByFormat = computed(() => {
    const grouped: Record<IncomeFormat, number> = {
      cash: 0,
      card: 0,
      bank: 0,
      crypto: 0,
    };
    for (const inc of this.incomes()) {
      grouped[inc.format] += inc.amountUZS;
    }
    return grouped;
  });

  readonly recentIncomes = computed(() =>
    [...this.incomes()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  );

  addIncome(
    source: string,
    amountUZS: number,
    format: IncomeFormat,
    accountId: string,
    notes?: string
  ): void {
    const income: Income = {
      id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      source,
      amountUZS: Math.max(amountUZS, 0),
      format,
      accountId,
      date: new Date(),
      notes,
      createdAt: new Date(),
    };
    this.incomes.update((list) => [...list, income]);
  }

  removeIncome(id: string): void {
    this.incomes.update((list) => list.filter((inc) => inc.id !== id));
  }
}
