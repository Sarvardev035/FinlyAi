import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Account } from '../../../models';
import { CurrencyService } from '../../../core/services';

@Component({
  selector: 'app-wallet-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pcard" [class]="'pcard--' + account.type">
      <!-- Background shimmer -->
      <div class="pcard__shine" aria-hidden="true"></div>

      <!-- Top row: network logo + type badge -->
      <div class="pcard__top">
        <span class="pcard__network">{{ networkLogo() }}</span>
        <span class="pcard__type-badge">{{ account.type | uppercase }}</span>
      </div>

      <!-- Chip / cash icon -->
      @if (isBankCard()) {
        <div class="pcard__chip">
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <rect x="1" y="1" width="26" height="20" rx="3" stroke="rgba(255,220,100,0.7)" stroke-width="1.2" fill="rgba(255,215,80,0.15)"/>
            <line x1="14" y1="1" x2="14" y2="21" stroke="rgba(255,220,100,0.5)" stroke-width="1"/>
            <line x1="1" y1="8"  x2="27" y2="8"  stroke="rgba(255,220,100,0.5)" stroke-width="1"/>
            <line x1="1" y1="14" x2="27" y2="14" stroke="rgba(255,220,100,0.5)" stroke-width="1"/>
          </svg>
        </div>
      } @else {
        <div class="pcard__cash-icon">💵</div>
      }

      <!-- Card number (display only, generated) -->
      @if (isBankCard()) {
        <div class="pcard__number">{{ fakeNumber() }}</div>
      } @else {
        <div class="pcard__number pcard__number--cash">Cash Wallet</div>
      }

      <!-- Bottom row: name + balance -->
      <div class="pcard__bottom">
        <div class="pcard__meta">
          <span class="pcard__label">{{ account.name }}</span>
          <span class="pcard__usd">≈ {{ currency.formatUSD(currency.toUSD(account.balanceUZS)) }}</span>
        </div>
        <div class="pcard__balance">{{ currency.formatUZS(account.balanceUZS) }}</div>
      </div>

      <!-- Actions -->
      <div class="pcard__actions">
        <button class="pcard__btn pcard__btn--expense" (click)="transact.emit({ account, type: 'expense' })">
          − Expense
        </button>
        <button class="pcard__btn pcard__btn--income" (click)="transact.emit({ account, type: 'income' })">
          + Income
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes shineMove {
      0%   { transform: translateX(-120%) skewX(-18deg); }
      100% { transform: translateX(220%) skewX(-18deg); }
    }

    .pcard {
      position: relative;
      overflow: hidden;
      border-radius: 1.1rem;
      padding: 1.25rem 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      min-height: 188px;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
      cursor: pointer;
      color: #fff;
    }
    .pcard:hover {
      transform: translateY(-5px) rotate(-0.5deg);
      box-shadow: 0 18px 48px rgba(0,0,0,0.38);
    }
    .pcard:hover .pcard__shine {
      animation: shineMove 0.7s ease-in-out both;
    }

    /* Per-type gradients */
    .pcard--humo {
      background: linear-gradient(135deg, #1a0533 0%, #4a1080 50%, #6c2fc0 100%);
      border: 1px solid rgba(108,92,231,0.35);
    }
    .pcard--uzcard {
      background: linear-gradient(135deg, #003320 0%, #00722e 55%, #00a847 100%);
      border: 1px solid rgba(0,214,143,0.3);
    }
    .pcard--visa {
      background: linear-gradient(135deg, #001a4d 0%, #003399 55%, #1a5ccc 100%);
      border: 1px solid rgba(9,132,227,0.3);
    }
    .pcard--mastercard {
      background: linear-gradient(135deg, #2d0000 0%, #7a1010 55%, #cc2200 100%);
      border: 1px solid rgba(225,112,85,0.3);
    }
    .pcard--cash {
      background: linear-gradient(135deg, #1a1200 0%, #4a3300 55%, #7a5500 100%);
      border: 1px solid rgba(255,169,77,0.3);
    }
    .pcard--crypto {
      background: linear-gradient(135deg, #0a0a2e 0%, #1e1e6e 55%, #3535ae 100%);
      border: 1px solid rgba(162,155,254,0.3);
    }

    .pcard__shine {
      position: absolute;
      inset-block: 0;
      left: -60%;
      width: 40%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
      pointer-events: none;
    }

    .pcard__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pcard__network {
      font-size: 1.4rem;
      line-height: 1;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
    }
    .pcard__type-badge {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.55);
      background: rgba(255,255,255,0.08);
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .pcard__chip {
      width: 28px;
    }
    .pcard__cash-icon {
      font-size: 1.3rem;
      filter: drop-shadow(0 1px 4px rgba(0,0,0,0.4));
    }

    .pcard__number {
      font-size: 0.88rem;
      letter-spacing: 0.15em;
      color: rgba(255,255,255,0.75);
      font-family: 'Courier New', monospace;
      font-weight: 600;
      text-shadow: 0 1px 4px rgba(0,0,0,0.4);
    }
    .pcard__number--cash {
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      color: rgba(255,255,255,0.4);
      font-family: inherit;
      font-weight: 500;
    }

    .pcard__bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: auto;
    }
    .pcard__meta { display: flex; flex-direction: column; gap: 0.1rem; }
    .pcard__label {
      font-size: 0.82rem;
      font-weight: 600;
      color: rgba(255,255,255,0.9);
    }
    .pcard__usd { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
    .pcard__balance {
      font-size: 1.1rem;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 8px rgba(0,0,0,0.35);
    }

    .pcard__actions {
      display: flex;
      gap: 0.4rem;
      margin-top: 0.5rem;
    }
    .pcard__btn {
      flex: 1;
      padding: 0.45rem;
      border: none;
      border-radius: 0.6rem;
      font-weight: 600;
      font-size: 0.75rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.18s ease;
      backdrop-filter: blur(4px);
    }
    .pcard__btn--expense {
      background: rgba(255,107,107,0.18);
      color: #ff9999;
      border: 1px solid rgba(255,107,107,0.2);
    }
    .pcard__btn--expense:hover { background: rgba(255,107,107,0.28); }
    .pcard__btn--income {
      background: rgba(0,214,143,0.18);
      color: #80ffcc;
      border: 1px solid rgba(0,214,143,0.2);
    }
    .pcard__btn--income:hover { background: rgba(0,214,143,0.28); }
  `],
})
export class WalletCardComponent {
  @Input({ required: true }) account!: Account;
  @Output() transact = new EventEmitter<{ account: Account; type: 'expense' | 'income' }>();

  constructor(public readonly currency: CurrencyService) {}

  isBankCard(): boolean {
    return !['cash', 'crypto'].includes(this.account.type);
  }

  networkLogo(): string {
    const logos: Record<string, string> = {
      humo: '🟣', uzcard: '🟢', visa: '💳', mastercard: '🔴', cash: '💵', crypto: '₿',
    };
    return logos[this.account.type] || '💳';
  }

  /** Deterministic display card number based on account ID — never real. */
  fakeNumber(): string {
    const id = this.account.id ?? '';
    const seed = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const prefixes: Record<string, string> = {
      visa: '4', mastercard: '5', humo: '8600', uzcard: '8600',
    };
    const prefix = prefixes[this.account.type] ?? '4';
    // Generate 16 digits deterministically, showing only first 4 and last 4
    const raw = String(seed).padStart(12, '0').repeat(3).slice(0, 12);
    const first4 = prefix.padEnd(4, raw[0] ?? '1').slice(0, 4);
    const last4  = raw.slice(-4);
    return `${first4}  ••••  ••••  ${last4}`;
  }
}
