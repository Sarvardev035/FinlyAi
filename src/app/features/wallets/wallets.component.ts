import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletCardComponent } from '../../shared';
import { AccountService, TransactionService, CurrencyService } from '../../core/services';
import { Account, TransactionCategory, TransactionType } from '../../models';

@Component({
  selector: 'app-wallets',
  standalone: true,
  imports: [CommonModule, FormsModule, WalletCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="wallets">
      <div class="wallets__header">
        <h2 class="section-title">💳 My Wallets</h2>
        <button class="btn btn--accent" (click)="showAddCard.set(true)">+ Add Card</button>
      </div>

      <div class="wallets__grid">
        @for (account of accountService.allAccounts(); track account.id) {
          <app-wallet-card
            [account]="account"
            (transact)="openTransaction($event)"
          />
        }
      </div>

      <!-- Add Card Modal -->
      @if (showAddCard()) {
        <div class="modal-overlay" (click)="showAddCard.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h3>Add New Card</h3>
              <button class="modal__close" (click)="showAddCard.set(false)">✕</button>
            </div>
            <div class="modal__body">
              <label class="field">
                <span class="field__label">Card Name</span>
                <input class="field__input" [(ngModel)]="newCardName" placeholder="e.g. Savings" />
              </label>
              <label class="field">
                <span class="field__label">Card Type</span>
                <select class="field__input" [(ngModel)]="newCardType">
                  <option value="humo">Humo</option>
                  <option value="uzcard">Uzcard</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="cash">Cash</option>
                  <option value="crypto">Crypto</option>
                </select>
              </label>
              <label class="field">
                <span class="field__label">Initial Balance (UZS)</span>
                <input class="field__input" type="number" [(ngModel)]="newCardBalance" placeholder="0" />
              </label>
              <button class="btn btn--accent btn--full" (click)="addCard()">Add Card</button>
            </div>
          </div>
        </div>
      }

      <!-- Transaction Modal -->
      @if (txModalOpen()) {
        <div class="modal-overlay" (click)="closeTxModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h3>{{ txType() === 'expense' ? '− Expense' : '+ Income' }}</h3>
              <button class="modal__close" (click)="closeTxModal()">✕</button>
            </div>
            <div class="modal__body">
              <div class="amount-display">{{ currency.formatUZS(txAmount()) }}</div>
              <div class="keypad">
                @for (key of keypadKeys; track key) {
                  <button class="keypad__btn" (click)="onKeypad(key)">{{ key }}</button>
                }
              </div>
              <div class="categories">
                @for (cat of categories; track cat) {
                  <button
                    class="cat-btn"
                    [class.cat-btn--active]="txCategory() === cat"
                    (click)="txCategory.set(cat)"
                  >
                    {{ getCategoryIcon(cat) }} {{ cat }}
                  </button>
                }
              </div>
              <button
                class="btn btn--full"
                [class.btn--danger]="txType() === 'expense'"
                [class.btn--success]="txType() === 'income'"
                (click)="submitTransaction()"
              >
                {{ txType() === 'expense' ? 'Record Expense' : 'Record Income' }}
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .wallets { display: flex; flex-direction: column; gap: 1.25rem; }
    .wallets__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-title {
      font-size: 1.3rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }
    .wallets__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .btn {
      padding: 0.6rem 1.25rem;
      border: none;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.85; }
    .btn--accent { background: var(--accent); color: #fff; }
    .btn--success { background: var(--success); color: #fff; }
    .btn--danger { background: var(--danger); color: #fff; }
    .btn--full { width: 100%; margin-top: 0.75rem; }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--bg);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius);
      width: 90%;
      max-width: 420px;
      overflow: hidden;
    }
    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .modal__header h3 { margin: 0; color: #fff; }
    .modal__close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 1.2rem;
      cursor: pointer;
    }
    .modal__body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field__label {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .field__input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.6rem;
      padding: 0.65rem 0.75rem;
      color: #fff;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    .field__input:focus { border-color: var(--accent); }
    .amount-display {
      text-align: center;
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      padding: 0.5rem 0;
    }
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .keypad__btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.6rem;
      padding: 0.75rem;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .keypad__btn:hover { background: rgba(255, 255, 255, 0.1); }
    .categories {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .cat-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      padding: 0.4rem 0.8rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s;
    }
    .cat-btn--active {
      background: rgba(108, 92, 231, 0.2);
      border-color: var(--accent);
      color: #fff;
    }
  `],
})
export class WalletsComponent implements OnInit {
  showAddCard = signal(false);
  newCardName = '';
  newCardType = 'humo';
  newCardBalance = 0;

  // Transaction modal state
  txModalOpen = signal(false);
  txType = signal<TransactionType>('expense');
  txCategory = signal<TransactionCategory>('Food');
  txAmount = signal(0);
  txAccountId = signal('');
  txAmountText = '';

  keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];
  categories: TransactionCategory[] = ['Food', 'Taxi', 'Salary', 'Utilities', 'Shopping', 'Transfer', 'Freelance', 'Rent', 'Other'];

  constructor(
    public readonly accountService: AccountService,
    public readonly transactionService: TransactionService,
    public readonly currency: CurrencyService,
  ) {}

  ngOnInit(): void {
    this.accountService.loadAccounts();
  }

  addCard(): void {
    if (!this.newCardName.trim()) return;
    this.accountService.addAccount(this.newCardName, this.newCardType, this.newCardBalance);
    this.newCardName = '';
    this.newCardType = 'humo';
    this.newCardBalance = 0;
    this.showAddCard.set(false);
  }

  openTransaction(ev: { account: Account; type: 'expense' | 'income' }): void {
    this.txAccountId.set(ev.account.id);
    this.txType.set(ev.type);
    this.txAmount.set(0);
    this.txAmountText = '';
    this.txCategory.set('Food');
    this.txModalOpen.set(true);
  }

  closeTxModal(): void {
    this.txModalOpen.set(false);
  }

  onKeypad(key: string): void {
    if (key === '⌫') {
      this.txAmountText = this.txAmountText.slice(0, -1);
    } else {
      this.txAmountText += key;
    }
    this.txAmount.set(parseInt(this.txAmountText, 10) || 0);
  }

  submitTransaction(): void {
    const amount = this.txAmount();
    if (amount <= 0) return;
    this.transactionService.addTransaction(
      this.txType(),
      this.txCategory(),
      amount,
      this.txAccountId()
    );
    this.closeTxModal();
  }

  getCategoryIcon(cat: TransactionCategory): string {
    const icons: Record<string, string> = {
      Food: '🍔', Taxi: '🚕', Salary: '💼', Utilities: '⚡',
      Shopping: '🛍️', Transfer: '🔄', Freelance: '💻', Rent: '🏠', Other: '📦',
    };
    return icons[cat] || '📦';
  }
}
