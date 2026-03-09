import { Injectable, inject, signal, computed } from '@angular/core';
import { Account, AccountSummary } from '../../models';
import { CurrencyService } from './currency.service';
import { ApiService } from './api.service';

interface BackendAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly currency = inject(CurrencyService);
  private readonly api = inject(ApiService);

  private readonly accounts = signal<Account[]>([]);
  private _loaded = false;

  readonly allAccounts = this.accounts.asReadonly();

  readonly summary = computed<AccountSummary>(() => {
    const accs = this.accounts();
    const totalUZS = accs.reduce((sum, acc) => sum + acc.balanceUZS, 0);
    return {
      totalBalanceUZS: totalUZS,
      totalBalanceUSD: this.currency.toUSD(totalUZS),
      accountCount: accs.length,
    };
  });

  loadAccounts(): void {
    this.api.getAccounts().subscribe({
      next: (res) => {
        const mapped: Account[] = (res.data as BackendAccount[]).map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balanceUZS: Math.round(a.balance * this.currency.getExchangeRate()),
          currency: 'UZS',
          isActive: true,
          createdAt: new Date(a.createdAt),
        }));
        this.accounts.set(mapped);
        this._loaded = true;
      },
      error: () => {
        // Keep empty on error — user may not have accounts yet
      },
    });
  }

  getAccountById(id: string): Account | undefined {
    return this.accounts().find((acc) => acc.id === id);
  }

  addAccount(name: string, type: string, initialBalance: number): void {
    this.api.createAccount({
      name,
      type: type.toUpperCase(),
      currency: 'UZS',
      initialBalance: Math.max(initialBalance, 0),
    }).subscribe(() => this.loadAccounts());
  }

  updateBalance(accountId: string, amountUZS: number): boolean {
    const acc = this.getAccountById(accountId);
    if (!acc) return false;
    this.accounts.update((accs) =>
      accs.map((a) =>
        a.id === accountId ? { ...a, balanceUZS: Math.max(0, a.balanceUZS + amountUZS) } : a
      )
    );
    return true;
  }

  deductBalance(accountId: string, amountUZS: number): boolean {
    const acc = this.getAccountById(accountId);
    if (!acc || acc.balanceUZS < amountUZS) return false;
    this.accounts.update((accs) =>
      accs.map((a) =>
        a.id === accountId ? { ...a, balanceUZS: a.balanceUZS - amountUZS } : a
      )
    );
    return true;
  }
}
