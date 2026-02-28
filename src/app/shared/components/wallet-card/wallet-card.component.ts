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
    <div class="wallet-card" [class]="'wallet-card--' + account.type">
      <div class="wallet-card__header">
        <span class="wallet-card__icon">{{ getIcon() }}</span>
        <span class="wallet-card__type">{{ account.type | uppercase }}</span>
      </div>
      <div class="wallet-card__name">{{ account.name }}</div>
      <div class="wallet-card__balance">{{ currency.formatUZS(account.balanceUZS) }}</div>
      <div class="wallet-card__usd">≈ {{ currency.formatUSD(currency.toUSD(account.balanceUZS)) }}</div>
      <div class="wallet-card__actions">
        <button class="wallet-card__btn wallet-card__btn--expense" (click)="transact.emit({ account, type: 'expense' })">
          − Expense
        </button>
        <button class="wallet-card__btn wallet-card__btn--income" (click)="transact.emit({ account, type: 'income' })">
          + Income
        </button>
      </div>
    </div>
  `,
  styles: [`
    .wallet-card {
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }
    .wallet-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(108, 92, 231, 0.15);
    }
    .wallet-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .wallet-card__icon { font-size: 1.5rem; }
    .wallet-card__type {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      color: rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
    }
    .wallet-card__name {
      font-weight: 600;
      font-size: 1.1rem;
      color: #fff;
    }
    .wallet-card__balance {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
    }
    .wallet-card__usd {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.5);
    }
    .wallet-card__actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .wallet-card__btn {
      flex: 1;
      padding: 0.5rem;
      border: none;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .wallet-card__btn:hover { opacity: 0.85; }
    .wallet-card__btn--expense {
      background: rgba(255, 107, 107, 0.15);
      color: var(--danger);
    }
    .wallet-card__btn--income {
      background: rgba(0, 214, 143, 0.15);
      color: var(--success);
    }
    .wallet-card--humo { border-left: 3px solid #6c5ce7; }
    .wallet-card--uzcard { border-left: 3px solid #00d68f; }
    .wallet-card--visa { border-left: 3px solid #0984e3; }
    .wallet-card--mastercard { border-left: 3px solid #e17055; }
    .wallet-card--cash { border-left: 3px solid #ffa94d; }
    .wallet-card--crypto { border-left: 3px solid #a29bfe; }
  `],
})
export class WalletCardComponent {
  @Input({ required: true }) account!: Account;
  @Output() transact = new EventEmitter<{ account: Account; type: 'expense' | 'income' }>();

  constructor(public readonly currency: CurrencyService) {}

  getIcon(): string {
    const icons: Record<string, string> = {
      humo: '💳',
      uzcard: '💳',
      visa: '💎',
      mastercard: '🔶',
      cash: '💵',
      crypto: '₿',
    };
    return icons[this.account.type] || '💰';
  }
}
