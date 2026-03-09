import { Injectable, signal, computed, inject } from '@angular/core';
import { Income, IncomeFormat } from '../../models';
import { ApiService } from './api.service';
import { CurrencyService } from './currency.service';

interface BackendIncome {
  id: string;
  amount: number;
  currency: string;
  description: string;
  incomeDate: string;
  categoryId: string;
  categoryName: string;
  accountId: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly api = inject(ApiService);
  private readonly currency = inject(CurrencyService);

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

  loadIncomes(): void {
    this.api.getIncomes().subscribe({
      next: (res) => {
        const mapped: Income[] = (res.data as BackendIncome[]).map((i) => ({
          id: i.id,
          source: i.categoryName ?? i.description ?? 'Income',
          amountUZS: Math.round(i.amount * (i.currency === 'USD' ? this.currency.getExchangeRate() : 1)),
          format: 'bank' as IncomeFormat,
          accountId: i.accountId,
          date: new Date(i.incomeDate),
          notes: i.description,
          createdAt: new Date(i.createdAt),
        }));
        this.incomes.set(mapped);
      },
      error: () => {},
    });
  }

  addIncome(
    source: string,
    amountUZS: number,
    format: IncomeFormat,
    accountId: string,
    notes?: string
  ): void {
    const today = new Date().toISOString().slice(0, 10);
    this.api.createIncome({
      amount: amountUZS,
      currency: 'UZS',
      description: notes ?? source,
      incomeDate: today,
      categoryId: accountId,
      accountId,
    }).subscribe(() => this.loadIncomes());
  }

  removeIncome(id: string): void {
    this.api.deleteIncome(id).subscribe(() => this.loadIncomes());
  }
}
