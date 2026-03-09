import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  /* ── Public auth routes ─────────────────────────────────────────────── */
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },

  /* ── Protected app routes ───────────────────────────────────────────── */
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'wallets',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/wallets/wallets.component').then((m) => m.WalletsComponent),
  },
  {
    path: 'debts',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/debts/debts.component').then((m) => m.DebtsComponent),
  },
  {
    path: 'income',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/income/income.component').then((m) => m.IncomeComponent),
  },
  {
    path: 'budget',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/budget/budget.component').then((m) => m.BudgetComponent),
  },
  {
    path: 'analytics',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
