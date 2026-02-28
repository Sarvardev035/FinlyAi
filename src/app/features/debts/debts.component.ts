import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GlassCardComponent, UzsFormatPipe } from '../../shared';
import { DebtService, CurrencyService } from '../../core/services';
import { DebtType } from '../../models';

@Component({
  selector: 'app-debts',
  standalone: true,
  imports: [CommonModule, FormsModule, GlassCardComponent, UzsFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="debts">
      <div class="debts__header">
        <h2 class="section-title">📋 Debt Ledger</h2>
        <button class="btn btn--accent" (click)="showModal.set(true)">+ Add Debt</button>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          [class.tab--active]="activeTab() === 'owed'"
          (click)="activeTab.set('owed')"
        >
          I Owe ({{ debtService.owedDebts().length }})
        </button>
        <button
          class="tab"
          [class.tab--active]="activeTab() === 'collect'"
          (click)="activeTab.set('collect')"
        >
          Collect ({{ debtService.collectDebts().length }})
        </button>
      </div>

      <!-- Summary -->
      <div class="debt-summary">
        <app-glass-card variant="danger">
          <div class="summary-stat">
            <span class="summary-stat__label">Total Owed</span>
            <span class="summary-stat__value">{{ debtService.totalOwed() | uzsFormat }}</span>
          </div>
        </app-glass-card>
        <app-glass-card variant="success">
          <div class="summary-stat">
            <span class="summary-stat__label">To Collect</span>
            <span class="summary-stat__value">{{ debtService.totalCollect() | uzsFormat }}</span>
          </div>
        </app-glass-card>
      </div>

      <!-- Debt List -->
      <div class="debt-list">
        @for (alert of getFilteredAlerts(); track alert.debt.id) {
          <div class="debt-item" [class.debt-item--overdue]="alert.isOverdue" [class.debt-item--urgent]="alert.isUrgent">
            <div class="debt-item__main">
              <div class="debt-item__person">{{ alert.debt.personName }}</div>
              <div class="debt-item__amount">{{ alert.debt.amountUZS | uzsFormat }}</div>
            </div>
            <div class="debt-item__meta">
              <span class="debt-item__date">
                Due: {{ alert.debt.dueDate | date:'mediumDate' }}
              </span>
              <span class="debt-item__status" [class.text-danger]="alert.isOverdue" [class.text-warning]="alert.isUrgent">
                @if (alert.isOverdue) {
                  🔴 {{ -alert.daysRemaining }}d overdue
                } @else if (alert.isUrgent) {
                  🟡 {{ alert.daysRemaining }}d left
                } @else {
                  🟢 {{ alert.daysRemaining }}d left
                }
              </span>
            </div>
            @if (alert.debt.notes) {
              <div class="debt-item__notes">{{ alert.debt.notes }}</div>
            }
            <div class="debt-item__actions">
              <button class="btn-sm btn-sm--success" (click)="debtService.closeDebt(alert.debt.id)">✓ Paid</button>
              <button class="btn-sm btn-sm--danger" (click)="debtService.removeDebt(alert.debt.id)">✕ Remove</button>
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <span class="empty-state__icon">🎉</span>
            <p>No {{ activeTab() === 'owed' ? 'debts owed' : 'debts to collect' }}</p>
          </div>
        }
      </div>

      <!-- Add Debt Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="showModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h3>Add Debt</h3>
              <button class="modal__close" (click)="showModal.set(false)">✕</button>
            </div>
            <div class="modal__body">
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  [class.toggle-btn--active]="newDebtType === 'owed'"
                  (click)="newDebtType = 'owed'"
                >I Owe</button>
                <button
                  class="toggle-btn"
                  [class.toggle-btn--active]="newDebtType === 'collect'"
                  (click)="newDebtType = 'collect'"
                >They Owe Me</button>
              </div>
              <label class="field">
                <span class="field__label">Person Name</span>
                <input class="field__input" [(ngModel)]="newPersonName" placeholder="Who?" />
              </label>
              <label class="field">
                <span class="field__label">Amount (UZS)</span>
                <input class="field__input" type="number" [(ngModel)]="newAmount" placeholder="0" />
              </label>
              <label class="field">
                <span class="field__label">Due Date</span>
                <input class="field__input" type="date" [(ngModel)]="newDueDate" />
              </label>
              <label class="field">
                <span class="field__label">Notes</span>
                <textarea class="field__input field__textarea" [(ngModel)]="newNotes" placeholder="Optional notes..."></textarea>
              </label>
              <button class="btn btn--accent btn--full" (click)="addDebt()">Add Debt</button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .debts { display: flex; flex-direction: column; gap: 1.25rem; }
    .debts__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-title { font-size: 1.3rem; font-weight: 700; color: #fff; margin: 0; }
    .tabs { display: flex; gap: 0.5rem; }
    .tab {
      flex: 1;
      padding: 0.6rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.6rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab--active {
      background: rgba(108, 92, 231, 0.2);
      border-color: var(--accent);
      color: #fff;
    }
    .debt-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .summary-stat { display: flex; flex-direction: column; gap: 0.25rem; }
    .summary-stat__label {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .summary-stat__value { font-size: 1.25rem; font-weight: 700; color: #fff; }
    .debt-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .debt-item {
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .debt-item--overdue { border-left: 3px solid var(--danger); }
    .debt-item--urgent { border-left: 3px solid var(--warning); }
    .debt-item__main {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .debt-item__person { font-weight: 600; color: #fff; font-size: 1rem; }
    .debt-item__amount { font-weight: 700; color: #fff; font-size: 1.1rem; }
    .debt-item__meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.4);
    }
    .text-danger { color: var(--danger) !important; }
    .text-warning { color: var(--warning) !important; }
    .debt-item__notes {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
    }
    .debt-item__actions { display: flex; gap: 0.5rem; }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-sm--success { background: rgba(0, 214, 143, 0.15); color: var(--success); }
    .btn-sm--danger { background: rgba(255, 107, 107, 0.15); color: var(--danger); }
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: rgba(255, 255, 255, 0.4);
    }
    .empty-state__icon { font-size: 2rem; }
    .toggle-group { display: flex; gap: 0.5rem; }
    .toggle-btn {
      flex: 1;
      padding: 0.6rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.6rem;
      color: rgba(255, 255, 255, 0.5);
      font-weight: 600;
      cursor: pointer;
    }
    .toggle-btn--active {
      background: rgba(108, 92, 231, 0.2);
      border-color: var(--accent);
      color: #fff;
    }
    .btn { padding: 0.6rem 1.25rem; border: none; border-radius: 0.75rem; font-weight: 600; cursor: pointer; }
    .btn--accent { background: var(--accent); color: #fff; }
    .btn--full { width: 100%; margin-top: 0.5rem; }
    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--bg);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius);
      width: 90%; max-width: 420px;
      overflow: hidden;
    }
    .modal__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .modal__header h3 { margin: 0; color: #fff; }
    .modal__close { background: none; border: none; color: rgba(255, 255, 255, 0.5); font-size: 1.2rem; cursor: pointer; }
    .modal__body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field__label { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.04em; }
    .field__input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.6rem;
      padding: 0.65rem 0.75rem;
      color: #fff; font-size: 0.95rem;
      outline: none;
    }
    .field__input:focus { border-color: var(--accent); }
    .field__textarea { min-height: 60px; resize: vertical; font-family: inherit; }
  `],
})
export class DebtsComponent {
  activeTab = signal<DebtType>('owed');
  showModal = signal(false);

  newDebtType: DebtType = 'owed';
  newPersonName = '';
  newAmount = 0;
  newDueDate = '';
  newNotes = '';

  constructor(
    public readonly debtService: DebtService,
    public readonly currency: CurrencyService,
  ) {}

  getFilteredAlerts() {
    return this.debtService.alerts().filter(
      (a) => a.debt.type === this.activeTab() && a.debt.status === 'OPEN'
    );
  }

  addDebt(): void {
    if (!this.newPersonName.trim() || this.newAmount <= 0 || !this.newDueDate) return;
    this.debtService.addDebt(
      this.newPersonName,
      this.newAmount,
      this.newDebtType,
      new Date(this.newDueDate),
      this.newNotes || undefined
    );
    this.newPersonName = '';
    this.newAmount = 0;
    this.newDueDate = '';
    this.newNotes = '';
    this.showModal.set(false);
  }
}
