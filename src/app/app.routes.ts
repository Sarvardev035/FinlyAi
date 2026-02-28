import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'wallets',
    loadComponent: () =>
      import('./features/wallets/wallets.component').then((m) => m.WalletsComponent),
  },
  {
    path: 'debts',
    loadComponent: () =>
      import('./features/debts/debts.component').then((m) => m.DebtsComponent),
  },
  {
    path: 'income',
    loadComponent: () =>
      import('./features/income/income.component').then((m) => m.IncomeComponent),
  },
  {
    path: 'budget',
    loadComponent: () =>
      import('./features/budget/budget.component').then((m) => m.BudgetComponent),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
