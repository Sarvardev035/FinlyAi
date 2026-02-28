import { Injectable, signal, computed } from '@angular/core';
import { Account, AccountSummary } from '../../models';
import { CurrencyService } from './currency.service';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly accounts = signal<Account[]>([
    {
      id: 'humo_001',
      name: 'Humo',
      type: 'humo',
      balanceUZS: 4200000,
      currency: 'UZS',
      isActive: true,
      createdAt: new Date('2025-01-15'),
    },
    {
      id: 'uzcard_001',
      name: 'Uzcard',
      type: 'uzcard',
      balanceUZS: 2380000,
      currency: 'UZS',
      isActive: true,
      createdAt: new Date('2025-02-10'),
    },
    {
      id: 'cash_001',
      name: 'Cash',
      type: 'cash',
      balanceUZS: 760000,
      currency: 'UZS',
      isActive: true,
      createdAt: new Date('2025-01-01'),
    },
  ]);

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

  constructor(private readonly currency: CurrencyService) {}

  getAccountById(id: string): Account | undefined {
    return this.accounts().find((acc) => acc.id === id);
  }

  addAccount(name: string, type: string, initialBalance: number): void {
    const id = `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const newAccount: Account = {
      id,
      name,
      type,
      balanceUZS: Math.max(initialBalance, 0),
      currency: 'UZS',
      isActive: true,
      createdAt: new Date(),
    };
    this.accounts.update((accs) => [...accs, newAccount]);
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
