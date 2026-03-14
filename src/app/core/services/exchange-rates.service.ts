import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CurrencyRate {
  code: string;
  name: string;
  flag: string;
  rate: number; // units of this currency per 1 USD
}

interface ExchangeApiResponse {
  base: string;
  date: string;
  time_last_updated: number;
  rates: Record<string, number>;
}

const CURRENCY_META: Record<string, { name: string; flag: string }> = {
  USD: { name: 'US Dollar',         flag: '🇺🇸' },
  EUR: { name: 'Euro',              flag: '🇪🇺' },
  GBP: { name: 'British Pound',     flag: '🇬🇧' },
  JPY: { name: 'Japanese Yen',      flag: '🇯🇵' },
  CNY: { name: 'Chinese Yuan',      flag: '🇨🇳' },
  RUB: { name: 'Russian Ruble',     flag: '🇷🇺' },
  KZT: { name: 'Kazakh Tenge',      flag: '🇰🇿' },
  UZS: { name: 'Uzbek Som',         flag: '🇺🇿' },
  AED: { name: 'UAE Dirham',        flag: '🇦🇪' },
  TRY: { name: 'Turkish Lira',      flag: '🇹🇷' },
  KRW: { name: 'South Korean Won',  flag: '🇰🇷' },
  GEL: { name: 'Georgian Lari',     flag: '🇬🇪' },
};

export const FEATURED_CODES = ['EUR','GBP','JPY','CNY','RUB','KZT','UZS','AED','TRY','KRW','GEL'];
const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

@Injectable({ providedIn: 'root' })
export class ExchangeRatesService {
  private readonly http = inject(HttpClient);

  private readonly _rates   = signal<Record<string, number>>({});
  private readonly _date    = signal<string>('');
  private readonly _loading = signal(true);
  private readonly _error   = signal(false);

  readonly loading = this._loading.asReadonly();
  readonly date    = this._date.asReadonly();
  readonly error   = this._error.asReadonly();

  readonly featuredRates = computed<CurrencyRate[]>(() => {
    const rates = this._rates();
    return FEATURED_CODES
      .filter(code => rates[code] !== undefined)
      .map(code => ({
        code,
        name: CURRENCY_META[code]?.name ?? code,
        flag: CURRENCY_META[code]?.flag ?? '🌐',
        rate: rates[code],
      }));
  });

  readonly allCodes = computed<string[]>(() => {
    return ['USD', ...Object.keys(this._rates()).filter(c => c !== 'USD')].sort();
  });

  constructor() {
    this.fetch();
  }

  private fetch(): void {
    this._loading.set(true);
    this._error.set(false);
    this.http.get<ExchangeApiResponse>(API_URL).subscribe({
      next: (res) => {
        this._rates.set(res.rates ?? {});
        this._date.set(res.date ?? '');
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
        this._error.set(true);
      },
    });
  }

  /** Convert `amount` in `from` currency → `to` currency */
  convert(amount: number, from: string, to: string): number {
    const rates = this._rates();
    if (!Object.keys(rates).length) return amount;
    const fromRate = from === 'USD' ? 1 : (rates[from] ?? 1);
    const toRate   = to   === 'USD' ? 1 : (rates[to]   ?? 1);
    return (amount / fromRate) * toRate;
  }

  refresh(): void {
    this.fetch();
  }
}
