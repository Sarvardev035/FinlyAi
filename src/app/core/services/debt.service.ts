import { Injectable, signal, computed } from '@angular/core';
import { Debt, DebtType, DebtStatus, DebtAlert } from '../../models';

@Injectable({ providedIn: 'root' })
export class DebtService {
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

  addDebt(
    personName: string,
    amountUZS: number,
    type: DebtType,
    dueDate: Date,
    notes?: string
  ): void {
    const debt: Debt = {
      id: `debt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      personName,
      amountUZS: Math.max(amountUZS, 0),
      status: 'OPEN',
      dueDate,
      notes,
      createdAt: new Date(),
    };
    this.debts.update((list) => [...list, debt]);
  }

  closeDebt(id: string): void {
    this.debts.update((list) =>
      list.map((d) => (d.id === id ? { ...d, status: 'CLOSED' as DebtStatus } : d))
    );
  }

  removeDebt(id: string): void {
    this.debts.update((list) => list.filter((d) => d.id !== id));
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
