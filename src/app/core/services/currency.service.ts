import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly exchangeRate: number = 12700; // UZS per USD

  toUSD(uzs: number): number {
    return uzs / this.exchangeRate;
  }

  toUZS(usd: number): number {
    return usd * this.exchangeRate;
  }

  formatUZS(value: number): string {
    return `UZS ${Math.round(value).toLocaleString('en-US')}`;
  }

  formatUSD(value: number): string {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  getExchangeRate(): number {
    return this.exchangeRate;
  }
}
