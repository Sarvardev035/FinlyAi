import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { AccountService } from './account.service';
import { CurrencyService } from './currency.service';

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
}

export interface TransferPreview {
  exchangeRate: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
}

export interface TransferResult {
  ok: boolean;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly api = inject(ApiService);
  private readonly accounts = inject(AccountService);
  private readonly currency = inject(CurrencyService);

  getPreview(input: TransferInput): TransferPreview | null {
    const from = this.accounts.getAccountById(input.fromAccountId);
    const to = this.accounts.getAccountById(input.toAccountId);
    if (!from || !to || input.amount <= 0) return null;

    const exchangeRate = this.currency.getRateBetween(from.currency, to.currency);
    return {
      exchangeRate,
      convertedAmount: input.amount * exchangeRate,
      fromCurrency: from.currency,
      toCurrency: to.currency,
    };
  }

  async transfer(input: TransferInput): Promise<TransferResult> {
    const from = this.accounts.getAccountById(input.fromAccountId);
    const to = this.accounts.getAccountById(input.toAccountId);

    if (!from || !to) {
      return { ok: false, message: 'Please select both source and destination wallets.' };
    }
    if (input.fromAccountId === input.toAccountId) {
      return { ok: false, message: 'Source and destination wallets must be different.' };
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, message: 'Transfer amount must be greater than zero.' };
    }

    const exchangeRate = this.currency.getRateBetween(from.currency, to.currency);
    const payload = {
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      description: input.description?.trim() || undefined,
      transferDate: new Date().toISOString().slice(0, 10),
      exchangeRate,
    };

    try {
      await lastValueFrom(this.api.createTransfer(payload));
      this.accounts.loadAccounts();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: this.extractErrorMessage(err) };
    }
  }

  private extractErrorMessage(err: unknown): string {
    const fallback = 'Transfer failed. Please check balances and try again.';
    if (!(err instanceof HttpErrorResponse)) return fallback;

    const body = err.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.message) return String(body.message);
    if (body?.error) return String(body.error);
    return fallback;
  }
}
