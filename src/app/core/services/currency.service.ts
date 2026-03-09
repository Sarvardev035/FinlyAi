import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ExchangeRateResponse {
  id: string;
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  updatedAt: string;
}
interface ApiResponse<T> { success: boolean; data: T; }

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly _rate = signal<number>(12700); // default fallback

  constructor() {
    this.fetchRate();
  }

  private fetchRate(): void {
    this.http.get<ApiResponse<ExchangeRateResponse[]>>(`${environment.apiUrl}/exchange-rates`).subscribe({
      next: (res) => {
        const usd = res.data?.find((r) => r.baseCurrency === 'USD' && r.targetCurrency === 'UZS')
          ?? res.data?.find((r) => r.targetCurrency === 'UZS');
        if (usd?.rate) this._rate.set(usd.rate);
      },
      error: () => {}, // keep fallback rate
    });
  }

  getExchangeRate(): number {
    return this._rate();
  }

  toUSD(uzs: number): number {
    return uzs / this._rate();
  }

  toUZS(usd: number): number {
    return usd * this._rate();
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
}
