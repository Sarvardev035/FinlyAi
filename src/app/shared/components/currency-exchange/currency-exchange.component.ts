import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ExchangeRatesService,
  CurrencyRate,
  FEATURED_CODES,
} from '../../../core/services/exchange-rates.service';

@Component({
  selector: 'app-currency-exchange',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fx-section">
      <!-- Header -->
      <div class="fx-header">
        <div>
          <h3 class="fx-title">💱 Live Exchange Rates</h3>
          <p class="fx-subtitle">
            @if (svc.loading()) {
              Fetching rates…
            } @else if (svc.error()) {
              Could not load rates
            } @else {
              Updated {{ svc.date() }} · Base: USD
            }
          </p>
        </div>
        <button class="fx-refresh" title="Refresh rates" (click)="svc.refresh()">
          <span [class.fx-spin]="svc.loading()">↻</span>
        </button>
      </div>

      <!-- Rate Cards -->
      @if (svc.loading()) {
        <div class="fx-grid">
          @for (_ of skeletons; track $index) {
            <div class="fx-card fx-card--skeleton">
              <div class="sk-flag"></div>
              <div class="sk-text">
                <div class="sk-line sk-line--lg"></div>
                <div class="sk-line sk-line--sm"></div>
              </div>
            </div>
          }
        </div>
      } @else if (svc.error()) {
        <div class="fx-error">
          <span>⚠️ Failed to load exchange rates.</span>
          <button class="fx-refresh-link" (click)="svc.refresh()">Try again</button>
        </div>
      } @else {
        <div class="fx-grid">
          @for (r of svc.featuredRates(); track r.code) {
            <div class="fx-card" [class.fx-card--active]="convertFrom() === r.code || convertTo() === r.code">
              <div class="fx-card__flag">{{ r.flag }}</div>
              <div class="fx-card__body">
                <span class="fx-card__code">{{ r.code }}</span>
                <span class="fx-card__name">{{ r.name }}</span>
              </div>
              <div class="fx-card__rate">
                <span class="fx-card__value">{{ r.rate | number:'1.2-4' }}</span>
                <span class="fx-card__per">per $1</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Converter -->
      <div class="fx-converter">
        <h4 class="fx-conv-title">Currency Converter</h4>
        <div class="fx-conv-row">
          <input
            type="number"
            class="fx-input"
            placeholder="Amount"
            [ngModel]="convertAmount()"
            (ngModelChange)="setAmount($event)"
            min="0"
          />
          <select class="fx-select" [ngModel]="convertFrom()" (ngModelChange)="convertFrom.set($event)">
            <option value="USD">🇺🇸 USD</option>
            @for (c of svc.featuredRates(); track c.code) {
              <option [value]="c.code">{{ c.flag }} {{ c.code }}</option>
            }
          </select>
          <button class="fx-swap" title="Swap currencies" (click)="swapCurrencies()">⇄</button>
          <select class="fx-select" [ngModel]="convertTo()" (ngModelChange)="convertTo.set($event)">
            <option value="USD">🇺🇸 USD</option>
            @for (c of svc.featuredRates(); track c.code) {
              <option [value]="c.code">{{ c.flag }} {{ c.code }}</option>
            }
          </select>
        </div>
        @if (convertAmount() !== null && convertAmount()! > 0 && !svc.loading() && !svc.error()) {
          <div class="fx-result">
            <span class="fx-result__from">{{ convertAmount() | number:'1.2-2' }} {{ convertFrom() }}</span>
            <span class="fx-result__eq">=</span>
            <span class="fx-result__to">{{ convertedValue() | number:'1.2-4' }} {{ convertTo() }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    @keyframes fxFadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position:  200% 0; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .fx-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: fxFadeUp 0.5s ease-out both;
    }

    /* Header */
    .fx-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .fx-title {
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }
    .fx-subtitle {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.35);
      margin: 0.15rem 0 0;
    }
    .fx-refresh {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.5);
      border-radius: 0.5rem;
      width: 32px;
      height: 32px;
      cursor: pointer;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .fx-refresh:hover {
      background: rgba(108,92,231,0.15);
      color: var(--accent);
      border-color: rgba(108,92,231,0.3);
    }
    .fx-spin {
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }

    /* Rate Grid */
    .fx-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 0.6rem;
    }

    .fx-card {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 0.9rem;
      padding: 0.75rem 0.85rem;
      transition: all 0.22s ease;
      cursor: default;
    }
    .fx-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.22);
      border-color: rgba(255,255,255,0.1);
    }
    .fx-card--active {
      border-color: rgba(108,92,231,0.45) !important;
      background: rgba(108,92,231,0.06);
    }
    .fx-card__flag { font-size: 1.6rem; flex-shrink: 0; line-height: 1; }
    .fx-card__body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .fx-card__code  { font-size: 0.85rem; font-weight: 700; color: #fff; }
    .fx-card__name  { font-size: 0.68rem; color: rgba(255,255,255,0.38); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .fx-card__rate  { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
    .fx-card__value { font-size: 0.9rem; font-weight: 700; color: #fff; }
    .fx-card__per   { font-size: 0.62rem; color: rgba(255,255,255,0.3); }

    /* Skeleton */
    .fx-card--skeleton { pointer-events: none; }
    .sk-flag {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .sk-text { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; }
    .sk-line {
      border-radius: 4px;
      background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
    }
    .sk-line--lg { height: 12px; width: 70%; }
    .sk-line--sm { height: 9px;  width: 50%; }

    /* Error */
    .fx-error {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      background: rgba(255,107,107,0.07);
      border: 1px solid rgba(255,107,107,0.15);
      border-radius: 0.75rem;
      font-size: 0.82rem;
      color: rgba(255,255,255,0.55);
    }
    .fx-refresh-link {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 0.82rem;
      padding: 0;
      font-family: inherit;
      text-decoration: underline;
    }

    /* Converter */
    .fx-converter {
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 1rem;
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .fx-conv-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      margin: 0;
    }
    .fx-conv-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .fx-input {
      flex: 1;
      min-width: 100px;
      padding: 0.55rem 0.8rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.65rem;
      color: #fff;
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .fx-input::placeholder { color: rgba(255,255,255,0.2); }
    .fx-input:focus { border-color: rgba(108,92,231,0.5); }
    .fx-select {
      padding: 0.55rem 0.75rem;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.65rem;
      color: #fff;
      font-size: 0.82rem;
      font-family: inherit;
      cursor: pointer;
      outline: none;
      appearance: none;
      min-width: 100px;
    }
    .fx-select option { background: #1a1e2e; color: #fff; }
    .fx-select:focus  { border-color: rgba(108,92,231,0.5); }
    .fx-swap {
      padding: 0.55rem 0.7rem;
      background: rgba(108,92,231,0.1);
      border: 1px solid rgba(108,92,231,0.2);
      border-radius: 0.65rem;
      color: var(--accent);
      font-size: 1rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .fx-swap:hover {
      background: rgba(108,92,231,0.2);
      transform: scale(1.08);
    }
    .fx-result {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.6rem 0.85rem;
      background: rgba(108,92,231,0.07);
      border: 1px solid rgba(108,92,231,0.15);
      border-radius: 0.65rem;
      flex-wrap: wrap;
    }
    .fx-result__from { font-size: 0.88rem; color: rgba(255,255,255,0.5); }
    .fx-result__eq   { font-size: 0.82rem; color: rgba(255,255,255,0.25); }
    .fx-result__to   { font-size: 1rem; font-weight: 700; color: #fff; }

    @media (max-width: 480px) {
      .fx-grid { grid-template-columns: 1fr 1fr; }
      .fx-conv-row { flex-direction: column; }
    }
  `],
})
export class CurrencyExchangeComponent {
  readonly svc = inject(ExchangeRatesService);

  readonly convertAmount = signal<number | null>(null);
  readonly convertFrom   = signal('USD');
  readonly convertTo     = signal('UZS');

  readonly skeletons = Array.from({ length: 11 });

  readonly convertedValue = computed(() => {
    const amt = this.convertAmount();
    if (amt === null || amt <= 0) return 0;
    return this.svc.convert(amt, this.convertFrom(), this.convertTo());
  });

  setAmount(val: number | null): void {
    const n = Number(val);
    this.convertAmount.set(isNaN(n) || n < 0 ? null : n);
  }

  swapCurrencies(): void {
    const from = this.convertFrom();
    this.convertFrom.set(this.convertTo());
    this.convertTo.set(from);
  }
}
