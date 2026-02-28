import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="top-nav">
      <div class="nav-container">
        <a class="nav-brand" routerLink="/dashboard">💰 FinEco</a>
        <div class="nav-links">
          <a class="nav-link" routerLink="/dashboard" routerLinkActive="nav-link--active">
            <span class="nav-link__icon">📊</span>
            <span class="nav-link__text">Dashboard</span>
          </a>
          <a class="nav-link" routerLink="/wallets" routerLinkActive="nav-link--active">
            <span class="nav-link__icon">💳</span>
            <span class="nav-link__text">Wallets</span>
          </a>
          <a class="nav-link" routerLink="/debts" routerLinkActive="nav-link--active">
            <span class="nav-link__icon">📋</span>
            <span class="nav-link__text">Debts</span>
          </a>
          <a class="nav-link" routerLink="/income" routerLinkActive="nav-link--active">
            <span class="nav-link__icon">💰</span>
            <span class="nav-link__text">Income</span>
          </a>
          <a class="nav-link" routerLink="/budget" routerLinkActive="nav-link--active">
            <span class="nav-link__icon">📊</span>
            <span class="nav-link__text">Budget</span>
          </a>
          <a class="nav-link" routerLink="/analytics" routerLinkActive="nav-link--active">
            <span class="nav-link__icon">📈</span>
            <span class="nav-link__text">Analytics</span>
          </a>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.scss',
})
export class App {}
