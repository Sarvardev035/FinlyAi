import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { animate, splitText, stagger, spring } from 'animejs';
import { UzsFormatPipe } from '../../shared';
import { AnimStatCardComponent } from '../../shared/components/anim-stat-card/anim-stat-card.component';
import { AnimTransactionListComponent } from '../../shared/components/anim-transaction-list/anim-transaction-list.component';
import { AnimCashflowChartComponent, CashflowBar } from '../../shared/components/anim-cashflow-chart/anim-cashflow-chart.component';
import { CurrencySceneComponent } from '../../shared/components/currency-scene/currency-scene.component';
import { AccountService, TransactionService, IncomeService, DebtService, CurrencyService, FamilyService } from '../../core/services';
import { Account, FamilyMember, FamilyPermission } from '../../models';
import { TransactionCategory } from '../../models/transaction.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, UzsFormatPipe, AnimStatCardComponent, AnimTransactionListComponent, AnimCashflowChartComponent, CurrencySceneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section #dashRoot class="dashboard">
      <app-currency-scene class="dashboard__scene" [density]="64" />

      <!-- Hero -->
      <div class="hero">
        <div class="hero__glow" aria-hidden="true"></div>
        <h1 class="hero__title">Good {{ getGreeting() }}, Sardor 👋</h1>
        <p class="hero__subtitle">Here's your financial overview</p>
      </div>

      <!-- Animated Stat Cards -->
      <div class="stat-cards-row">
        <app-anim-stat-card
          [value]="accountService.summary().totalBalanceUZS"
          label="Net Worth"
          variant="networth"
        />
        <app-anim-stat-card
          [value]="incomeService.totalIncome()"
          label="Total Income"
          variant="income"
        />
        <app-anim-stat-card
          [value]="transactionService.totalExpenses()"
          label="Expenses"
          variant="expense"
        />
      </div>

      <!-- Wallets -->
      <div class="section">
        <h3 class="section-title">My Wallets</h3>
        <p class="section-hint">Tap a wallet to send income or expense to it</p>
        <div class="wallets-grid">
          @for (acc of accountService.allAccounts(); track acc.id; let i = $index) {
            <button
              class="wallet-chip"
              [class.wallet-chip--selected]="selectedAccount()?.id === acc.id"
              [class.wallet-chip--humo]="acc.type === 'humo'"
              [class.wallet-chip--uzcard]="acc.type === 'uzcard'"
              [class.wallet-chip--cash]="acc.type === 'cash'"
              [class.wallet-chip--visa]="acc.type === 'visa'"
              [style.animation-delay]="(i * 60) + 'ms'"
              (click)="selectAccount(acc)"
            >
              <span class="wallet-chip__icon">{{ getWalletIcon(acc.type) }}</span>
              <div class="wallet-chip__info">
                <span class="wallet-chip__name">{{ acc.name }}</span>
                <span class="wallet-chip__balance">{{ acc.balanceUZS | uzsFormat }}</span>
              </div>
              @if (selectedAccount()?.id === acc.id) {
                <span class="wallet-chip__check">✓</span>
              }
            </button>
          }
        </div>
      </div>

      <!-- Quick Action Panel (shown when a wallet is selected) -->
      @if (selectedAccount(); as acc) {
        <div class="action-panel anim-scale-in">
          <div class="action-panel__header">
            <span class="action-panel__wallet">{{ getWalletIcon(acc.type) }} {{ acc.name }}</span>
            <button class="action-panel__close" (click)="clearSelection()">✕</button>
          </div>

          <!-- Action Tabs -->
          <div class="action-tabs">
            <button
              class="action-tab"
              [class.action-tab--active]="actionMode() === 'income'"
              [class.action-tab--income]="actionMode() === 'income'"
              (click)="actionMode.set('income')"
            >+ Income</button>
            <button
              class="action-tab"
              [class.action-tab--active]="actionMode() === 'expense'"
              [class.action-tab--expense]="actionMode() === 'expense'"
              (click)="actionMode.set('expense')"
            >− Expense</button>
          </div>

          <!-- Form -->
          <div class="action-form">
            <div class="form-row">
              <input
                type="number"
                class="form-input"
                placeholder="Amount (UZS)"
                [ngModel]="amount()"
                (ngModelChange)="amount.set($event)"
              />
              @if (actionMode() === 'expense') {
                <select class="form-select" [ngModel]="category()" (ngModelChange)="category.set($event)">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              }
            </div>
            <input
              type="text"
              class="form-input"
              [placeholder]="actionMode() === 'income' ? 'Source (e.g. Salary, Freelance)' : 'Description (optional)'"
              [ngModel]="description()"
              (ngModelChange)="description.set($event)"
            />
            <button
              class="action-btn"
              [class.action-btn--income]="actionMode() === 'income'"
              [class.action-btn--expense]="actionMode() === 'expense'"
              [disabled]="!amount() || amount()! <= 0"
              (click)="submitAction()"
            >
              {{ actionMode() === 'income' ? '+ Add Income' : '− Record Expense' }} to {{ acc.name }}
            </button>
            @if (feedback()) {
              <div class="feedback" [class.feedback--success]="feedbackType() === 'success'" [class.feedback--error]="feedbackType() === 'error'">
                {{ feedback() }}
              </div>
            }
          </div>
        </div>
      }

      <!-- Cashflow Chart + Transaction List -->
      <div class="cashflow-grid">
        <app-anim-cashflow-chart [data]="cashflowBars()" />
        <app-anim-transaction-list [transactions]="transactionService.recentTransactions()" />
      </div>

      <!-- Debt Alerts -->
      @if (debtService.urgentAlerts().length > 0) {
        <div class="section">
          <h3 class="section-title">⚠️ Debt Alerts</h3>
          <div class="alerts__list">
            @for (alert of debtService.urgentAlerts(); track alert.debt.id) {
              <div class="alert-item" [class.alert-item--overdue]="alert.isOverdue">
                <span class="alert-item__person">{{ alert.debt.personName }}</span>
                <span class="alert-item__amount">{{ alert.debt.amountUZS | uzsFormat }}</span>
                <span class="alert-item__days">
                  @if (alert.isOverdue) {
                    {{ -alert.daysRemaining }} days overdue
                  } @else {
                    {{ alert.daysRemaining }} days left
                  }
                </span>
              </div>
            }
          </div>
        </div>
      }

      <!-- Family Section -->
      <div class="section">
        <div class="section-header">
          <div>
            <h3 class="section-title">👨‍👩‍👧‍👦 Family</h3>
            <p class="section-hint">Manage money with family members</p>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="add-btn" style="background: rgba(255, 169, 77, 0.15); color: var(--warning);" (click)="showSplitGather.set(!showSplitGather())">
              {{ showSplitGather() ? '✕' : '🍕 Split' }}
            </button>
            <button class="add-btn" (click)="showAddFamily.set(!showAddFamily())">
              {{ showAddFamily() ? '✕' : '+ Add' }}
            </button>
          </div>
        </div>

        <!-- Split & Gather Form -->
        @if (showSplitGather()) {
          <div class="add-family-form anim-scale-in" style="margin-bottom: 1rem; border: 1px solid var(--warning);">
            <div style="margin-bottom: 0.75rem;">
              <h4 style="font-size: 0.9rem; margin-bottom: 0.4rem; color: #fff;">Split & Gather Money</h4>
              <p style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">Evenly divide bill and request/give to members.</p>
            </div>

            <!-- Action Tabs -->
            <div class="action-tabs" style="margin-bottom: 0.75rem;">
              <button
                class="action-tab"
                [class.action-tab--active]="splitAction() === 'gather'"
                [class.action-tab--income]="splitAction() === 'gather'"
                (click)="splitAction.set('gather')"
              >💰 Gather (They pay you)</button>
              <button
                class="action-tab"
                [class.action-tab--active]="splitAction() === 'split'"
                [class.action-tab--expense]="splitAction() === 'split'"
                (click)="splitAction.set('split')"
              >💸 Split (You pay them)</button>
            </div>

            <!-- Member Selection -->
            <div class="family-grid" style="margin-bottom: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));">
              @for (member of familyService.allMembers(); track member.id) {
                <button
                  class="family-card"
                  [class.family-card--selected]="splitSelectedMembers().has(member.id)"
                  (click)="toggleSplitMember(member.id)"
                  style="padding: 0.4rem 0.6rem;"
                >
                  <div class="family-card__avatar family-card__avatar--sm" [style.background]="member.color + '22'" [style.color]="member.color">
                    {{ member.initial }}
                  </div>
                  <div class="family-card__info">
                    <span class="family-card__name" style="font-size: 0.8rem;">{{ member.name }}</span>
                  </div>
                  @if (splitSelectedMembers().has(member.id)) {
                    <span class="wallet-chip__check">✓</span>
                  }
                </button>
              }
            </div>

            <!-- Wallet Select -->
            <div class="wallet-select" style="margin-bottom: 0.75rem;">
              <span class="wallet-select__label">Target wallet:</span>
              <div class="wallet-select__chips">
                @for (acc of accountService.allAccounts(); track acc.id) {
                  <button
                    class="mini-wallet"
                    [class.mini-wallet--selected]="splitTargetAccount()?.id === acc.id"
                    (click)="splitTargetAccount.set(acc)"
                  >
                    {{ getWalletIcon(acc.type) }} {{ acc.name }}
                  </button>
                }
              </div>
            </div>

            <!-- Amount + Note -->
            <div class="form-row" style="margin-bottom: 0.75rem;">
              <input
                type="number"
                class="form-input"
                placeholder="Total Amount (UZS) to divide"
                [ngModel]="splitAmount()"
                (ngModelChange)="splitAmount.set($event)"
              />
            </div>
            <input
              type="text"
              class="form-input"
              placeholder="Description (e.g. Dinner)"
              style="margin-bottom: 0.75rem;"
              [ngModel]="splitNote()"
              (ngModelChange)="splitNote.set($event)"
            />

            <button
              class="action-btn action-btn--family"
              (click)="submitSplitGather()"
              [disabled]="!splitAmount() || splitSelectedMembers().size === 0 || !splitTargetAccount()"
            >
              {{ splitAction() === 'gather' ? 'Request' : 'Give' }} ({{ splitSelectedMembers().size }} members)
            </button>
          </div>
        }

        <!-- Add Family Form -->
        @if (showAddFamily()) {
          <div class="add-family-form anim-scale-in">
            <div class="form-row">
              <input
                type="text"
                class="form-input"
                placeholder="Name (e.g. Mom)"
                [ngModel]="newFamilyName()"
                (ngModelChange)="newFamilyName.set($event)"
              />
              <input
                type="text"
                class="form-input"
                placeholder="Relation (e.g. Mother)"
                [ngModel]="newFamilyRelation()"
                (ngModelChange)="newFamilyRelation.set($event)"
              />
            </div>
            <div class="permissions-row">
              <span class="permissions-label">Permissions:</span>
              <label class="perm-check">
                <input type="checkbox" [checked]="newPermGive()" (change)="newPermGive.set(!newPermGive())" />
                <span class="perm-tag perm-tag--give">💸 Give</span>
              </label>
              <label class="perm-check">
                <input type="checkbox" [checked]="newPermReceive()" (change)="newPermReceive.set(!newPermReceive())" />
                <span class="perm-tag perm-tag--receive">💰 Receive</span>
              </label>
              <label class="perm-check">
                <input type="checkbox" [checked]="newPermDebt()" (change)="newPermDebt.set(!newPermDebt())" />
                <span class="perm-tag perm-tag--debt">📋 Debt</span>
              </label>
            </div>
            <button
              class="action-btn action-btn--family"
              [disabled]="!newFamilyName().trim() || !newFamilyRelation().trim()"
              (click)="addFamilyMember()"
            >+ Add Family Member</button>
          </div>
        }

        <!-- Family Stats -->
        @if (familyService.allMembers().length > 0) {
          <div class="family-stats">
            <div class="fstat fstat--give">
              <span class="fstat__label">Given</span>
              <span class="fstat__value">{{ familyService.totalGiven() | uzsFormat }}</span>
            </div>
            <div class="fstat fstat--receive">
              <span class="fstat__label">Received</span>
              <span class="fstat__value">{{ familyService.totalReceived() | uzsFormat }}</span>
            </div>
            <div class="fstat fstat--debt">
              <span class="fstat__label">Family Debt</span>
              <span class="fstat__value">{{ familyService.totalFamilyDebt() | uzsFormat }}</span>
            </div>
          </div>
        }

        <!-- Family Members -->
        <div class="family-grid">
          @for (member of familyService.allMembers(); track member.id; let i = $index) {
            <button
              class="family-card"
              [class.family-card--selected]="selectedFamily()?.id === member.id"
              [style.animation-delay]="(i * 70) + 'ms'"
              (click)="selectFamily(member)"
            >
              <div class="family-card__avatar" [style.background]="member.color + '22'" [style.color]="member.color">
                {{ member.initial }}
              </div>
              <div class="family-card__info">
                <span class="family-card__name">{{ member.name }}</span>
                <span class="family-card__relation">{{ member.relation }}</span>
              </div>
              <div class="family-card__perms">
                @for (p of member.permissions; track p) {
                  <span class="perm-dot" [class.perm-dot--give]="p === 'give'" [class.perm-dot--receive]="p === 'receive'" [class.perm-dot--debt]="p === 'debt'">
                    {{ p === 'give' ? '💸' : p === 'receive' ? '💰' : '📋' }}
                  </span>
                }
              </div>
              @if (selectedFamily()?.id === member.id) {
                <span class="wallet-chip__check">✓</span>
              }
            </button>
          }
        </div>

        @if (familyService.allMembers().length === 0) {
          <div class="empty-state">
            <span class="empty-state__icon">👨‍👩‍👧‍👦</span>
            <span class="empty-state__text">Add family members to track shared finances</span>
          </div>
        }
      </div>

      <!-- Family Action Panel -->
      @if (selectedFamily(); as member) {
        <div class="action-panel anim-scale-in">
          <div class="action-panel__header">
            <div class="action-panel__member-info">
              <div class="family-card__avatar family-card__avatar--sm" [style.background]="member.color + '22'" [style.color]="member.color">
                {{ member.initial }}
              </div>
              <span class="action-panel__wallet">{{ member.name }} · {{ member.relation }}</span>
            </div>
            <div class="action-panel__header-actions">
              <button class="action-panel__close action-panel__close--del" title="Remove member" (click)="removeFamilyMember(member.id)">🗑</button>
              <button class="action-panel__close" (click)="clearFamilySelection()">✕</button>
            </div>
          </div>

          <!-- Family Action Tabs -->
          <div class="action-tabs">
            @if (member.permissions.includes('receive')) {
              <button
                class="action-tab"
                [class.action-tab--active]="familyAction() === 'receive'"
                [class.action-tab--income]="familyAction() === 'receive'"
                (click)="familyAction.set('receive')"
              >💰 Receive</button>
            }
            @if (member.permissions.includes('give')) {
              <button
                class="action-tab"
                [class.action-tab--active]="familyAction() === 'give'"
                [class.action-tab--expense]="familyAction() === 'give'"
                (click)="familyAction.set('give')"
              >💸 Give</button>
            }
            @if (member.permissions.includes('debt')) {
              <button
                class="action-tab"
                [class.action-tab--active]="familyAction() === 'debt'"
                [class.action-tab--debt]="familyAction() === 'debt'"
                (click)="familyAction.set('debt')"
              >📋 Debt</button>
            }
          </div>

          <!-- Description -->
          <div class="family-action-hint">
            @if (familyAction() === 'receive') {
              {{ member.name }} gives you money → goes to your wallet
            } @else if (familyAction() === 'give') {
              You give money to {{ member.name }} → deducted from your wallet
            } @else {
              Borrow money from {{ member.name }} → added to wallet, tracked as debt
            }
          </div>

          <!-- Select wallet -->
          <div class="wallet-select">
            <span class="wallet-select__label">To wallet:</span>
            <div class="wallet-select__chips">
              @for (acc of accountService.allAccounts(); track acc.id) {
                <button
                  class="mini-wallet"
                  [class.mini-wallet--selected]="familyTargetAccount()?.id === acc.id"
                  (click)="familyTargetAccount.set(acc)"
                >
                  {{ getWalletIcon(acc.type) }} {{ acc.name }}
                </button>
              }
            </div>
          </div>

          <!-- Amount + Note -->
          <div class="action-form">
            <div class="form-row">
              <input
                type="number"
                class="form-input"
                placeholder="Amount (UZS)"
                [ngModel]="familyAmount()"
                (ngModelChange)="familyAmount.set($event)"
              />
            </div>
            <input
              type="text"
              class="form-input"
              placeholder="Note (optional)"
              [ngModel]="familyNote()"
              (ngModelChange)="familyNote.set($event)"
            />
            <button
              class="action-btn"
              [class.action-btn--income]="familyAction() === 'receive'"
              [class.action-btn--expense]="familyAction() === 'give'"
              [class.action-btn--debt]="familyAction() === 'debt'"
              [disabled]="!familyAmount() || familyAmount()! <= 0 || !familyTargetAccount()"
              (click)="submitFamilyAction()"
            >
              @if (familyAction() === 'receive') {
                💰 Receive from {{ member.name }}
              } @else if (familyAction() === 'give') {
                💸 Give to {{ member.name }}
              } @else {
                📋 Borrow from {{ member.name }}
              }
            </button>
            @if (familyFeedback()) {
              <div class="feedback" [class.feedback--success]="familyFeedbackType() === 'success'" [class.feedback--error]="familyFeedbackType() === 'error'">
                {{ familyFeedback() }}
              </div>
            }
          </div>

          <!-- Member History -->
          @if (getMemberTransactions(member.id).length > 0) {
            <div class="member-history">
              <span class="member-history__title">Recent</span>
              @for (tx of getMemberTransactions(member.id).slice(0, 5); track tx.id) {
                <div class="history-row">
                  <span class="history-row__type" [class.history-row__type--give]="tx.type === 'give'" [class.history-row__type--receive]="tx.type === 'receive'" [class.history-row__type--debt]="tx.type === 'debt'">
                    {{ tx.type === 'give' ? '💸' : tx.type === 'receive' ? '💰' : '📋' }}
                  </span>
                  <span class="history-row__amount" [class.history-row__amount--positive]="tx.type !== 'give'" [class.history-row__amount--negative]="tx.type === 'give'">
                    {{ tx.type === 'give' ? '−' : '+' }}{{ tx.amountUZS | uzsFormat }}
                  </span>
                  @if (tx.note) {
                    <span class="history-row__note">{{ tx.note }}</span>
                  }
                  @if (tx.type === 'debt' && tx.status === 'pending') {
                    <button class="settle-btn" (click)="settleDebt(tx.id)">Settle</button>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    /* ===== Animations ===== */
    @keyframes fadeDown {
      from { opacity: 0; transform: translateY(-12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes chipIn {
      from { opacity: 0; transform: translateY(10px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(108, 92, 231, 0.4); }
      50% { box-shadow: 0 0 0 6px rgba(108, 92, 231, 0); }
    }
    @keyframes feedbackIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .anim-fade-down { animation: fadeDown 0.5s ease-out both; }
    .anim-fade-up { animation: fadeUp 0.5s ease-out both; }
    .anim-scale-in { animation: scaleIn 0.35s ease-out both; }
    .anim-d1 { animation-delay: 80ms; }
    .anim-d2 { animation-delay: 160ms; }
    .anim-d3 { animation-delay: 240ms; }
    .anim-d4 { animation-delay: 320ms; }
    .anim-d5 { animation-delay: 400ms; }
    .anim-d6 { animation-delay: 480ms; }

    /* ===== Layout ===== */
    .dashboard {
      position: relative;
      isolation: isolate;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .dashboard__scene {
      position: absolute;
      inset: 0;
      z-index: 0;
      opacity: 0.75;
    }

    .dashboard > :not(.dashboard__scene) {
      position: relative;
      z-index: 1;
    }

    .hero,
    .stat-cards-row,
    .cashflow-grid,
    .section {
      will-change: transform, opacity;
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    .hero { padding: 0.75rem 0 0; }
    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 1.2rem;
      padding: 1rem 1rem 0.7rem;
    }
    .hero__glow {
      position: absolute;
      inset: -35% -20% auto auto;
      width: min(46vw, 430px);
      height: min(46vw, 430px);
      border-radius: 50%;
      pointer-events: none;
      background:
        radial-gradient(circle at 32% 32%, rgba(0,214,143,0.3), transparent 52%),
        radial-gradient(circle at 70% 58%, rgba(108,92,231,0.32), transparent 58%),
        radial-gradient(circle at 45% 75%, rgba(9,132,227,0.24), transparent 60%);
      filter: blur(24px) saturate(1.1);
      opacity: 0.75;
      animation: heroGlowFloat 8s ease-in-out infinite;
      z-index: 0;
    }
    .hero__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .hero__subtitle { color: rgba(255,255,255,0.45); margin: 0.15rem 0 0; font-size: 0.9rem; }
    .hero__title,
    .hero__subtitle {
      position: relative;
      z-index: 1;
    }
    .hero__title .word,
    .hero__subtitle .char {
      display: inline-block;
      transform-origin: 50% 100%;
      will-change: transform, opacity;
      backface-visibility: hidden;
    }

    @keyframes heroGlowFloat {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.72; }
      50% { transform: translate3d(-18px, 16px, 0) scale(1.05); opacity: 0.92; }
    }

    /* ===== Stats Row ===== */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }
    .stat-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      border-left: 3px solid var(--accent);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .stat-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0,0,0,0.2);
    }
    .stat-pill--success { border-left-color: var(--success); }
    .stat-pill--danger { border-left-color: var(--danger); }
    .stat-pill__icon { font-size: 1.4rem; }
    .stat-pill__text { display: flex; flex-direction: column; }
    .stat-pill__label {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-pill__value { font-size: 1.15rem; font-weight: 700; color: #fff; }

    /* ===== Animated Stat Cards Row ===== */
    .stat-cards-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.875rem;
    }
    @media (max-width: 680px) {
      .stat-cards-row { grid-template-columns: 1fr; }
    }

    /* ===== Cashflow grid ===== */
    .cashflow-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.875rem;
      align-items: start;
    }
    @media (max-width: 720px) {
      .cashflow-grid { grid-template-columns: 1fr; }
    }

    /* ===== Sections ===== */
    .section-title { font-size: 1rem; color: #fff; margin: 0; font-weight: 600; }
    .section-hint {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.35);
      margin: 0.15rem 0 0.75rem;
    }
    .section { display: flex; flex-direction: column; }
    .section--3d { margin-bottom: 0.25rem; }

    /* ===== Wallet Chips ===== */
    .wallets-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.65rem;
    }
    .wallet-chip {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--surface);
      border: 1.5px solid rgba(255,255,255,0.06);
      border-radius: 1rem;
      padding: 0.85rem 1rem;
      cursor: pointer;
      color: #fff;
      font-family: inherit;
      text-align: left;
      animation: chipIn 0.4s ease-out both;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }
    .wallet-chip::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }
    .wallet-chip:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      border-color: rgba(255,255,255,0.12);
    }
    .wallet-chip--selected {
      border-color: var(--accent) !important;
      background: rgba(108, 92, 231, 0.08);
      animation: pulse 2s ease-in-out infinite;
    }
    .wallet-chip--humo.wallet-chip--selected { border-color: #6c5ce7 !important; }
    .wallet-chip--uzcard.wallet-chip--selected { border-color: #00d68f !important; }
    .wallet-chip--cash.wallet-chip--selected { border-color: #ffa94d !important; }
    .wallet-chip--visa.wallet-chip--selected { border-color: #0984e3 !important; }

    .wallet-chip__icon { font-size: 1.5rem; flex-shrink: 0; }
    .wallet-chip__info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .wallet-chip__name {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
    }
    .wallet-chip__balance {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
    }
    .wallet-chip__check {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--accent);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      flex-shrink: 0;
      animation: scaleIn 0.25s ease-out;
    }

    /* ===== Action Panel ===== */
    .action-panel {
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .action-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .action-panel__wallet {
      font-weight: 600;
      font-size: 1rem;
      color: #fff;
    }
    .action-panel__close {
      background: rgba(255,255,255,0.06);
      border: none;
      color: rgba(255,255,255,0.5);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .action-panel__close:hover {
      background: rgba(255,107,107,0.15);
      color: var(--danger);
    }

    /* ===== Action Tabs ===== */
    .action-tabs {
      display: flex;
      gap: 0.5rem;
      background: rgba(255,255,255,0.03);
      border-radius: 0.75rem;
      padding: 0.25rem;
    }
    .action-tab {
      flex: 1;
      padding: 0.5rem;
      border: none;
      border-radius: 0.6rem;
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
      background: transparent;
      color: rgba(255,255,255,0.4);
      transition: all 0.25s ease;
      font-family: inherit;
    }
    .action-tab--active {
      color: #fff;
    }
    .action-tab--income.action-tab--active {
      background: rgba(0, 214, 143, 0.12);
      color: var(--success);
    }
    .action-tab--expense.action-tab--active {
      background: rgba(255, 107, 107, 0.12);
      color: var(--danger);
    }

    /* ===== Form ===== */
    .action-form {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .form-row {
      display: flex;
      gap: 0.5rem;
    }
    .form-input, .form-select {
      flex: 1;
      padding: 0.6rem 0.85rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 0.75rem;
      color: #fff;
      font-size: 0.85rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .form-input::placeholder { color: rgba(255,255,255,0.25); }
    .form-input:focus, .form-select:focus {
      border-color: rgba(108, 92, 231, 0.5);
    }
    .form-select {
      appearance: none;
      cursor: pointer;
    }
    .form-select option {
      background: #1a1e2e;
      color: #fff;
    }
    .action-btn {
      padding: 0.65rem 1rem;
      border: none;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.25s ease;
      color: #fff;
    }
    .action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .action-btn--income {
      background: linear-gradient(135deg, rgba(0,214,143,0.2), rgba(0,214,143,0.1));
      color: var(--success);
    }
    .action-btn--income:not(:disabled):hover {
      background: linear-gradient(135deg, rgba(0,214,143,0.3), rgba(0,214,143,0.15));
      transform: translateY(-1px);
    }
    .action-btn--expense {
      background: linear-gradient(135deg, rgba(255,107,107,0.2), rgba(255,107,107,0.1));
      color: var(--danger);
    }
    .action-btn--expense:not(:disabled):hover {
      background: linear-gradient(135deg, rgba(255,107,107,0.3), rgba(255,107,107,0.15));
      transform: translateY(-1px);
    }

    /* ===== Feedback ===== */
    .feedback {
      padding: 0.5rem 0.85rem;
      border-radius: 0.6rem;
      font-size: 0.8rem;
      font-weight: 500;
      animation: feedbackIn 0.3s ease-out;
    }
    .feedback--success {
      background: rgba(0,214,143,0.1);
      color: var(--success);
      border: 1px solid rgba(0,214,143,0.15);
    }
    .feedback--error {
      background: rgba(255,107,107,0.1);
      color: var(--danger);
      border: 1px solid rgba(255,107,107,0.15);
    }

    /* ===== Alerts ===== */
    .alerts__list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .alert-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 169, 77, 0.08);
      border: 1px solid rgba(255, 169, 77, 0.15);
      border-radius: 0.75rem;
      padding: 0.65rem 0.85rem;
      transition: transform 0.2s ease;
    }
    .alert-item:hover { transform: translateX(4px); }
    .alert-item--overdue {
      background: rgba(255, 107, 107, 0.08);
      border-color: rgba(255, 107, 107, 0.2);
    }
    .alert-item__person { color: #fff; font-weight: 600; font-size: 0.9rem; }
    .alert-item__amount { color: var(--warning); font-weight: 600; font-size: 0.9rem; }
    .alert-item--overdue .alert-item__amount { color: var(--danger); }
    .alert-item__days {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.4);
    }

    /* ===== Section Header ===== */
    .section-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .section-header .section-hint { margin-bottom: 0; }
    .add-btn {
      background: rgba(108, 92, 231, 0.12);
      border: 1px solid rgba(108, 92, 231, 0.2);
      color: var(--accent);
      padding: 0.4rem 0.85rem;
      border-radius: 0.6rem;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.25s ease;
      white-space: nowrap;
    }
    .add-btn:hover {
      background: rgba(108, 92, 231, 0.2);
      transform: translateY(-1px);
    }

    /* ===== Add Family Form ===== */
    .add-family-form {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      margin-bottom: 0.85rem;
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: var(--radius);
      padding: 1rem;
    }
    .permissions-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .permissions-label {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.45);
      font-weight: 500;
    }
    .perm-check {
      display: flex;
      align-items: center;
      cursor: pointer;
    }
    .perm-check input { display: none; }
    .perm-tag {
      padding: 0.3rem 0.6rem;
      border-radius: 0.5rem;
      font-size: 0.72rem;
      font-weight: 600;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: rgba(255,255,255,0.5);
      transition: all 0.2s ease;
    }
    .perm-check input:checked + .perm-tag--give {
      background: rgba(255, 107, 107, 0.12);
      border-color: rgba(255, 107, 107, 0.25);
      color: var(--danger);
    }
    .perm-check input:checked + .perm-tag--receive {
      background: rgba(0, 214, 143, 0.12);
      border-color: rgba(0, 214, 143, 0.25);
      color: var(--success);
    }
    .perm-check input:checked + .perm-tag--debt {
      background: rgba(255, 169, 77, 0.12);
      border-color: rgba(255, 169, 77, 0.25);
      color: var(--warning);
    }
    .action-btn--family {
      background: linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.1));
      color: var(--accent);
    }
    .action-btn--family:not(:disabled):hover {
      background: linear-gradient(135deg, rgba(108,92,231,0.3), rgba(108,92,231,0.15));
      transform: translateY(-1px);
    }

    /* ===== Family Stats ===== */
    .family-stats {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      flex-wrap: wrap;
    }
    .fstat {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 120px;
      padding: 0.6rem 0.85rem;
      border-radius: 0.75rem;
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.06);
    }
    .fstat__label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(255,255,255,0.4);
    }
    .fstat__value { font-size: 0.95rem; font-weight: 700; color: #fff; }
    .fstat--give { border-left: 2px solid var(--danger); }
    .fstat--receive { border-left: 2px solid var(--success); }
    .fstat--debt { border-left: 2px solid var(--warning); }

    /* ===== Family Grid ===== */
    .family-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 0.65rem;
    }
    .family-card {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: var(--surface);
      border: 1.5px solid rgba(255,255,255,0.06);
      border-radius: 1rem;
      padding: 0.75rem 0.85rem;
      cursor: pointer;
      color: #fff;
      font-family: inherit;
      text-align: left;
      animation: chipIn 0.4s ease-out both;
      transition: all 0.25s ease;
    }
    .family-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      border-color: rgba(255,255,255,0.12);
    }
    .family-card--selected {
      border-color: var(--accent) !important;
      background: rgba(108, 92, 231, 0.06);
      animation: pulse 2s ease-in-out infinite;
    }
    .family-card__avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1rem;
      flex-shrink: 0;
    }
    .family-card__avatar--sm {
      width: 28px;
      height: 28px;
      font-size: 0.75rem;
    }
    .family-card__info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .family-card__name { font-size: 0.85rem; font-weight: 600; color: #fff; }
    .family-card__relation { font-size: 0.72rem; color: rgba(255,255,255,0.4); }
    .family-card__perms { display: flex; gap: 0.2rem; flex-shrink: 0; }
    .perm-dot { font-size: 0.7rem; }

    /* ===== Family Action Panel extensions ===== */
    .action-panel__member-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .action-panel__header-actions {
      display: flex;
      gap: 0.35rem;
    }
    .action-panel__close--del {
      font-size: 0.7rem;
    }
    .action-panel__close--del:hover {
      background: rgba(255,107,107,0.15);
      color: var(--danger);
    }
    .action-tab--debt.action-tab--active {
      background: rgba(255, 169, 77, 0.12);
      color: var(--warning);
    }
    .action-btn--debt {
      background: linear-gradient(135deg, rgba(255,169,77,0.2), rgba(255,169,77,0.1));
      color: var(--warning);
    }
    .action-btn--debt:not(:disabled):hover {
      background: linear-gradient(135deg, rgba(255,169,77,0.3), rgba(255,169,77,0.15));
      transform: translateY(-1px);
    }
    .family-action-hint {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.35);
      padding: 0.3rem 0.5rem;
      background: rgba(255,255,255,0.02);
      border-radius: 0.5rem;
      line-height: 1.4;
    }

    /* ===== Wallet Select ===== */
    .wallet-select {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .wallet-select__label {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
    }
    .wallet-select__chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }
    .mini-wallet {
      padding: 0.35rem 0.65rem;
      border-radius: 0.6rem;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(255,255,255,0.03);
      color: rgba(255,255,255,0.6);
      font-size: 0.75rem;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .mini-wallet:hover {
      border-color: rgba(255,255,255,0.15);
      color: #fff;
    }
    .mini-wallet--selected {
      border-color: var(--accent);
      background: rgba(108, 92, 231, 0.1);
      color: #fff;
    }

    /* ===== Member History ===== */
    .member-history {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      padding-top: 0.75rem;
    }
    .member-history__title {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .history-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0;
    }
    .history-row__type { font-size: 0.8rem; }
    .history-row__amount {
      font-size: 0.82rem;
      font-weight: 600;
    }
    .history-row__amount--positive { color: var(--success); }
    .history-row__amount--negative { color: var(--danger); }
    .history-row__note {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.35);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .settle-btn {
      padding: 0.2rem 0.5rem;
      border-radius: 0.4rem;
      border: 1px solid rgba(0, 214, 143, 0.2);
      background: rgba(0, 214, 143, 0.08);
      color: var(--success);
      font-size: 0.68rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    .settle-btn:hover {
      background: rgba(0, 214, 143, 0.15);
    }

    /* ===== Empty State ===== */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      color: rgba(255,255,255,0.25);
    }
    .empty-state__icon { font-size: 2rem; opacity: 0.5; }
    .empty-state__text { font-size: 0.82rem; text-align: center; }

    /* ===== Responsive ===== */
    @media (max-width: 480px) {
      .stats-row { grid-template-columns: 1fr; }
      .wallets-grid { grid-template-columns: 1fr; }
      .family-grid { grid-template-columns: 1fr; }
      .family-stats { flex-direction: column; }
      .form-row { flex-direction: column; }
    }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly rootRef = viewChild<ElementRef<HTMLElement>>('dashRoot');
  private readonly zone = inject(NgZone);

  private introAnim?: ReturnType<typeof animate>;
  private heroTitleAnim?: ReturnType<typeof animate>;
  private heroSubtitleAnim?: ReturnType<typeof animate>;
  private sectionRevealObserver?: IntersectionObserver;
  private sectionRevealAnims: Array<ReturnType<typeof animate>> = [];
  private splitRevertFns: Array<() => void> = [];

  readonly selectedAccount = signal<Account | null>(null);
  readonly actionMode = signal<'income' | 'expense'>('income');
  readonly amount = signal<number | null>(null);
  readonly description = signal('');
  readonly category = signal<TransactionCategory>('Other');
  readonly feedback = signal('');
  readonly feedbackType = signal<'success' | 'error'>('success');

  // Family signals
  readonly showAddFamily = signal(false);
  readonly newFamilyName = signal('');
  readonly newFamilyRelation = signal('');
  readonly newPermGive = signal(true);
  readonly newPermReceive = signal(true);
  readonly newPermDebt = signal(true);
  readonly selectedFamily = signal<FamilyMember | null>(null);
  readonly familyAction = signal<'give' | 'receive' | 'debt'>('receive');
  readonly familyAmount = signal<number | null>(null);
  readonly familyNote = signal('');
  readonly familyTargetAccount = signal<Account | null>(null);
  readonly familyFeedback = signal('');
  readonly familyFeedbackType = signal<'success' | 'error'>('success');

  // Split & Gather fields
  readonly showSplitGather = signal(false);
  readonly splitAction = signal<'split' | 'gather'>('gather');
  readonly splitAmount = signal<number | null>(null);
  readonly splitNote = signal('');
  readonly splitTargetAccount = signal<Account | null>(null);
  readonly splitSelectedMembers = signal<Set<string>>(new Set());

  readonly categories: TransactionCategory[] = [
    'Food', 'Taxi', 'Salary', 'Utilities', 'Shopping', 'Transfer', 'Freelance', 'Rent', 'Other',
  ];

  /** Cashflow data grouped by category for the animated bar chart */
  readonly cashflowBars = computed<CashflowBar[]>(() => {
    const txs = this.transactionService.recentTransactions();
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of txs) {
      const entry = map.get(t.category) ?? { income: 0, expense: 0 };
      if (t.type === 'income') entry.income += t.amountUZS;
      else entry.expense += t.amountUZS;
      map.set(t.category, entry);
    }
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, income: v.income, expense: v.expense }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense))
      .slice(0, 6);
  });

  constructor(
    public readonly accountService: AccountService,
    public readonly transactionService: TransactionService,
    public readonly incomeService: IncomeService,
    public readonly debtService: DebtService,
    public readonly familyService: FamilyService,
    private readonly currencyService: CurrencyService,
  ) {}

  ngOnInit(): void {
    this.accountService.loadAccounts();
    this.incomeService.loadIncomes();
    this.debtService.loadDebts();
  }

  ngAfterViewInit(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.playIntroMotion());
    });
  }

  ngOnDestroy(): void {
    this.introAnim?.cancel();
    this.heroTitleAnim?.cancel();
    this.heroSubtitleAnim?.cancel();
    this.sectionRevealObserver?.disconnect();
    for (const anim of this.sectionRevealAnims) anim.cancel();
    this.sectionRevealAnims = [];
    this.clearSplitText();
  }

  private playIntroMotion(): void {
    const root = this.rootRef()?.nativeElement;
    if (!root) return;

    this.clearSplitText();
    this.playHeroSplitMotion(root);
    this.setupSectionReveal(root);

    const targets = root.querySelectorAll<HTMLElement>(
      '.stat-cards-row > app-anim-stat-card',
    );

    if (!targets.length) return;

    this.introAnim?.cancel();
    this.introAnim = animate(targets, {
      opacity: [0, 1],
      translateY: [18, 0],
      delay: stagger(75, { start: 220 }),
      ease: spring({ stiffness: 92, damping: 16 }),
      duration: 850,
    });
  }

  private playHeroSplitMotion(root: HTMLElement): void {
    const titleEl = root.querySelector<HTMLElement>('.hero__title');
    const subtitleEl = root.querySelector<HTMLElement>('.hero__subtitle');

    try {
      if (titleEl) {
        const titleSplit = splitText(titleEl, { words: true, chars: true }) as unknown as {
          words?: HTMLElement[];
          chars?: HTMLElement[];
          revert?: () => void;
        };
        if (titleSplit.revert) this.splitRevertFns.push(() => titleSplit.revert?.());

        const titleWords = titleSplit.words ?? [];
        if (titleWords.length) {
          this.heroTitleAnim?.cancel();
          this.heroTitleAnim = animate(titleWords, {
            opacity: [0, 1],
            translateY: [24, 0],
            rotateX: [22, 0],
            delay: stagger(55),
            duration: 900,
            ease: spring({ stiffness: 95, damping: 15 }),
          });
        }
      }

      if (subtitleEl) {
        const subtitleSplit = splitText(subtitleEl, { chars: true }) as unknown as {
          chars?: HTMLElement[];
          revert?: () => void;
        };
        if (subtitleSplit.revert) this.splitRevertFns.push(() => subtitleSplit.revert?.());

        const subtitleChars = subtitleSplit.chars ?? [];
        if (subtitleChars.length) {
          this.heroSubtitleAnim?.cancel();
          this.heroSubtitleAnim = animate(subtitleChars, {
            opacity: [0, 1],
            translateY: [10, 0],
            delay: stagger(18, { start: 120 }),
            duration: 650,
            ease: spring({ stiffness: 110, damping: 18 }),
          });
        }
      }
    } catch {
      // Fallback if splitText cannot initialize for any reason.
      const hero = root.querySelector<HTMLElement>('.hero');
      if (!hero) return;
      this.heroTitleAnim?.cancel();
      this.heroTitleAnim = animate(hero, {
        opacity: [0, 1],
        translateY: [18, 0],
        duration: 700,
        ease: spring({ stiffness: 100, damping: 16 }),
      });
    }
  }

  private clearSplitText(): void {
    for (const revert of this.splitRevertFns) revert();
    this.splitRevertFns = [];
  }

  private setupSectionReveal(root: HTMLElement): void {
    this.sectionRevealObserver?.disconnect();
    for (const anim of this.sectionRevealAnims) anim.cancel();
    this.sectionRevealAnims = [];

    const revealTargets = root.querySelectorAll<HTMLElement>('.cashflow-grid, .section');
    if (!revealTargets.length) return;

    this.sectionRevealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;

          const anim = animate(el, {
            opacity: [0, 1],
            translateY: [22, 0],
            duration: 720,
            ease: spring({ stiffness: 105, damping: 17 }),
          });
          this.sectionRevealAnims.push(anim);
          this.sectionRevealObserver?.unobserve(el);
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    );

    for (const el of revealTargets) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(22px)';
      this.sectionRevealObserver.observe(el);
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  getWalletIcon(type: string): string {
    const icons: Record<string, string> = {
      humo: '💳', uzcard: '💳', visa: '💎', mastercard: '🔶', cash: '💵', crypto: '₿',
    };
    return icons[type] || '💰';
  }

  selectAccount(acc: Account): void {
    if (this.selectedAccount()?.id === acc.id) {
      this.clearSelection();
    } else {
      this.selectedAccount.set(acc);
      this.resetForm();
    }
  }

  clearSelection(): void {
    this.selectedAccount.set(null);
    this.resetForm();
  }

  // Security Rate Limiter Simulator
  private submitAttempts = 0;
  private lastAttemptTime = 0;

  submitAction(): void {
    const now = Date.now();
    
    // Rate Limiting: max 5 requests per 10 seconds
    if (now - this.lastAttemptTime > 10000) {
      this.submitAttempts = 0;
    }
    
    if (this.submitAttempts >= 5) {
      this.showFeedback('Too many requests. Please wait a moment.', 'error');
      return;
    }

    this.submitAttempts++;
    this.lastAttemptTime = now;

    const acc = this.selectedAccount();
    const amt = this.amount();
    
    // Strict Input Validation
    if (!acc) return;
    if (amt === null || isNaN(amt) || amt <= 0) {
      this.showFeedback('Invalid amount. Must be greater than 0.', 'error');
      return;
    }
    
    // Max transaction limit (e.g. 500M UZS)
    if (amt > 500_000_000) {
      this.showFeedback('Amount exceeds transaction limit.', 'error');
      return;
    }

    // Sanitize Description to prevent XSS
    const sanitizedDesc = (this.description() || '')
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .trim();

    if (this.actionMode() === 'income') {
      this.incomeService.addIncome(
        sanitizedDesc || 'Income',
        amt,
        acc.type === 'cash' ? 'cash' : 'card',
        acc.id,
      );
      this.accountService.updateBalance(acc.id, amt);
      this.showFeedback(`+${this.currencyService.formatUZS(amt)} added to ${acc.name}`, 'success');
    } else {
      const success = this.transactionService.addTransaction(
        'expense',
        this.category(),
        amt,
        acc.id,
        sanitizedDesc || undefined,
      );
      if (success) {
        this.showFeedback(`−${this.currencyService.formatUZS(amt)} from ${acc.name}`, 'success');
      } else {
        this.showFeedback('Insufficient balance', 'error');
        return;
      }
    }
    this.resetForm();
  }

  private resetForm(): void {
    this.amount.set(null);
    this.description.set('');
    this.category.set('Other');
    this.feedback.set('');
  }

  private showFeedback(msg: string, type: 'success' | 'error'): void {
    this.feedback.set(msg);
    this.feedbackType.set(type);
    setTimeout(() => this.feedback.set(''), 3000);
  }

  // ===== Family Methods =====

  addFamilyMember(): void {
    const name = this.newFamilyName().trim();
    const relation = this.newFamilyRelation().trim();
    if (!name || !relation) return;

    const perms: FamilyPermission[] = [];
    if (this.newPermGive()) perms.push('give');
    if (this.newPermReceive()) perms.push('receive');
    if (this.newPermDebt()) perms.push('debt');

    this.familyService.addMember(name, relation, perms);
    this.newFamilyName.set('');
    this.newFamilyRelation.set('');
    this.newPermGive.set(true);
    this.newPermReceive.set(true);
    this.newPermDebt.set(true);
    this.showAddFamily.set(false);
  }

  removeFamilyMember(id: string): void {
    this.familyService.removeMember(id);
    this.clearFamilySelection();
  }

  selectFamily(member: FamilyMember): void {
    if (this.selectedFamily()?.id === member.id) {
      this.clearFamilySelection();
    } else {
      this.selectedFamily.set(member);
      // Auto-select first allowed action
      if (member.permissions.includes('receive')) {
        this.familyAction.set('receive');
      } else if (member.permissions.includes('give')) {
        this.familyAction.set('give');
      } else if (member.permissions.includes('debt')) {
        this.familyAction.set('debt');
      }
      this.resetFamilyForm();
    }
  }

  clearFamilySelection(): void {
    this.selectedFamily.set(null);
    this.resetFamilyForm();
  }

  submitFamilyAction(): void {
    const member = this.selectedFamily();
    const amt = this.familyAmount();
    const acc = this.familyTargetAccount();
    if (!member || !amt || amt <= 0 || !acc) return;

    let success = false;
    const action = this.familyAction();

    if (action === 'receive') {
      success = this.familyService.receiveMoney(member.id, amt, acc.id, this.familyNote() || undefined);
      if (success) {
        this.showFamilyFeedback(`💰 +${this.currencyService.formatUZS(amt)} from ${member.name} → ${acc.name}`, 'success');
      } else {
        this.showFamilyFeedback(`${member.name} doesn't have "receive" permission`, 'error');
      }
    } else if (action === 'give') {
      success = this.familyService.giveMoney(member.id, amt, acc.id, this.familyNote() || undefined);
      if (success) {
        this.showFamilyFeedback(`💸 −${this.currencyService.formatUZS(amt)} to ${member.name} from ${acc.name}`, 'success');
      } else {
        this.showFamilyFeedback('Insufficient balance or no permission', 'error');
      }
    } else if (action === 'debt') {
      success = this.familyService.recordDebt(member.id, amt, acc.id, this.familyNote() || undefined);
      if (success) {
        this.showFamilyFeedback(`📋 Borrowed ${this.currencyService.formatUZS(amt)} from ${member.name}`, 'success');
      } else {
        this.showFamilyFeedback(`${member.name} doesn't have "debt" permission`, 'error');
      }
    }

    if (success) {
      this.resetFamilyForm();
    }
  }

  settleDebt(txId: string): void {
    this.familyService.settleDebt(txId);
    this.showFamilyFeedback('Debt settled ✓', 'success');
  }

  getMemberTransactions(memberId: string) {
    return this.familyService.getTransactionsForMember(memberId);
  }

  private resetFamilyForm(): void {
    this.familyAmount.set(null);
    this.familyNote.set('');
    this.familyTargetAccount.set(null);
    this.familyFeedback.set('');
  }

  // --- Split & Gather Logic ---
  toggleSplitMember(id: string): void {
    const current = new Set(this.splitSelectedMembers());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.splitSelectedMembers.set(current);
  }

  submitSplitGather(): void {
    const members = Array.from(this.splitSelectedMembers());
    const amount = this.splitAmount();
    const acc = this.splitTargetAccount();
    if (!amount || amount <= 0 || members.length === 0 || !acc) {
      this.showFamilyFeedback('Please fill all fields and select valid members.', 'error');
      return;
    }

    const perPerson = Math.round(amount / members.length);
    const mode = this.splitAction();
    const sanitizedDesc = (this.splitNote() || '').replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
    let successCount = 0;

    for (const mId of members) {
      const note = `${mode === 'gather' ? 'Gather' : 'Split'}: ${sanitizedDesc}`;
      if (mode === 'gather') {
        const ok = this.familyService.receiveMoney(mId, perPerson, acc.id, note);
        if (ok) successCount++;
      } else {
        const ok = this.familyService.giveMoney(mId, perPerson, acc.id, note);
        if (ok) successCount++;
      }
    }

    if (successCount > 0) {
      this.showFamilyFeedback(
        `Successfully ${mode === 'gather' ? 'gathered' : 'split'} ${this.currencyService.formatUZS(amount)} among ${successCount} members`,
        'success'
      );
      this.showSplitGather.set(false);
      this.splitAmount.set(null);
      this.splitNote.set('');
      this.splitSelectedMembers.set(new Set());
    } else {
      this.showFamilyFeedback('Action failed. Check member permissions.', 'error');
    }
  }

  private showFamilyFeedback(msg: string, type: 'success' | 'error'): void {
    this.familyFeedback.set(msg);
    this.familyFeedbackType.set(type);
    setTimeout(() => this.familyFeedback.set(''), 3000);
  }
}
