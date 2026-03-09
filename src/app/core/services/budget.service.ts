import { Injectable, signal, computed, inject } from '@angular/core';
import { Budget, BudgetProgress, FamilyMember } from '../../models';
import { ApiService } from './api.service';

interface BackendBudget {
  id: string;
  type: string;
  categoryId: string;
  categoryName: string;
  monthlyLimit: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  year: number;
  month: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly api = inject(ApiService);

  private readonly budgets = signal<Budget[]>([]);

  private readonly family = signal<FamilyMember[]>([
    { id: 'f1', initial: 'S', name: 'Sardor', relation: 'Brother', color: '#6c5ce7', permissions: ['give', 'receive', 'debt'] },
    { id: 'f2', initial: 'M', name: 'Madina', relation: 'Sister', color: '#fd79a8', permissions: ['give', 'receive'] },
  ]);

  readonly allBudgets = this.budgets.asReadonly();
  readonly allFamily = this.family.asReadonly();

  readonly budgetProgress = computed<BudgetProgress[]>(() =>
    this.budgets().map((b) => {
      const percentage = Math.min(Math.round((b.usedUSD / b.limitUSD) * 100), 100);
      let status: 'healthy' | 'warning' | 'danger';
      let color: string;
      if (percentage >= 90) {
        status = 'danger';
        color = 'var(--danger)';
      } else if (percentage >= 70) {
        status = 'warning';
        color = 'var(--warning)';
      } else {
        status = 'healthy';
        color = 'var(--success)';
      }
      return { budget: b, percentage, status, color };
    })
  );

  readonly totalUsed = computed(() =>
    this.budgets().reduce((sum, b) => sum + b.usedUSD, 0)
  );

  readonly totalLimit = computed(() =>
    this.budgets().reduce((sum, b) => sum + b.limitUSD, 0)
  );

  loadBudgets(): void {
    const now = new Date();
    this.api.getBudgets(now.getFullYear(), now.getMonth() + 1).subscribe({
      next: (res) => {
        const mapped: Budget[] = (res.data as BackendBudget[]).map((b) => ({
          id: b.id,
          category: b.categoryName ?? b.type,
          usedUSD: b.spentAmount ?? 0,
          limitUSD: b.monthlyLimit ?? 1,
        }));
        this.budgets.set(mapped);
      },
      error: () => {},
    });
  }

  addBudget(category: string, limitUSD: number): void {
    const now = new Date();
    this.api.createBudget({
      type: 'MONTHLY',
      monthlyLimit: Math.max(limitUSD, 1),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }).subscribe(() => this.loadBudgets());
  }

  addSpending(budgetId: string, amountUSD: number): void {
    this.budgets.update((list) =>
      list.map((b) =>
        b.id === budgetId ? { ...b, usedUSD: b.usedUSD + amountUSD } : b
      )
    );
  }

  addFamilyMember(name: string, color: string, relation = 'Other'): void {
    const member: FamilyMember = {
      id: `f_${Date.now()}`,
      initial: name.charAt(0).toUpperCase(),
      name,
      relation,
      color,
      permissions: ['give', 'receive', 'debt'],
    };
    this.family.update((list) => [...list, member]);
  }

  removeFamilyMember(id: string): void {
    this.family.update((list) => list.filter((m) => m.id !== id));
  }
}
