import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Account, AccountSummary } from '../../models';
import { CurrencyService } from './currency.service';
import { ApiService } from './api.service';

interface BackendAccount {
  id: string | number;
  name: string;
  type?: string | null;
  cardType?: string | null;
  card_type?: string | null;
  currency?: string | null;
  balance?: number | string | null;
  createdAt?: string | null;
  created_at?: string | null;
}

export interface CreateAccountInput {
  name: string;
  walletType: 'cash' | 'bank_card';
  cardType?: 'HUMO' | 'UZCARD' | 'VISA' | 'MASTERCARD';
  cardNumber?: string;
  expiryDate?: string;
  initialBalance: number;
}

export interface ActionResult {
  ok: boolean;
  message?: string;
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
        const rows = Array.isArray(res?.data) ? (res.data as BackendAccount[]) : [];
        const mapped: Account[] = rows.map((a) => {
          const normalizedCurrency = a.currency?.toUpperCase() || 'UZS';
          const rawType = (a.type ?? '').toString();
          const rawCardType = a.cardType ?? a.card_type ?? null;
          const createdAt = a.createdAt ?? a.created_at;
          return {
            id: String(a.id),
            name: a.name,
            type: this.mapBackendType(rawType, rawCardType),
            balanceUZS: this.normalizeToUZS(Number(a.balance ?? 0), normalizedCurrency),
            currency: normalizedCurrency,
            isActive: true,
            createdAt: createdAt ? new Date(createdAt) : new Date(),
          };
        });
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

  async addAccount(input: CreateAccountInput): Promise<ActionResult> {
    const payload = {
      name: input.name.trim(),
      // Backend enum commonly accepts CASH/CARD/BANK variants.
      type: input.walletType === 'cash' ? 'CASH' : 'CARD',
      currency: 'UZS',
      initialBalance: Math.max(input.initialBalance, 0),
      cardType: input.walletType === 'bank_card' ? (input.cardType ?? null) : null,
      cardNumber: input.walletType === 'bank_card' ? (input.cardNumber ?? null) : null,
      expiryDate: input.walletType === 'bank_card' ? (input.expiryDate ?? null) : null,
    };

    try {
      await lastValueFrom(this.api.createAccount(payload));
      this.loadAccounts();
      return { ok: true };
    } catch (err) {
      const message = this.extractErrorMessage(err);
      return { ok: false, message };
    }
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

  private mapBackendType(type: string, cardType?: string | null): string {
    const t = (type ?? '').toUpperCase();
    const c = (cardType ?? '').toUpperCase();

    if (t === 'CARD' || t === 'BANK_CARD' || t === 'BANK') {
      if (c === 'HUMO' || c === 'UZCARD' || c === 'VISA' || c === 'MASTERCARD') {
        return c.toLowerCase();
      }
      return 'visa';
    }

    if (t === 'CASH') return 'cash';
    if (t === 'EWALLET') return 'crypto';
    if (t === 'SAVINGS') return 'cash';

    return t ? t.toLowerCase() : 'cash';
  }

  private normalizeToUZS(amount: number, currency: string): number {
    const c = currency.toUpperCase();
    if (c === 'UZS') return Math.round(amount);
    if (c === 'USD') return Math.round(this.currency.toUZS(amount));
    return Math.round(amount * this.currency.getExchangeRate());
  }

  private extractErrorMessage(err: unknown): string {
    const fallback = 'Failed to create wallet. Check fields and try again.';
    if (!(err instanceof HttpErrorResponse)) return fallback;

    const body = err.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.message) return String(body.message);
    if (body?.error) return String(body.error);
    return fallback;
  }
}
