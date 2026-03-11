import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsdFormatPipe } from '../../shared';
import { BudgetService } from '../../core/services';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, FormsModule, UsdFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="budget">
      <div class="budget__header">
        <h2 class="section-title">📊 Budget Manager</h2>
        <button class="btn btn--accent" (click)="showBudgetModal.set(true)">+ Add Budget</button>
      </div>

      <!-- Budget Progress -->
      <div class="budget-list">
        @for (bp of budgetService.budgetProgress(); track bp.budget.id) {
          <div class="budget-item">
            <div class="budget-item__header">
              <span class="budget-item__category">{{ bp.budget.category }}</span>
              <span class="budget-item__amounts">
                {{ bp.budget.usedUSD | usdFormat }} / {{ bp.budget.limitUSD | usdFormat }}
              </span>
            </div>
            <div class="progress">
              <div
                class="progress__bar"
                [style.width.%]="bp.percentage"
                [style.background]="bp.color"
              ></div>
            </div>
            <div class="budget-item__footer">
              <span class="budget-item__pct" [style.color]="bp.color">{{ bp.percentage }}%</span>
              <span class="budget-item__remaining">
                {{ bp.budget.limitUSD - bp.budget.usedUSD | usdFormat }} remaining
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Total Summary -->
      <div class="total-bar">
        <span>Total Budget</span>
        <span>{{ budgetService.totalUsed() | usdFormat }} / {{ budgetService.totalLimit() | usdFormat }}</span>
      </div>

      <!-- Family Sharing -->
      <div class="family-section">
        <div class="family-section__header">
          <h3 class="section-title--sm">👨‍👩‍👧 Family Sharing</h3>
          <button class="btn-sm btn-sm--accent" (click)="showFamilyModal.set(true)">+ Add</button>
        </div>
        <div class="family-grid">
          @for (member of budgetService.allFamily(); track member.id) {
            <div class="family-avatar" [style.background]="member.color">
              <span class="family-avatar__initial">{{ member.initial }}</span>
              <span class="family-avatar__name">{{ member.name }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Add Budget Modal -->
      @if (showBudgetModal()) {
        <div class="modal-overlay" (click)="showBudgetModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h3>Add Budget</h3>
              <button class="modal__close" (click)="showBudgetModal.set(false)">✕</button>
            </div>
            <div class="modal__body">
              <label class="field">
                <span class="field__label">Category</span>
                <input class="field__input" [(ngModel)]="newCategory" placeholder="e.g. Entertainment" />
              </label>
              <label class="field">
                <span class="field__label">Limit (USD)</span>
                <input class="field__input" type="number" [(ngModel)]="newLimit" placeholder="0" />
              </label>
              <button class="btn btn--accent btn--full" (click)="addBudget()">Add Budget</button>
            </div>
          </div>
        </div>
      }

      <!-- Add Family Modal -->
      @if (showFamilyModal()) {
        <div class="modal-overlay" (click)="showFamilyModal.set(false)">
          <div class="modal" (click)="$event.stopPropagation()">
            <div class="modal__header">
              <h3>Add Family Member</h3>
              <button class="modal__close" (click)="showFamilyModal.set(false)">✕</button>
            </div>
            <div class="modal__body">
              <label class="field">
                <span class="field__label">Name</span>
                <input class="field__input" [(ngModel)]="newMemberName" placeholder="Name" />
              </label>
              <label class="field">
                <span class="field__label">Color</span>
                <input class="field__input" type="color" [(ngModel)]="newMemberColor" />
              </label>
              <button class="btn btn--accent btn--full" (click)="addMember()">Add Member</button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: [`
    .budget { display: flex; flex-direction: column; gap: 1.25rem; }
    .budget__header { display: flex; align-items: center; justify-content: space-between; }
    .section-title { font-size: 1.3rem; font-weight: 700; color: #fff; margin: 0; }
    .section-title--sm { font-size: 1rem; font-weight: 600; color: #fff; margin: 0; }
    .budget-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .budget-item {
      background: var(--surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius);
      padding: 1rem;
      display: flex; flex-direction: column; gap: 0.5rem;
    }
    .budget-item__header { display: flex; justify-content: space-between; align-items: center; }
    .budget-item__category { font-weight: 600; color: #fff; }
    .budget-item__amounts { font-size: 0.85rem; color: rgba(255, 255, 255, 0.5); }
    .progress {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress__bar {
      height: 100%;
      border-radius: 999px;
      transition: width 0.5s ease;
    }
    .budget-item__footer { display: flex; justify-content: space-between; font-size: 0.8rem; }
    .budget-item__pct { font-weight: 700; }
    .budget-item__remaining { color: rgba(255, 255, 255, 0.4); }
    .total-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(108, 92, 231, 0.1);
      border: 1px solid rgba(108, 92, 231, 0.2);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 600;
    }
    .family-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .family-section__header { display: flex; justify-content: space-between; align-items: center; }
    .family-grid { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .family-avatar {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      width: 64px; height: 64px;
      border-radius: 50%;
      justify-content: center;
      position: relative;
    }
    .family-avatar__initial { font-size: 1.2rem; font-weight: 700; color: #fff; }
    .family-avatar__name {
      position: absolute; bottom: -18px;
      font-size: 0.65rem; color: rgba(255, 255, 255, 0.5); white-space: nowrap;
    }
    .btn { padding: 0.6rem 1.25rem; border: none; border-radius: 0.75rem; font-weight: 600; cursor: pointer; }
    .btn--accent { background: var(--accent); color: #fff; }
    .btn--full { width: 100%; margin-top: 0.5rem; }
    .btn-sm { padding: 0.35rem 0.75rem; border: none; border-radius: 0.5rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .btn-sm--accent { background: rgba(108, 92, 231, 0.2); color: var(--accent); }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
    }
    .modal {
      background: var(--bg); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius); width: 90%; max-width: 420px; overflow: hidden;
    }
    .modal__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .modal__header h3 { margin: 0; color: #fff; }
    .modal__close { background: none; border: none; color: rgba(255, 255, 255, 0.5); font-size: 1.2rem; cursor: pointer; }
    .modal__body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field__label { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.04em; }
    .field__input {
      background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.6rem; padding: 0.65rem 0.75rem; color: #fff; font-size: 0.95rem; outline: none;
    }
    .field__input:focus { border-color: var(--accent); }
  `],
})
export class BudgetComponent implements OnInit {
  showBudgetModal = signal(false);
  showFamilyModal = signal(false);

  newCategory = '';
  newLimit = 0;
  newMemberName = '';
  newMemberColor = '#6c5ce7';

  constructor(public readonly budgetService: BudgetService) {}

  ngOnInit(): void {
    this.budgetService.loadBudgets();
  }

  addBudget(): void {
    if (!this.newCategory.trim() || this.newLimit <= 0) return;
    this.budgetService.addBudget(this.newCategory, this.newLimit);
    this.newCategory = '';
    this.newLimit = 0;
    this.showBudgetModal.set(false);
  }

  addMember(): void {
    if (!this.newMemberName.trim()) return;
    this.budgetService.addFamilyMember(this.newMemberName, this.newMemberColor);
    this.newMemberName = '';
    this.newMemberColor = '#6c5ce7';
    this.showFamilyModal.set(false);
  }
}
