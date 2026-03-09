import { Injectable, signal, computed, inject } from '@angular/core';
import { Debt, DebtType, DebtStatus, DebtAlert } from '../../models';
import { ApiService } from './api.service';
import { CurrencyService } from './currency.service';

interface BackendDebt {
  id: string;
  personName: string;
  type: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  accountId: string;
  description: string;
  status: string;
  dueDate: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class DebtService {
  private readonly api = inject(ApiService);
  private readonly currency = inject(CurrencyService);

  private readonly debts = signal<Debt[]>([]);

  readonly allDebts = this.debts.asReadonly();

  readonly owedDebts = computed(() =>
    this.debts().filter((d) => d.type === 'owed' && d.status === 'OPEN')
  );

  readonly collectDebts = computed(() =>
    this.debts().filter((d) => d.type === 'collect' && d.status === 'OPEN')
  );

  readonly totalOwed = computed(() =>
    this.owedDebts().reduce((sum, d) => sum + d.amountUZS, 0)
  );

  readonly totalCollect = computed(() =>
    this.collectDebts().reduce((sum, d) => sum + d.amountUZS, 0)
  );

  readonly alerts = computed<DebtAlert[]>(() =>
    this.debts()
      .filter((d) => d.status === 'OPEN' && d.dueDate)
      .map((d) => this.calculateAlert(d))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
  );

  readonly urgentAlerts = computed(() =>
    this.alerts().filter((a) => a.isUrgent || a.isOverdue)
  );

  loadDebts(): void {
    this.api.getDebts().subscribe({
      next: (res) => {
        const mapped: Debt[] = (res.data as BackendDebt[]).map((d) => ({
          id: d.id,
          type: d.type === 'DEBT' ? 'owed' : 'collect' as DebtType,
          personName: d.personName,
          amountUZS: Math.round((d.remainingAmount ?? d.amount) * (d.currency === 'USD' ? this.currency.getExchangeRate() : 1)),
          status: d.status as DebtStatus,
          dueDate: new Date(d.dueDate),
          notes: d.description,
          createdAt: new Date(d.createdAt),
        }));
        this.debts.set(mapped);
      },
      error: () => {},
    });
  }

  addDebt(
    personName: string,
    amountUZS: number,
    type: DebtType,
    dueDate: Date,
    notes?: string
  ): void {
    this.api.createDebt({
      personName,
      type: type === 'owed' ? 'DEBT' : 'RECEIVABLE',
      amount: amountUZS,
      currency: 'UZS',
      dueDate: dueDate.toISOString().slice(0, 10),
      description: notes,
    }).subscribe(() => this.loadDebts());
  }

  closeDebt(id: string): void {
    this.api.repayDebt(id, { paymentAmount: 0 }).subscribe(() => this.loadDebts());
  }

  removeDebt(id: string): void {
    this.api.deleteDebt(id).subscribe(() => this.loadDebts());
  }

  private calculateAlert(debt: Debt): DebtAlert {
    const now = new Date();
    const due = new Date(debt.dueDate);
    const diffMs = due.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      debt,
      daysRemaining,
      isOverdue: daysRemaining < 0,
      isUrgent: daysRemaining >= 0 && daysRemaining <= 3,
    };
  }
}
