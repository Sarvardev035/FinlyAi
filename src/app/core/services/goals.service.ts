import { Injectable, signal, computed } from '@angular/core';
import { SavingsGoal, GoalType, SpendingLimit } from '../../models';

const GOAL_PRESETS: { name: string; icon: string; type: GoalType; color: string }[] = [
  { name: 'Samarkand Trip', icon: '✈️', type: 'travel', color: '#0984e3' },
  { name: 'New Car', icon: '🚗', type: 'vehicle', color: '#00d68f' },
  { name: 'Business Fund', icon: '💼', type: 'business', color: '#6c5ce7' },
  { name: 'Emergency', icon: '🏥', type: 'emergency', color: '#ff6b6b' },
];

@Injectable({ providedIn: 'root' })
export class GoalsService {
  private readonly goals = signal<SavingsGoal[]>([
    {
      id: 'g1',
      name: 'Samarkand Trip',
      icon: '✈️',
      type: 'travel',
      targetUZS: 15000000,
      currentUZS: 4500000,
      color: '#0984e3',
      createdAt: new Date('2026-01-15'),
    },
    {
      id: 'g2',
      name: 'New Car',
      icon: '🚗',
      type: 'vehicle',
      targetUZS: 120000000,
      currentUZS: 28000000,
      color: '#00d68f',
      createdAt: new Date('2025-11-01'),
    },
    {
      id: 'g3',
      name: 'Business Fund',
      icon: '💼',
      type: 'business',
      targetUZS: 50000000,
      currentUZS: 12000000,
      color: '#6c5ce7',
      createdAt: new Date('2026-02-01'),
    },
    {
      id: 'g4',
      name: 'Emergency',
      icon: '🏥',
      type: 'emergency',
      targetUZS: 10000000,
      currentUZS: 7500000,
      color: '#ff6b6b',
      createdAt: new Date('2025-12-20'),
    },
  ]);

  private readonly spendingLimits = signal<SpendingLimit>({
    daily: 500000,
    monthly: 8000000,
  });

  readonly allGoals = this.goals.asReadonly();
  readonly limits = this.spendingLimits.asReadonly();

  readonly totalSaved = computed(() =>
    this.goals().reduce((sum, g) => sum + g.currentUZS, 0)
  );

  readonly totalTarget = computed(() =>
    this.goals().reduce((sum, g) => sum + g.targetUZS, 0)
  );

  readonly overallProgress = computed(() => {
    const target = this.totalTarget();
    return target > 0 ? Math.round((this.totalSaved() / target) * 100) : 0;
  });

  readonly presets = GOAL_PRESETS;

  addGoal(name: string, icon: string, type: GoalType, targetUZS: number, color: string): void {
    const goal: SavingsGoal = {
      id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      icon,
      type,
      targetUZS: Math.max(targetUZS, 1),
      currentUZS: 0,
      color,
      createdAt: new Date(),
    };
    this.goals.update((list) => [...list, goal]);
  }

  addFunds(goalId: string, amountUZS: number): boolean {
    const goal = this.goals().find((g) => g.id === goalId);
    if (!goal || amountUZS <= 0) return false;
    this.goals.update((list) =>
      list.map((g) =>
        g.id === goalId
          ? { ...g, currentUZS: Math.min(g.currentUZS + amountUZS, g.targetUZS) }
          : g
      )
    );
    return true;
  }

  removeGoal(id: string): void {
    this.goals.update((list) => list.filter((g) => g.id !== id));
  }

  setDailyLimit(amount: number): void {
    this.spendingLimits.update((l) => ({ ...l, daily: Math.max(amount, 0) }));
  }

  setMonthlyLimit(amount: number): void {
    this.spendingLimits.update((l) => ({ ...l, monthly: Math.max(amount, 0) }));
  }

  getGoalProgress(goal: SavingsGoal): number {
    return goal.targetUZS > 0 ? Math.round((goal.currentUZS / goal.targetUZS) * 100) : 0;
  }
}
