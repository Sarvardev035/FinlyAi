import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UzsFormatPipe } from '../../shared';
import { IncomeService, AccountService, CurrencyService } from '../../core/services';
import { IncomeFormat } from '../../models';

interface IncomeResource {
  key: IncomeFormat;
  label: string;
  icon: string;
  variant: 'accent' | 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, FormsModule, UzsFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="income">
      <div class="income__header anim-fade-down">
        <h2 class="section-title">💰 Income Tracker</h2>
        <button class="btn btn--accent" (click)="showAddResource.set(!showAddResource())">
          {{ showAddResource() ? '✕ Cancel' : '+ Add Income Resource' }}
        </button>
      </div>

      <!-- Add New Resource Form -->
      @if (showAddResource()) {
        <div class="resource-form anim-scale-in">
          <h4 class="resource-form__title">Add New Income Resource</h4>
          <div class="form-row">
            <input
              class="field__input"
              placeholder="Resource name (e.g. Freelance Wallet)"
              [(ngModel)]="newResourceName"
            />
            <select class="field__input field__input--select" [(ngModel)]="newResourceFormat">
              @for (fmt of availableFormats(); track fmt) {
                <option [value]="fmt">{{ fmt | uppercase }}</option>
              }
            </select>
          </div>
          <button
            class="btn btn--accent btn--full"
            [disabled]="!newResourceName.trim()"
            (click)="addResource()"
          >+ Add Resource</button>
        </div>
      }

      <!-- Format Cards (Clickable to add income) -->
      <div class="format-grid">
        @for (fmt of formats; track fmt.key; let i = $index) {
          <button
            class="format-card-btn anim-fade-up"
            [class.format-card-btn--selected]="selectedFormat()?.key === fmt.key"
            [class.format-card-btn--cash]="fmt.key === 'cash'"
            [class.format-card-btn--card]="fmt.key === 'card'"
            [class.format-card-btn--bank]="fmt.key === 'bank'"
            [class.format-card-btn--crypto]="fmt.key === 'crypto'"
            [style.animation-delay]="(i * 70) + 'ms'"
            (click)="selectFormat(fmt)"
          >
            <span class="format-card-btn__icon">{{ fmt.icon }}</span>
            <span class="format-card-btn__label">{{ fmt.label }}</span>
            <span class="format-card-btn__value">{{ getFormatAmount(fmt.key) | uzsFormat }}</span>
            @if (selectedFormat()?.key === fmt.key) {
              <span class="format-card-btn__indicator">▼</span>
            }
          </button>
        }
      </div>

      <!-- Quick Add Income Panel (appears when a card is tapped) -->
      @if (selectedFormat(); as fmt) {
        <div class="quick-add anim-scale-in">
          <div class="quick-add__header">
            <span class="quick-add__title">{{ fmt.icon }} Add to {{ fmt.label }}</span>
            <button class="quick-add__close" (click)="clearFormat()">✕</button>
          </div>

          <!-- Account selector -->
          <div class="account-select">
            <span class="account-select__label">Deposit to wallet:</span>
            <div class="account-chips">
              @for (acc of accountService.allAccounts(); track acc.id) {
                <button
                  class="acc-chip"
                  [class.acc-chip--selected]="selectedAccountId() === acc.id"
                  (click)="selectedAccountId.set(acc.id)"
                >
                  {{ getAccIcon(acc.type) }} {{ acc.name }}
                </button>
              }
            </div>
          </div>

          <div class="quick-add__form">
            <input
              class="field__input"
              type="number"
              placeholder="Amount (UZS)"
              [(ngModel)]="quickAmount"
            />
            <input
              class="field__input"
              placeholder="Source (e.g. Salary, Side gig)"
              [(ngModel)]="quickSource"
            />
            <input
              class="field__input"
              placeholder="Notes (optional)"
              [(ngModel)]="quickNotes"
            />
            <button
              class="btn btn--success btn--full"
              [disabled]="quickAmount <= 0 || !quickSource.trim() || !selectedAccountId()"
              (click)="quickAddIncome()"
            >
              💰 Add {{ quickAmount > 0 ? (quickAmount | uzsFormat) : '' }} to {{ fmt.label }}
            </button>
          </div>

          @if (quickFeedback()) {
            <div class="feedback anim-feedback" [class.feedback--success]="quickFeedbackType() === 'success'">
              {{ quickFeedback() }}
            </div>
          }
        </div>
      }

      <!-- Total -->
      <div class="total-bar anim-fade-up" style="animation-delay: 300ms">
        <span>Total Income</span>
        <span class="total-bar__value">{{ incomeService.totalIncome() | uzsFormat }}</span>
      </div>

      <!-- Recent Incomes -->
      <div class="income-list">
        @for (income of incomeService.recentIncomes(); track income.id) {
          <div class="income-item anim-fade-up">
            <div class="income-item__icon">{{ getFormatIcon(income.format) }}</div>
            <div class="income-item__info">
              <div class="income-item__source">{{ income.source }}</div>
              <div class="income-item__meta">{{ income.format | uppercase }} · {{ income.date | date:'mediumDate' }}</div>
            </div>
            <div class="income-item__amount">+{{ income.amountUZS | uzsFormat }}</div>
          </div>
        } @empty {
          <div class="empty-state">
            <span class="empty-state__icon">💸</span>
            <p>No income recorded yet</p>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    /* ===== Animations ===== */
    @keyframes fadeDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes feedbackSlide {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0, 214, 143, 0.3); }
      50% { box-shadow: 0 0 0 6px rgba(0, 214, 143, 0); }
    }
    .anim-fade-down { animation: fadeDown 0.4s ease-out both; }
    .anim-fade-up { animation: fadeUp 0.45s ease-out both; }
    .anim-scale-in { animation: scaleIn 0.3s ease-out both; }
    .anim-feedback { animation: feedbackSlide 0.3s ease-out; }

    /* ===== Layout ===== */
    .income { display: flex; flex-direction: column; gap: 1.25rem; }
    .income__header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .section-title { font-size: 1.3rem; font-weight: 700; color: #fff; margin: 0; }

    /* ===== Format Cards ===== */
    .format-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
    }
    .format-card-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      text-align: center;
      background: var(--surface);
      border: 1.5px solid rgba(255,255,255,0.06);
      border-radius: var(--radius);
      padding: 1.25rem 1rem;
      cursor: pointer;
      color: #fff;
      font-family: inherit;
      transition: all 0.3s ease;
      position: relative;
    }
    .format-card-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.25);
      border-color: rgba(255,255,255,0.12);
    }
    .format-card-btn--selected {
      animation: pulse 2s ease-in-out infinite;
    }
    .format-card-btn--cash { border-left: 3px solid var(--success); }
    .format-card-btn--cash.format-card-btn--selected { border-color: var(--success); background: rgba(0,214,143,0.06); }
    .format-card-btn--card { border-left: 3px solid var(--accent); }
    .format-card-btn--card.format-card-btn--selected { border-color: var(--accent); background: rgba(108,92,231,0.06); }
    .format-card-btn--bank { border-left: 3px solid var(--warning); }
    .format-card-btn--bank.format-card-btn--selected { border-color: var(--warning); background: rgba(255,169,77,0.06); }
    .format-card-btn--crypto { border-left: 3px solid var(--danger); }
    .format-card-btn--crypto.format-card-btn--selected { border-color: var(--danger); background: rgba(255,107,107,0.06); }

    .format-card-btn__icon { font-size: 1.6rem; }
    .format-card-btn__label {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .format-card-btn__value { font-size: 1.15rem; font-weight: 700; }
    .format-card-btn__indicator {
      position: absolute;
      bottom: -2px;
      font-size: 0.6rem;
      color: rgba(255,255,255,0.3);
      animation: fadeDown 0.2s ease-out;
    }

    /* ===== Quick Add Panel ===== */
    .quick-add {
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .quick-add__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .quick-add__title {
      font-weight: 600;
      font-size: 1rem;
      color: #fff;
    }
    .quick-add__close {
      background: rgba(255,255,255,0.06);
      border: none;
      color: rgba(255,255,255,0.5);
      width: 28px; height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .quick-add__close:hover {
      background: rgba(255,107,107,0.15);
      color: var(--danger);
    }
    .quick-add__form {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }

    /* ===== Account Select ===== */
    .account-select {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .account-select__label {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
    }
    .account-chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .acc-chip {
      padding: 0.35rem 0.65rem;
      border-radius: 0.6rem;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: rgba(255,255,255,0.6);
      font-size: 0.78rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .acc-chip:hover {
      border-color: rgba(255,255,255,0.15);
      color: #fff;
    }
    .acc-chip--selected {
      border-color: var(--success);
      background: rgba(0,214,143,0.1);
      color: #fff;
    }

    /* ===== Add Resource Form ===== */
    .resource-form {
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .resource-form__title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }
    .form-row {
      display: flex;
      gap: 0.5rem;
    }

    /* ===== Total Bar ===== */
    .total-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(0, 214, 143, 0.08);
      border: 1px solid rgba(0, 214, 143, 0.15);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 600;
      transition: transform 0.2s ease;
    }
    .total-bar:hover { transform: translateX(4px); }
    .total-bar__value { color: var(--success); font-size: 1.1rem; }

    /* ===== Income List ===== */
    .income-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .income-item {
      display: flex; align-items: center; gap: 0.75rem;
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      transition: transform 0.2s ease;
    }
    .income-item:hover { transform: translateX(4px); }
    .income-item__icon { font-size: 1.3rem; }
    .income-item__info { flex: 1; }
    .income-item__source { font-weight: 600; color: #fff; font-size: 0.9rem; }
    .income-item__meta { font-size: 0.72rem; color: rgba(255, 255, 255, 0.4); }
    .income-item__amount { font-weight: 700; color: var(--success); }

    /* ===== Shared ===== */
    .empty-state { text-align: center; padding: 2rem; color: rgba(255, 255, 255, 0.35); }
    .empty-state__icon { font-size: 2rem; opacity: 0.5; }
    .empty-state p { margin: 0.5rem 0 0; font-size: 0.85rem; }
    .feedback {
      padding: 0.5rem 0.85rem;
      border-radius: 0.6rem;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .feedback--success {
      background: rgba(0,214,143,0.1);
      color: var(--success);
      border: 1px solid rgba(0,214,143,0.15);
    }
    .field__input {
      flex: 1;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.75rem;
      padding: 0.6rem 0.85rem;
      color: #fff;
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .field__input::placeholder { color: rgba(255,255,255,0.25); }
    .field__input:focus { border-color: rgba(108, 92, 231, 0.5); }
    .field__input--select {
      appearance: none;
      cursor: pointer;
      max-width: 140px;
    }
    .field__input--select option {
      background: #1a1e2e;
      color: #fff;
    }
    .btn {
      padding: 0.6rem 1.25rem;
      border: none;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.25s ease;
    }
    .btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .btn--success {
      background: linear-gradient(135deg, rgba(0,214,143,0.25), rgba(0,214,143,0.12));
      color: var(--success);
    }
    .btn--success:not(:disabled):hover {
      background: linear-gradient(135deg, rgba(0,214,143,0.35), rgba(0,214,143,0.18));
      transform: translateY(-1px);
    }
    .btn--accent {
      background: rgba(108, 92, 231, 0.12);
      border: 1px solid rgba(108, 92, 231, 0.2);
      color: var(--accent);
    }
    .btn--accent:hover {
      background: rgba(108, 92, 231, 0.2);
      transform: translateY(-1px);
    }
    .btn--full { width: 100%; }

    /* ===== Responsive ===== */
    @media (max-width: 480px) {
      .format-grid { grid-template-columns: repeat(2, 1fr); }
      .form-row { flex-direction: column; }
      .account-chips { flex-direction: column; }
    }
  `],
})
export class IncomeComponent {
  readonly showAddResource = signal(false);
  readonly selectedFormat = signal<IncomeResource | null>(null);
  readonly selectedAccountId = signal<string>('');
  readonly quickFeedback = signal('');
  readonly quickFeedbackType = signal<'success' | 'error'>('success');

  newResourceName = '';
  newResourceFormat: IncomeFormat = 'cash';
  quickAmount = 0;
  quickSource = '';
  quickNotes = '';

  formats: IncomeResource[] = [
    { key: 'cash', label: 'Cash', icon: '💵', variant: 'success' },
    { key: 'card', label: 'Card', icon: '💳', variant: 'accent' },
    { key: 'bank', label: 'Bank', icon: '🏦', variant: 'warning' },
    { key: 'crypto', label: 'Crypto', icon: '₿', variant: 'danger' },
  ];

  readonly availableFormats = computed(() => {
    const existing = this.formats.map(f => f.key);
    const all: IncomeFormat[] = ['cash', 'card', 'bank', 'crypto'];
    return all;
  });

  constructor(
    public readonly incomeService: IncomeService,
    public readonly accountService: AccountService,
    public readonly currency: CurrencyService,
  ) {}

  getFormatAmount(format: IncomeFormat): number {
    return this.incomeService.incomeByFormat()[format];
  }

  getFormatIcon(format: IncomeFormat): string {
    const icons: Record<IncomeFormat, string> = {
      cash: '💵', card: '💳', bank: '🏦', crypto: '₿',
    };
    return icons[format];
  }

  getAccIcon(type: string): string {
    const icons: Record<string, string> = {
      humo: '💳', uzcard: '💳', visa: '💎', mastercard: '🔶', cash: '💵', crypto: '₿',
    };
    return icons[type] || '💰';
  }

  selectFormat(fmt: IncomeResource): void {
    if (this.selectedFormat()?.key === fmt.key) {
      this.clearFormat();
    } else {
      this.selectedFormat.set(fmt);
      this.resetQuickForm();
      // Auto-select first account
      const accounts = this.accountService.allAccounts();
      if (accounts.length > 0) {
        this.selectedAccountId.set(accounts[0].id);
      }
    }
  }

  clearFormat(): void {
    this.selectedFormat.set(null);
    this.resetQuickForm();
  }

  quickAddIncome(): void {
    const fmt = this.selectedFormat();
    const accId = this.selectedAccountId();
    if (!fmt || this.quickAmount <= 0 || !this.quickSource.trim() || !accId) return;

    this.incomeService.addIncome(
      this.quickSource,
      this.quickAmount,
      fmt.key,
      accId,
      this.quickNotes || undefined,
    );
    this.accountService.updateBalance(accId, this.quickAmount);

    const formatted = this.currency.formatUZS(this.quickAmount);
    this.quickFeedback.set(`✓ +${formatted} added to ${fmt.label}`);
    this.quickFeedbackType.set('success');
    setTimeout(() => this.quickFeedback.set(''), 3000);

    this.resetQuickForm();
  }

  addResource(): void {
    if (!this.newResourceName.trim()) return;
    // For now add as a custom label for the selected format type
    // In a full app this would create a new IncomeFormat
    this.showAddResource.set(false);
    this.newResourceName = '';
  }

  private resetQuickForm(): void {
    this.quickAmount = 0;
    this.quickSource = '';
    this.quickNotes = '';
    this.quickFeedback.set('');
  }
}
