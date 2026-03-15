import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ToastOutletComponent } from './shared/components/toast-outlet/toast-outlet.component';
import { HelpBotComponent } from './shared/components/help-bot/help-bot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ToastOutletComponent, HelpBotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isAuthRoute()) {
      <nav class="top-nav">
        <div class="nav-container">
          <a class="nav-brand" routerLink="/dashboard">💰 FinEco</a>
          
          <!-- Desktop Links -->
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
              <span class="nav-link__icon">📈</span>
              <span class="nav-link__text">Budget</span>
            </a>
            <a class="nav-link" routerLink="/analytics" routerLinkActive="nav-link--active">
              <span class="nav-link__icon">📉</span>
              <span class="nav-link__text">Analytics</span>
            </a>
          </div>

          <!-- User & Actions -->
          <div class="nav-actions">
            <div class="nav-user">
              @if (authService.currentUser(); as user) {
                <span class="nav-user__name">👤 {{ user.fullName }}</span>
              }
              <button class="nav-logout" (click)="logout()" aria-label="Sign out">
                Sign out
              </button>
            </div>
            
            <!-- Hamburger -->
            <button class="hamburger" [class.hamburger--active]="isMenuOpen()" (click)="toggleMenu()">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Mobile Menu Overlay -->
      <div class="mobile-menu" [class.mobile-menu--open]="isMenuOpen()">
        <a class="nav-link" routerLink="/dashboard" routerLinkActive="nav-link--active" (click)="closeMenu()">📊 Dashboard</a>
        <a class="nav-link" routerLink="/wallets" routerLinkActive="nav-link--active" (click)="closeMenu()">💳 Wallets</a>
        <a class="nav-link" routerLink="/debts" routerLinkActive="nav-link--active" (click)="closeMenu()">📋 Debts</a>
        <a class="nav-link" routerLink="/income" routerLinkActive="nav-link--active" (click)="closeMenu()">💰 Income</a>
        <a class="nav-link" routerLink="/budget" routerLinkActive="nav-link--active" (click)="closeMenu()">📈 Budget</a>
        <a class="nav-link" routerLink="/analytics" routerLinkActive="nav-link--active" (click)="closeMenu()">📉 Analytics</a>
      </div>
    }
    
    <main [class.main-content]="!isAuthRoute()">
      <router-outlet />
    </main>
    <app-toast-outlet />
    @if (!isAuthRoute()) {
      <app-help-bot />
    }
  `,
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly isMenuOpen = signal(false);

  private readonly routerUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /** True when the current route is /login or /register — hides the nav. */
  readonly isAuthRoute = computed(() => {
    const url = this.routerUrl();
    return url?.startsWith('/login') || url?.startsWith('/register');
  });

  toggleMenu(): void {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }
}
