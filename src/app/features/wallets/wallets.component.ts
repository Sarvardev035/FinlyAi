import { Component, ChangeDetectionStrategy, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletCardComponent } from '../../shared';
import { AddPersonModalComponent } from '../../components/add-person-modal/add-person-modal.component';
import { AccountService, TransactionService, CurrencyService, TransferService, PersonService } from '../../core/services';
import { Account, Person, TransactionCategory, TransactionType } from '../../models';

@Component({
  selector: 'app-wallets',
  standalone: true,
  imports: [CommonModule, FormsModule, WalletCardComponent, AddPersonModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="wallets">
      <div class="wallets__header">
        <h2 class="section-title">💳 My Wallets</h2>
        <div class="wallets__actions">
          <button class="btn btn--secondary" (click)="openTransferModal()">Transfer</button>
          <button class="btn btn--secondary add-person-btn" (click)="openAddPersonModal()">+ Add Person</button>
          <button class="btn btn--accent" (click)="showAddCard.set(true)">+ Add Card</button>
        </div>
      </div>

      <div class="wallets__grid">
        @for (account of accountService.allAccounts(); track account.id) {
          <app-wallet-card
            [account]="account"
            (transact)="openTransaction($event)"
          />
        }
      </div>

      <!-- Persons Section -->
      <div class="persons-section">
        <div class="section-header">
          <h3>👥 My People</h3>
          <button class="btn btn--secondary add-person-btn" (click)="openAddPersonModal()">
            + Add Person
          </button>
        </div>

        @if (!persons.length) {
          <p class="persons-empty">Add your first person to track expenses separately.</p>
        }

        <div class="persons-grid">
          @for (person of persons; track person.id) {
            <div class="person-card">
              <div class="person-avatar">{{ person.avatar }}</div>
              <div class="person-name">{{ person.name }}</div>
              <div class="person-balance">{{ currency.formatUZS(person.balance) }}</div>
              <div class="person-actions">
                <button (click)="openExpenseModal(person)">- Expense</button>
                <button (click)="openIncomeModal(person)">+ Income</button>
              </div>
              <button class="person-delete" (click)="deletePerson(person.id)">Remove</button>
            </div>
          }
        </div>

        @if (personError()) {
          <div class="form-error">{{ personError() }}</div>
        }
      </div>

      @if (addPersonModalOpen()) {
        <app-add-person-modal
          (cancel)="closeAddPersonModal()"
          (create)="createPerson($event)"
        />
      }

      <!-- Add Card Modal -->
      @if (showAddCard()) {
        <div class="modal-overlay" (click)="showAddCard.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h3>Add New Wallet</h3>
              <button class="modal__close" (click)="showAddCard.set(false)">✕</button>
            </div>
            <div class="modal__body">
              <label class="field">
                <span class="field__label">Wallet Name</span>
                <input class="field__input" [(ngModel)]="newCardName" placeholder="e.g. Salary Card" />
              </label>
              <label class="field">
                <span class="field__label">Wallet Type</span>
                <select class="field__input" [(ngModel)]="newCardType">
                  <option value="humo">💳 Bank Card — HUMO</option>
                  <option value="uzcard">💳 Bank Card — UZCARD</option>
                  <option value="visa">💎 Bank Card — VISA</option>
                  <option value="mastercard">🔶 Bank Card — MASTERCARD</option>
                  <option value="cash">💵 Cash Wallet</option>
                </select>
              </label>
              <label class="field">
                <span class="field__label">Initial Balance (UZS)</span>
                <input class="field__input" type="number" [(ngModel)]="newCardBalance" placeholder="0" />
              </label>
              @if (newCardType !== 'cash') {
                <label class="field">
                  <span class="field__label">Card Number</span>
                  <input
                    class="field__input"
                    [(ngModel)]="newCardNumber"
                    placeholder="16-digit card number"
                    inputmode="numeric"
                    maxlength="19"
                  />
                </label>
                <label class="field">
                  <span class="field__label">Expiry Date</span>
                  <input class="field__input" [(ngModel)]="newCardExpiry" placeholder="MM/YY" maxlength="5" />
                </label>
              }
              @if (addCardError()) {
                <div class="form-error">{{ addCardError() }}</div>
              }
              <button class="btn btn--accent btn--full" [disabled]="addCardBusy()" (click)="addCard()">
                {{ addCardBusy() ? 'Saving...' : 'Add Wallet' }}
              </button>
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

      <!-- Transfer Modal -->
      @if (transferModalOpen()) {
        <div class="modal-overlay" (click)="closeTransferModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h3>🔄 Transfer Funds</h3>
              <button class="modal__close" (click)="closeTransferModal()">✕</button>
            </div>
            <div class="modal__body">
              <label class="field">
                <span class="field__label">From Wallet</span>
                <select class="field__input" [(ngModel)]="transferFromId" (ngModelChange)="refreshTransferPreview()">
                  <option value="">Select source wallet</option>
                  @for (account of accountService.allAccounts(); track account.id) {
                    <option [value]="account.id">{{ account.name }} ({{ account.currency }})</option>
                  }
                </select>
              </label>

              <label class="field">
                <span class="field__label">To Wallet</span>
                <select class="field__input" [(ngModel)]="transferToId" (ngModelChange)="refreshTransferPreview()">
                  <option value="">Select destination wallet</option>
                  @for (account of accountService.allAccounts(); track account.id) {
                    <option [value]="account.id">{{ account.name }} ({{ account.currency }})</option>
                  }
                </select>
              </label>

              <label class="field">
                <span class="field__label">Amount</span>
                <input class="field__input" type="number" [(ngModel)]="transferAmount" (ngModelChange)="refreshTransferPreview()" placeholder="0" />
              </label>

              <label class="field">
                <span class="field__label">Note (optional)</span>
                <input class="field__input" [(ngModel)]="transferDescription" placeholder="Rent split, savings transfer..." />
              </label>

              @if (transferPreviewText()) {
                <div class="transfer-preview">{{ transferPreviewText() }}</div>
              }

              @if (transferError()) {
                <div class="form-error">{{ transferError() }}</div>
              }

              <button class="btn btn--accent btn--full" [disabled]="transferBusy()" (click)="submitTransfer()">
                {{ transferBusy() ? 'Transferring...' : 'Confirm Transfer' }}
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
    .wallets__actions {
      display: flex;
      gap: 0.6rem;
      align-items: center;
      flex-wrap: wrap;
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
    .btn--secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.14);
    }
    .btn--success { background: var(--success); color: #fff; }
    .btn--danger { background: var(--danger); color: #fff; }
    .btn--full { width: 100%; margin-top: 0.75rem; }
    .btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
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
    .field__input option {
      background: #151a34;
      color: #eef1ff;
    }
    .form-error {
      background: rgba(255, 107, 107, 0.12);
      border: 1px solid rgba(255, 107, 107, 0.3);
      color: #ffb0b0;
      padding: 0.55rem 0.7rem;
      border-radius: 0.6rem;
      font-size: 0.82rem;
    }
    .transfer-preview {
      background: rgba(99,102,241,0.12);
      border: 1px solid rgba(99,102,241,0.28);
      color: #dbe1ff;
      padding: 0.6rem 0.75rem;
      border-radius: 0.6rem;
      font-size: 0.83rem;
    }
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
    .persons-section {
      margin-top: 0.6rem;
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.8rem;
      flex-wrap: wrap;
    }
    .section-header h3 {
      margin: 0;
      color: #fff;
      font-size: 1.05rem;
    }
    .add-person-btn {
      background: linear-gradient(135deg, #2563eb, #06b6d4);
      color: #fff;
    }
    .persons-empty {
      margin: 0;
      color: rgba(255, 255, 255, 0.55);
      font-size: 0.9rem;
    }
    .persons-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.8rem;
    }
    .person-card {
      background: rgba(255, 255, 255, 0.04);
      border-radius: 1rem;
      padding: 1rem;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .person-avatar {
      font-size: 2rem;
      margin-bottom: 0.25rem;
    }
    .person-name {
      color: #fff;
      font-weight: 700;
      font-size: 1rem;
    }
    .person-balance {
      color: #7dd3fc;
      margin: 0.45rem 0;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .person-actions {
      display: flex;
      gap: 0.45rem;
      margin-top: 0.65rem;
    }
    .person-actions button {
      flex: 1;
      padding: 0.45rem;
      border-radius: 0.55rem;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8rem;
    }
    .person-delete {
      margin-top: 0.6rem;
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.55);
      font-size: 0.78rem;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 0.15rem;
    }
  `],
})
export class WalletsComponent implements OnInit {
  showAddCard = signal(false);
  addCardBusy = signal(false);
  addCardError = signal('');
  newCardName = '';
  newCardType: 'cash' | 'humo' | 'uzcard' | 'visa' | 'mastercard' = 'humo';
  newCardBalance = 0;
  newCardNumber = '';
  newCardExpiry = '';

  // Transaction modal state
  txModalOpen = signal(false);
  txType = signal<TransactionType>('expense');
  txCategory = signal<TransactionCategory>('Food');
  txAmount = signal(0);
  txAccountId = signal('');
  txPersonId = signal<string | null>(null);
  txAmountText = '';

  addPersonModalOpen = signal(false);
  persons: Person[] = [];
  personError = signal('');

  // Transfer modal state
  transferModalOpen = signal(false);
  transferBusy = signal(false);
  transferError = signal('');
  transferPreviewText = signal('');
  transferFromId = '';
  transferToId = '';
  transferAmount = 0;
  transferDescription = '';

  keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'];
  categories: TransactionCategory[] = ['Food', 'Taxi', 'Salary', 'Utilities', 'Shopping', 'Transfer', 'Freelance', 'Rent', 'Other'];

  readonly accountService = inject(AccountService);
  readonly transactionService = inject(TransactionService);
  readonly currency = inject(CurrencyService);
  private readonly personService = inject(PersonService);
  private readonly transferService = inject(TransferService);

  constructor() {}

  ngOnInit(): void {
    this.accountService.loadAccounts();
    this.loadPersons();
  }

  loadPersons(): void {
    this.personService.getPersons().subscribe({
      next: (persons) => {
        this.persons = persons;
        this.personError.set('');
      },
      error: (err) => {
        console.error('Full error object:', err);
        console.error('Error status:', err?.status);
        console.error('Error message:', err?.message);
        console.error('API URL being called:', err?.url);
        this.persons = [];
        if (err?.status === 404) {
          this.personError.set('Persons API not found. Please contact backend support.');
          return;
        }
        if (err?.status === 500) {
          this.personError.set('Server error while loading people. Please try again shortly.');
          return;
        }
        this.personError.set('Could not load people. Please try again.');
      },
    });
  }

  openAddPersonModal(): void {
    this.addPersonModalOpen.set(true);
  }

  closeAddPersonModal(): void {
    this.addPersonModalOpen.set(false);
  }

  createPerson(payload: { name: string; avatar: string }): void {
    this.personService.createPerson(payload).subscribe({
      next: (person) => {
        this.onPersonCreated(person);
        this.personError.set('');
        this.closeAddPersonModal();
      },
      error: (err) => {
        console.error('Failed to create person', err);
      },
    });
  }

  onPersonCreated(person: Person): void {
    this.persons = [...this.persons, person];
  }

  deletePerson(id: string): void {
    this.personService.deletePerson(id).subscribe({
      next: () => {
        this.persons = this.persons.filter((p) => p.id !== id);
      },
      error: (err) => {
        console.error('Failed to delete person', err);
      },
    });
  }

  deleteperson(id: string): void {
    this.deletePerson(id);
  }

  async addCard(): Promise<void> {
    this.addCardError.set('');

    const name = this.newCardName.trim();
    if (!name) {
      this.addCardError.set('Wallet name is required.');
      return;
    }

    const isBankCard = this.newCardType !== 'cash';
    const cardNumber = this.newCardNumber.replace(/\s+/g, '');
    const expiry = this.newCardExpiry.trim();

    if (isBankCard) {
      if (!/^\d{12,19}$/.test(cardNumber)) {
        this.addCardError.set('Card number must be 12-19 digits.');
        return;
      }
      if (expiry && !/^(0[1-9]|1[0-2])\/(\d{2})$/.test(expiry)) {
        this.addCardError.set('Expiry date must be in MM/YY format.');
        return;
      }
    }

    this.addCardBusy.set(true);
    const result = await this.accountService.addAccount({
      name,
      walletType: isBankCard ? 'bank_card' : 'cash',
      cardType: isBankCard ? this.newCardType.toUpperCase() as 'HUMO' | 'UZCARD' | 'VISA' | 'MASTERCARD' : undefined,
      cardNumber: isBankCard ? cardNumber : undefined,
      expiryDate: isBankCard ? (expiry || undefined) : undefined,
      initialBalance: this.newCardBalance ?? 0,
    });
    this.addCardBusy.set(false);

    if (!result.ok) {
      this.addCardError.set(result.message ?? 'Failed to create wallet.');
      return;
    }

    this.newCardName = '';
    this.newCardType = 'humo';
    this.newCardBalance = 0;
    this.newCardNumber = '';
    this.newCardExpiry = '';
    this.showAddCard.set(false);
  }

  openTransaction(ev: { account: Account; type: 'expense' | 'income' }): void {
    this.txAccountId.set(ev.account.id);
    this.txPersonId.set(null);
    this.txType.set(ev.type);
    this.txAmount.set(0);
    this.txAmountText = '';
    this.txCategory.set('Food');
    this.txModalOpen.set(true);
  }

  openExpenseModal(person: Person): void {
    this.txAccountId.set('');
    this.txPersonId.set(person.id);
    this.txType.set('expense');
    this.txAmount.set(0);
    this.txAmountText = '';
    this.txCategory.set('Food');
    this.txModalOpen.set(true);
  }

  openIncomeModal(person: Person): void {
    this.txAccountId.set('');
    this.txPersonId.set(person.id);
    this.txType.set('income');
    this.txAmount.set(0);
    this.txAmountText = '';
    this.txCategory.set('Salary');
    this.txModalOpen.set(true);
  }

  closeTxModal(): void {
    this.txModalOpen.set(false);
  }

  openTransferModal(): void {
    this.transferError.set('');
    this.transferPreviewText.set('');
    this.transferFromId = '';
    this.transferToId = '';
    this.transferAmount = 0;
    this.transferDescription = '';
    this.transferModalOpen.set(true);
  }

  closeTransferModal(): void {
    this.transferModalOpen.set(false);
  }

  refreshTransferPreview(): void {
    const preview = this.transferService.getPreview({
      fromAccountId: this.transferFromId,
      toAccountId: this.transferToId,
      amount: this.transferAmount,
      description: this.transferDescription,
    });

    if (!preview) {
      this.transferPreviewText.set('');
      return;
    }

    if (preview.fromCurrency === preview.toCurrency) {
      this.transferPreviewText.set(`No conversion needed. ${preview.fromCurrency} to ${preview.toCurrency}.`);
      return;
    }

    this.transferPreviewText.set(
      `Rate: 1 ${preview.fromCurrency} = ${preview.exchangeRate.toFixed(4)} ${preview.toCurrency}. ` +
      `Recipient gets ~${preview.convertedAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${preview.toCurrency}`,
    );
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

    const personId = this.txPersonId();
    if (personId) {
      const payload = {
        type: this.txType(),
        category: this.txCategory(),
        amount,
        note: `${this.txType()} via wallets modal`,
      };

      this.personService.addPersonExpense(personId, payload).subscribe({
        next: () => {
          this.persons = this.persons.map((p) => {
            if (p.id !== personId) return p;
            const delta = this.txType() === 'expense' ? -amount : amount;
            return { ...p, balance: p.balance + delta };
          });
          this.closeTxModal();
        },
        error: (err) => {
          console.error('Failed to record person transaction', err);
        },
      });
      return;
    }

    this.transactionService.addTransaction(
      this.txType(),
      this.txCategory(),
      amount,
      this.txAccountId()
    );
    this.closeTxModal();
  }

  async submitTransfer(): Promise<void> {
    this.transferError.set('');

    this.refreshTransferPreview();

    this.transferBusy.set(true);
    const result = await this.transferService.transfer({
      fromAccountId: this.transferFromId,
      toAccountId: this.transferToId,
      amount: this.transferAmount,
      description: this.transferDescription,
    });
    this.transferBusy.set(false);

    if (!result.ok) {
      this.transferError.set(result.message ?? 'Transfer failed.');
      return;
    }

    this.closeTransferModal();
  }

  getCategoryIcon(cat: TransactionCategory): string {
    const icons: Record<string, string> = {
      Food: '🍔', Taxi: '🚕', Salary: '💼', Utilities: '⚡',
      Shopping: '🛍️', Transfer: '🔄', Freelance: '💻', Rent: '🏠', Other: '📦',
    };
    return icons[cat] || '📦';
  }
}
