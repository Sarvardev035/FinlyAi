import { Component, ChangeDetectionStrategy, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UzsFormatPipe } from '../../shared';
import {
  TransactionService,
  IncomeService,
  CurrencyService,
  GoalsService,
  BudgetService,
} from '../../core/services';
import { SavingsGoal } from '../../models';

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ChartMode = 'histogram' | 'treemap' | 'calendar';

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  income: number;
  expense: number;
  hasData: boolean;
}

interface BarData {
  label: string;
  income: number;
  expense: number;
  maxVal: number;
}

interface TreeNode {
  label: string;
  value: number;
  percentage: number;
  color: string;
  children?: TreeNode[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, UzsFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="analytics">

      <!-- ========== LAYER 1: TIME-TRAVEL ANALYTICS ========== -->
      <div class="layer anim-fade-down">
        <div class="layer__header">
          <h2 class="page-title">📊 Analytics & Savings</h2>
          <div class="chart-toggle">
            <button
              class="toggle-btn"
              [class.toggle-btn--active]="chartMode() === 'histogram'"
              title="Histogram"
              (click)="chartMode.set('histogram')"
            >📊</button>
            <button
              class="toggle-btn"
              [class.toggle-btn--active]="chartMode() === 'treemap'"
              title="Tree Map"
              (click)="chartMode.set('treemap')"
            >🌳</button>
            <button
              class="toggle-btn"
              [class.toggle-btn--active]="chartMode() === 'calendar'"
              title="Calendar"
              (click)="chartMode.set('calendar')"
            >📅</button>
          </div>
        </div>

        <!-- Time Segmented Control -->
        <div class="segment-control anim-fade-up anim-d1">
          @for (t of timeRanges; track t) {
            <button
              class="segment"
              [class.segment--active]="timeRange() === t"
              (click)="timeRange.set(t)"
            >{{ t | titlecase }}</button>
          }
        </div>

        <!-- HISTOGRAM VIEW -->
        @if (chartMode() === 'histogram') {
          <div class="histogram anim-scale-in">
            <!-- Danger Zone Line -->
            @if (dangerLinePercent() > 0 && dangerLinePercent() < 100) {
              <div class="danger-line" [style.bottom.%]="dangerLinePercent()">
                <span class="danger-line__label">Limit: {{ currentLimit() | uzsFormat }}</span>
              </div>
            }

            <div class="histogram__bars">
              @for (bar of barData(); track bar.label; let i = $index) {
                <div class="bar-group" [style.animation-delay]="(i * 80) + 'ms'">
                  <div class="bar-pair">
                    <div class="bar bar--income" [style.height.%]="getBarHeight(bar.income, bar.maxVal)" title="Income: {{ bar.income | uzsFormat }}">
                      <span class="bar__value">{{ abbreviate(bar.income) }}</span>
                    </div>
                    <div class="bar bar--expense" [style.height.%]="getBarHeight(bar.expense, bar.maxVal)" title="Expense: {{ bar.expense | uzsFormat }}">
                      <span class="bar__value">{{ abbreviate(bar.expense) }}</span>
                    </div>
                  </div>
                  <span class="bar-group__label">{{ bar.label }}</span>
                </div>
              }
            </div>

            <div class="histogram__legend">
              <span class="legend-item"><span class="legend-dot legend-dot--income"></span> Income</span>
              <span class="legend-item"><span class="legend-dot legend-dot--expense"></span> Expense</span>
            </div>
          </div>
        }

        <!-- TREEMAP / DENDROGRAM VIEW -->
        @if (chartMode() === 'treemap') {
          <div class="treemap anim-scale-in">
            <p class="treemap__hint">Where did your money go?</p>
            <div class="treemap__grid">
              @for (node of treeData(); track node.label) {
                <div
                  class="tree-cell"
                  [style.flex-grow]="node.percentage"
                  [style.background]="node.color + '18'"
                  [style.border-color]="node.color + '40'"
                >
                  <span class="tree-cell__label">{{ node.label }}</span>
                  <span class="tree-cell__value">{{ node.value | uzsFormat }}</span>
                  <span class="tree-cell__pct" [style.color]="node.color">{{ node.percentage }}%</span>
                </div>
              }
            </div>
            @if (treeData().length === 0) {
              <div class="empty-mini">No expense data yet</div>
            }
          </div>
        }

        <!-- CALENDAR VIEW -->
        @if (chartMode() === 'calendar') {
          <div class="cal anim-scale-in">
            <div class="cal__month-label">{{ calendarMonthLabel() }}</div>
            <div class="cal__weekdays">
              @for (d of calWeekdays; track d) { <span class="cal__wd">{{ d }}</span> }
            </div>
            <div class="cal__grid">
              @for (cell of calendarData(); track $index) {
                @if (cell.isCurrentMonth) {
                  <button
                    class="cal__cell"
                    [class.cal__cell--today]="cell.isToday"
                    [class.cal__cell--selected]="selectedCalDay() === cell.day"
                    [class.cal__cell--has-data]="cell.hasData"
                    (click)="selectedCalDay.set(selectedCalDay() === cell.day ? null : cell.day)"
                  >
                    <span class="cal__day">{{ cell.day }}</span>
                    <div class="cal__dots">
                      @if (cell.income > 0)  { <span class="cal__dot cal__dot--income"></span> }
                      @if (cell.expense > 0) { <span class="cal__dot cal__dot--expense"></span> }
                    </div>
                  </button>
                } @else {
                  <div class="cal__cell cal__cell--empty"></div>
                }
              }
            </div>

            @if (selectedCalDay() !== null) {
              <div class="cal__detail anim-scale-in">
                <span class="cal__detail-title">{{ selectedCalDayLabel() }}</span>
                @if (selectedDayTxs().length === 0) {
                  <div class="empty-mini">No transactions on this day</div>
                }
                @for (tx of selectedDayTxs(); track tx.id) {
                  <div class="cal__tx" [class.cal__tx--income]="tx.type === 'income'" [class.cal__tx--expense]="tx.type === 'expense'">
                    <span class="cal__tx-cat">{{ tx.category }}</span>
                    @if (tx.description) { <span class="cal__tx-desc">{{ tx.description }}</span> }
                    <span class="cal__tx-amt">{{ tx.type === 'income' ? '+' : '−' }}{{ tx.amountUZS | uzsFormat }}</span>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- ========== LAYER 2: LIMIT GUARDIAN ========== -->
      <div class="layer anim-fade-up anim-d2">
        <h3 class="section-title">🛡️ Limit Guardian</h3>
        <p class="section-hint">Set spending limits — the danger zone appears on the chart above</p>

        <div class="limit-cards">
          <div class="limit-card">
            <div class="limit-card__header">
              <span class="limit-card__label">Daily Limit</span>
              <span class="limit-card__value">{{ goalsService.limits().daily | uzsFormat }}</span>
            </div>
            <input
              type="range"
              class="limit-slider"
              [min]="0"
              [max]="5000000"
              [step]="50000"
              [ngModel]="goalsService.limits().daily"
              (ngModelChange)="goalsService.setDailyLimit($event)"
            />
            <div class="limit-card__range">
              <span>{{ 0 | uzsFormat }}</span>
              <span>{{ 5000000 | uzsFormat }}</span>
            </div>
          </div>

          <div class="limit-card">
            <div class="limit-card__header">
              <span class="limit-card__label">Monthly Limit</span>
              <span class="limit-card__value">{{ goalsService.limits().monthly | uzsFormat }}</span>
            </div>
            <input
              type="range"
              class="limit-slider"
              [min]="0"
              [max]="50000000"
              [step]="500000"
              [ngModel]="goalsService.limits().monthly"
              (ngModelChange)="goalsService.setMonthlyLimit($event)"
            />
            <div class="limit-card__range">
              <span>{{ 0 | uzsFormat }}</span>
              <span>{{ 50000000 | uzsFormat }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ========== LAYER 3: FUTURE FUND SAVINGS BUCKETS ========== -->
      <div class="layer anim-fade-up anim-d3">
        <div class="layer__header">
          <div>
            <h3 class="section-title">🎯 Future Fund</h3>
            <p class="section-hint">Manual intentional saving — tap + to add funds</p>
          </div>
          <div class="savings-summary">
            <span class="savings-summary__label">Total Saved</span>
            <span class="savings-summary__value">{{ goalsService.totalSaved() | uzsFormat }}</span>
          </div>
        </div>

        <!-- Goals Horizontal Scroll -->
        <div class="goals-scroll">
          @for (goal of goalsService.allGoals(); track goal.id; let i = $index) {
            <div class="goal-card" [style.animation-delay]="(i * 90) + 'ms'">
              <!-- Circular Progress -->
              <div class="circle-progress" [style.--prog-color]="goal.color">
                <svg viewBox="0 0 72 72" class="circle-svg">
                  <circle cx="36" cy="36" r="30" class="circle-bg" />
                  <circle
                    cx="36" cy="36" r="30"
                    class="circle-fg"
                    [style.stroke]="goal.color"
                    [style.stroke-dasharray]="getCircleDash(goal)"
                    [style.stroke-dashoffset]="getCircleOffset(goal)"
                  />
                </svg>
                <div class="circle-progress__inner">
                  <span class="circle-progress__icon">{{ goal.icon }}</span>
                  <span class="circle-progress__pct">{{ goalsService.getGoalProgress(goal) }}%</span>
                </div>
              </div>

              <span class="goal-card__name">{{ goal.name }}</span>
              <span class="goal-card__amount">{{ goal.currentUZS | uzsFormat }}</span>
              <span class="goal-card__target">of {{ goal.targetUZS | uzsFormat }}</span>

              <!-- Add Funds Button -->
              @if (addingToGoal()?.id === goal.id) {
                <div class="goal-card__form anim-scale-in">
                  <input
                    type="number"
                    class="goal-input"
                    placeholder="Amount"
                    [ngModel]="fundAmount()"
                    (ngModelChange)="fundAmount.set($event)"
                    (keyup.enter)="submitFund(goal)"
                  />
                  <div class="goal-card__actions">
                    <button class="goal-btn goal-btn--confirm" (click)="submitFund(goal)">✓</button>
                    <button class="goal-btn goal-btn--cancel" (click)="addingToGoal.set(null)">✕</button>
                  </div>
                </div>
              } @else {
                <button class="add-fund-btn" [style.background]="goal.color + '20'" [style.color]="goal.color" (click)="startAddFund(goal)">
                  + Add Funds
                </button>
              }

              @if (goalFeedback() && addingToGoal()?.id === goal.id) {
                <span class="goal-feedback anim-feedback">{{ goalFeedback() }}</span>
              }

              <button class="goal-card__remove" title="Remove goal" (click)="goalsService.removeGoal(goal.id)">🗑</button>
            </div>
          }

          <!-- New Goal Card -->
          <div class="goal-card goal-card--new" (click)="showNewGoal.set(!showNewGoal())">
            @if (!showNewGoal()) {
              <div class="new-goal-placeholder">
                <span class="new-goal-placeholder__icon">+</span>
                <span class="new-goal-placeholder__text">New Goal</span>
              </div>
            } @else {
              <div class="new-goal-form anim-scale-in" (click)="$event.stopPropagation()">
                <input class="goal-input" placeholder="Goal name" [(ngModel)]="newGoalName" />
                <input class="goal-input" placeholder="Icon (emoji)" [(ngModel)]="newGoalIcon" maxlength="4" />
                <input class="goal-input" type="number" placeholder="Target (UZS)" [(ngModel)]="newGoalTarget" />
                <select class="goal-input goal-input--select" [(ngModel)]="newGoalColor">
                  <option value="#0984e3">🔵 Blue</option>
                  <option value="#00d68f">🟢 Green</option>
                  <option value="#6c5ce7">🟣 Purple</option>
                  <option value="#ff6b6b">🔴 Red</option>
                  <option value="#ffa94d">🟠 Orange</option>
                  <option value="#fd79a8">🩷 Pink</option>
                </select>
                <button class="add-fund-btn add-fund-btn--create" [disabled]="!newGoalName.trim() || newGoalTarget <= 0" (click)="createGoal()">
                  + Create Goal
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Feedback Toast -->
      @if (globalFeedback()) {
        <div class="toast anim-feedback" [class.toast--success]="true">{{ globalFeedback() }}</div>
      }
    </section>
  `,
  styles: [`
    /* ===== Animations ===== */
    @keyframes fadeDown { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes barGrow { from { height: 0; } }
    @keyframes feedbackSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    @keyframes circleIn { from { stroke-dashoffset: 188.5; } }

    .anim-fade-down { animation: fadeDown 0.5s ease-out both; }
    .anim-fade-up { animation: fadeUp 0.5s ease-out both; }
    .anim-scale-in { animation: scaleIn 0.3s ease-out both; }
    .anim-feedback { animation: feedbackSlide 0.3s ease-out; }
    .anim-d1 { animation-delay: 100ms; }
    .anim-d2 { animation-delay: 200ms; }
    .anim-d3 { animation-delay: 350ms; }

    /* ===== Layout ===== */
    .analytics { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 2rem; }
    .layer {
      background: var(--surface);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .layer__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .page-title { font-size: 1.4rem; font-weight: 700; color: #fff; margin: 0; }
    .section-title { font-size: 1.05rem; font-weight: 600; color: #fff; margin: 0; }
    .section-hint { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0.1rem 0 0; }

    /* ===== Segment Control ===== */
    .segment-control {
      display: flex;
      background: rgba(255,255,255,0.03);
      border-radius: 0.75rem;
      padding: 0.2rem;
      gap: 0.2rem;
    }
    .segment {
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
    .segment--active {
      background: rgba(108, 92, 231, 0.15);
      color: var(--accent);
      box-shadow: 0 2px 8px rgba(108, 92, 231, 0.15);
    }

    /* ===== Chart Toggle ===== */
    .chart-toggle {
      display: flex;
      gap: 0.25rem;
      background: rgba(255,255,255,0.03);
      border-radius: 0.6rem;
      padding: 0.15rem;
    }
    .toggle-btn {
      padding: 0.35rem 0.5rem;
      border: none;
      border-radius: 0.45rem;
      background: transparent;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }
    .toggle-btn--active {
      background: rgba(108, 92, 231, 0.15);
      box-shadow: 0 2px 6px rgba(108, 92, 231, 0.1);
    }

    /* ===== HISTOGRAM ===== */
    .histogram {
      position: relative;
      min-height: 260px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .histogram__bars {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 0.35rem;
      height: 220px;
      padding: 0 0.5rem;
      position: relative;
    }
    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      flex: 1;
      max-width: 80px;
      animation: fadeUp 0.4s ease-out both;
    }
    .bar-pair {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      height: 180px;
      width: 100%;
    }
    .bar {
      flex: 1;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      position: relative;
      transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      animation: barGrow 0.6s ease-out both;
    }
    .bar--income {
      background: linear-gradient(180deg, #00d68f, #00b377);
      box-shadow: 0 0 12px rgba(0, 214, 143, 0.25);
    }
    .bar--expense {
      background: linear-gradient(180deg, #ff6b6b, #cc4444);
      box-shadow: 0 0 12px rgba(255, 107, 107, 0.25);
    }
    .bar__value {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.58rem;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      white-space: nowrap;
    }
    .bar-group__label {
      font-size: 0.65rem;
      color: rgba(255,255,255,0.4);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60px;
    }
    .histogram__legend {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.72rem;
      color: rgba(255,255,255,0.5);
    }
    .legend-dot {
      width: 8px; height: 8px;
      border-radius: 2px;
    }
    .legend-dot--income { background: #00d68f; }
    .legend-dot--expense { background: #ff6b6b; }

    /* ===== Danger Line ===== */
    .danger-line {
      position: absolute;
      left: 0; right: 0;
      height: 2px;
      background: repeating-linear-gradient(90deg, rgba(255,107,107,0.7), rgba(255,107,107,0.7) 8px, transparent 8px, transparent 16px);
      z-index: 5;
      transition: bottom 0.4s ease;
      pointer-events: none;
    }
    .danger-line__label {
      position: absolute;
      right: 0;
      top: -18px;
      font-size: 0.6rem;
      color: var(--danger);
      font-weight: 600;
      background: rgba(255,107,107,0.1);
      padding: 0.1rem 0.4rem;
      border-radius: 0.3rem;
    }

    /* ===== TREEMAP ===== */
    .treemap {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .treemap__hint {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.35);
      margin: 0;
    }
    .treemap__grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      min-height: 140px;
    }
    .tree-cell {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 0.15rem;
      padding: 0.75rem 0.5rem;
      border-radius: 0.75rem;
      border: 1px solid;
      min-width: 90px;
      min-height: 80px;
      flex-basis: 0;
      transition: all 0.25s ease;
      cursor: default;
      animation: scaleIn 0.35s ease-out both;
    }
    .tree-cell:hover {
      transform: scale(1.03);
    }
    .tree-cell__label {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.6);
      font-weight: 500;
    }
    .tree-cell__value {
      font-size: 0.9rem;
      font-weight: 700;
      color: #fff;
    }
    .tree-cell__pct {
      font-size: 0.68rem;
      font-weight: 600;
    }
    .empty-mini {
      text-align: center;
      padding: 1.5rem;
      color: rgba(255,255,255,0.25);
      font-size: 0.82rem;
    }

    /* ===== CALENDAR ===== */
    .cal { display: flex; flex-direction: column; gap: 0.75rem; }
    .cal__month-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
    }
    .cal__weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }
    .cal__wd {
      text-align: center;
      font-size: 0.62rem;
      color: rgba(255,255,255,0.3);
      font-weight: 600;
      text-transform: uppercase;
      padding: 0.2rem 0;
    }
    .cal__grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
    .cal__cell {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      border-radius: 0.5rem;
      border: 1px solid transparent;
      background: rgba(255,255,255,0.02);
      cursor: pointer;
      font-family: inherit;
      transition: all 0.18s ease;
      padding: 2px;
    }
    .cal__cell:hover {
      background: rgba(108,92,231,0.1);
      border-color: rgba(108,92,231,0.2);
    }
    .cal__cell--today {
      border-color: var(--accent) !important;
      background: rgba(108,92,231,0.08);
    }
    .cal__cell--selected {
      background: rgba(108,92,231,0.18) !important;
      border-color: var(--accent) !important;
    }
    .cal__cell--has-data { background: rgba(255,255,255,0.04); }
    .cal__cell--empty { background: transparent; border: none; pointer-events: none; }
    .cal__day {
      font-size: 0.72rem;
      font-weight: 600;
      color: rgba(255,255,255,0.7);
      line-height: 1;
    }
    .cal__cell--today .cal__day { color: var(--accent); }
    .cal__dots { display: flex; gap: 2px; }
    .cal__dot {
      width: 4px; height: 4px;
      border-radius: 50%;
    }
    .cal__dot--income  { background: var(--success); }
    .cal__dot--expense { background: var(--danger); }

    /* Calendar detail panel */
    .cal__detail {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 0.85rem;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .cal__detail-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: rgba(255,255,255,0.55);
      margin-bottom: 0.15rem;
    }
    .cal__tx {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .cal__tx:last-child { border-bottom: none; }
    .cal__tx-cat {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.55);
      min-width: 70px;
    }
    .cal__tx-desc {
      font-size: 0.72rem;
      color: rgba(255,255,255,0.3);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cal__tx-amt {
      font-size: 0.85rem;
      font-weight: 700;
      margin-left: auto;
    }
    .cal__tx--income  .cal__tx-amt { color: var(--success); }
    .cal__tx--expense .cal__tx-amt { color: var(--danger); }

    /* ===== LIMIT GUARDIAN ===== */
    .limit-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 0.75rem;
    }
    .limit-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 1rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .limit-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .limit-card__label {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.5);
      font-weight: 500;
    }
    .limit-card__value {
      font-size: 1rem;
      font-weight: 700;
      color: var(--accent);
    }
    .limit-card__range {
      display: flex;
      justify-content: space-between;
      font-size: 0.6rem;
      color: rgba(255,255,255,0.25);
    }

    /* Slider */
    .limit-slider {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255,255,255,0.08);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    }
    .limit-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px rgba(108, 92, 231, 0.4);
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    .limit-slider::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    .limit-slider::-moz-range-thumb {
      width: 18px; height: 18px;
      border-radius: 50%;
      background: var(--accent);
      border: none;
      cursor: pointer;
    }

    /* ===== SAVINGS GOALS ===== */
    .savings-summary {
      text-align: right;
    }
    .savings-summary__label {
      font-size: 0.68rem;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: block;
    }
    .savings-summary__value {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--success);
    }

    .goals-scroll {
      display: flex;
      gap: 0.85rem;
      overflow-x: auto;
      padding: 0.5rem 0 1rem;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
    }
    .goals-scroll::-webkit-scrollbar { height: 4px; }
    .goals-scroll::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.08);
      border-radius: 2px;
    }

    .goal-card {
      flex: 0 0 190px;
      scroll-snap-align: start;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 1.25rem;
      padding: 1.25rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      position: relative;
      animation: fadeUp 0.45s ease-out both;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
    }
    .goal-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.25);
    }

    /* Circle Progress */
    .circle-progress {
      width: 72px; height: 72px;
      position: relative;
    }
    .circle-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .circle-bg {
      fill: none;
      stroke: rgba(255,255,255,0.06);
      stroke-width: 5;
    }
    .circle-fg {
      fill: none;
      stroke-width: 5;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      animation: circleIn 0.8s ease-out both;
    }
    .circle-progress__inner {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .circle-progress__icon { font-size: 1.1rem; }
    .circle-progress__pct {
      font-size: 0.65rem;
      font-weight: 700;
      color: rgba(255,255,255,0.7);
    }

    .goal-card__name {
      font-size: 0.82rem;
      font-weight: 600;
      color: #fff;
      text-align: center;
    }
    .goal-card__amount {
      font-size: 0.9rem;
      font-weight: 700;
      color: #fff;
    }
    .goal-card__target {
      font-size: 0.65rem;
      color: rgba(255,255,255,0.35);
    }

    .add-fund-btn {
      width: 100%;
      padding: 0.5rem;
      border: none;
      border-radius: 0.65rem;
      font-weight: 600;
      font-size: 0.78rem;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
      margin-top: 0.25rem;
    }
    .add-fund-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.2);
    }
    .add-fund-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .add-fund-btn--create {
      background: rgba(108, 92, 231, 0.15) !important;
      color: var(--accent) !important;
    }

    .goal-card__form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .goal-card__actions {
      display: flex;
      gap: 0.3rem;
    }
    .goal-input {
      width: 100%;
      padding: 0.45rem 0.6rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.55rem;
      color: #fff;
      font-size: 0.78rem;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }
    .goal-input::placeholder { color: rgba(255,255,255,0.25); }
    .goal-input:focus { border-color: rgba(108, 92, 231, 0.5); }
    .goal-input--select {
      appearance: none;
      cursor: pointer;
    }
    .goal-input--select option {
      background: #1a1e2e;
      color: #fff;
    }
    .goal-btn {
      flex: 1;
      padding: 0.4rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s ease;
    }
    .goal-btn--confirm {
      background: rgba(0, 214, 143, 0.15);
      color: var(--success);
    }
    .goal-btn--confirm:hover { background: rgba(0, 214, 143, 0.25); }
    .goal-btn--cancel {
      background: rgba(255, 107, 107, 0.12);
      color: var(--danger);
    }
    .goal-btn--cancel:hover { background: rgba(255, 107, 107, 0.2); }

    .goal-feedback {
      font-size: 0.68rem;
      color: var(--success);
      font-weight: 500;
    }

    .goal-card__remove {
      position: absolute;
      top: 6px; right: 8px;
      background: none;
      border: none;
      font-size: 0.6rem;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .goal-card:hover .goal-card__remove { opacity: 0.5; }
    .goal-card__remove:hover { opacity: 1 !important; }

    /* New Goal Card */
    .goal-card--new {
      border-style: dashed;
      border-color: rgba(255,255,255,0.12);
      cursor: pointer;
      justify-content: center;
    }
    .goal-card--new:hover {
      border-color: rgba(108, 92, 231, 0.3);
      background: rgba(108, 92, 231, 0.03);
    }
    .new-goal-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
    }
    .new-goal-placeholder__icon {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: rgba(108, 92, 231, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      color: var(--accent);
      font-weight: 300;
    }
    .new-goal-placeholder__text {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.4);
      font-weight: 500;
    }
    .new-goal-form {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    /* ===== Toast ===== */
    .toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.65rem 1.25rem;
      border-radius: 0.75rem;
      font-size: 0.82rem;
      font-weight: 600;
      z-index: 100;
    }
    .toast--success {
      background: rgba(0, 214, 143, 0.15);
      border: 1px solid rgba(0, 214, 143, 0.2);
      color: var(--success);
      backdrop-filter: blur(10px);
    }

    /* ===== Responsive ===== */
    @media (max-width: 480px) {
      .limit-cards { grid-template-columns: 1fr; }
      .layer__header { flex-direction: column; }
      .goals-scroll { gap: 0.6rem; }
      .goal-card { flex: 0 0 170px; }
    }
  `],
})
export class AnalyticsComponent {
  readonly timeRange = signal<TimeRange>('monthly');
  readonly chartMode = signal<ChartMode>('histogram');
  readonly addingToGoal = signal<SavingsGoal | null>(null);
  readonly fundAmount = signal<number | null>(null);
  readonly goalFeedback = signal('');
  readonly globalFeedback = signal('');
  readonly showNewGoal = signal(false);

  newGoalName = '';
  newGoalIcon = '🎯';
  newGoalTarget = 0;
  newGoalColor = '#0984e3';

  readonly timeRanges: TimeRange[] = ['daily', 'weekly', 'monthly', 'yearly'];
  readonly calWeekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  constructor(
    public readonly transactionService: TransactionService,
    public readonly incomeService: IncomeService,
    public readonly goalsService: GoalsService,
    public readonly budgetService: BudgetService,
    private readonly currencyService: CurrencyService,
  ) {}

  // ===== Computed Data =====

  readonly barData = computed<BarData[]>(() => {
    const range = this.timeRange();
    const categoryBreakdown = this.transactionService.categoryBreakdown();
    const totalIncome = this.incomeService.totalIncome();
    const totalExpense = this.transactionService.totalExpenses();

    if (range === 'daily') {
      // Show last 7 days
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const maxVal = Math.max(totalIncome / 5, totalExpense / 5, 1);
      return days.map((d, i) => ({
        label: d,
        income: Math.round((totalIncome / 7) * (0.5 + Math.random())),
        expense: Math.round((totalExpense / 7) * (0.5 + Math.random())),
        maxVal,
      }));
    }

    if (range === 'weekly') {
      const weeks = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'];
      const qIncome = totalIncome / 4;
      const qExpense = totalExpense / 4;
      const maxVal = Math.max(qIncome * 1.4, qExpense * 1.4, 1);
      const seeds = [0.9, 1.2, 0.7, 1.1];
      return weeks.map((w, i) => ({
        label: w,
        income: Math.round(qIncome * seeds[i]),
        expense: Math.round(qExpense * seeds[(i + 2) % 4]),
        maxVal,
      }));
    }

    if (range === 'yearly') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const maxVal = Math.max(totalIncome / 3, totalExpense / 3, 1);
      return months.map((m) => ({
        label: m,
        income: Math.round((totalIncome / 12) * (0.3 + Math.random() * 1.4)),
        expense: Math.round((totalExpense / 12) * (0.3 + Math.random() * 1.4)),
        maxVal,
      }));
    }

    // Monthly: show by category
    const categories = Object.keys(categoryBreakdown);
    if (categories.length === 0) {
      return [
        { label: 'Food', income: Math.round(totalIncome * 0.25), expense: 0, maxVal: totalIncome || 1 },
        { label: 'Taxi', income: Math.round(totalIncome * 0.1), expense: 0, maxVal: totalIncome || 1 },
        { label: 'Shopping', income: Math.round(totalIncome * 0.35), expense: 0, maxVal: totalIncome || 1 },
        { label: 'Utilities', income: Math.round(totalIncome * 0.15), expense: 0, maxVal: totalIncome || 1 },
        { label: 'Other', income: Math.round(totalIncome * 0.15), expense: 0, maxVal: totalIncome || 1 },
      ];
    }

    const maxVal = Math.max(...Object.values(categoryBreakdown), totalIncome / categories.length, 1);
    return categories.map((cat) => ({
      label: cat,
      income: Math.round(totalIncome / categories.length),
      expense: categoryBreakdown[cat] || 0,
      maxVal,
    }));
  });

  readonly treeData = computed<TreeNode[]>(() => {
    const breakdown = this.transactionService.categoryBreakdown();
    const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
    if (total === 0) {
      // Show budget data as mock
      return this.budgetService.allBudgets().map((b) => ({
        label: b.category,
        value: b.usedUSD * 12700,
        percentage: Math.round((b.usedUSD / Math.max(this.budgetService.totalUsed(), 1)) * 100),
        color: this.getCategoryColor(b.category),
      }));
    }
    const colors = ['#00d68f', '#ff6b6b', '#6c5ce7', '#ffa94d', '#0984e3', '#fd79a8', '#a29bfe', '#00cec9'];
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({
        label,
        value,
        percentage: Math.round((value / total) * 100),
        color: colors[i % colors.length],
      }));
  });

  readonly currentLimit = computed(() => {
    const range = this.timeRange();
    return range === 'daily' ? this.goalsService.limits().daily : this.goalsService.limits().monthly;
  });

  // ===== Calendar =====
  readonly selectedCalDay = signal<number | null>(null);

  readonly calendarData = computed<CalendarDay[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
    const startDow = firstDow === 0 ? 6 : firstDow - 1; // convert to Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const txMap = new Map<number, { income: number; expense: number }>();
    for (const tx of this.transactionService.allTransactions()) {
      const d = new Date(tx.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const entry = txMap.get(day) ?? { income: 0, expense: 0 };
        if (tx.type === 'income') entry.income += tx.amountUZS;
        else entry.expense += tx.amountUZS;
        txMap.set(day, entry);
      }
    }

    const days: CalendarDay[] = [];
    for (let i = 0; i < startDow; i++) {
      days.push({ day: 0, isCurrentMonth: false, isToday: false, income: 0, expense: 0, hasData: false });
    }
    const today = now.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const data = txMap.get(d);
      days.push({
        day: d,
        isCurrentMonth: true,
        isToday: d === today,
        income: data?.income ?? 0,
        expense: data?.expense ?? 0,
        hasData: !!data,
      });
    }
    return days;
  });

  readonly selectedDayTxs = computed(() => {
    const day = this.selectedCalDay();
    if (day === null) return [];
    const now = new Date();
    return this.transactionService.allTransactions()
      .filter(tx => {
        const d = new Date(tx.date);
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() &&
               d.getDate() === day;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  calendarMonthLabel(): string {
    return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  selectedCalDayLabel(): string {
    const day = this.selectedCalDay();
    if (day === null) return '';
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), day)
      .toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  readonly dangerLinePercent = computed(() => {
    const limit = this.currentLimit();
    const bars = this.barData();
    if (bars.length === 0) return 0;
    const maxExpense = Math.max(...bars.map((b) => b.expense), 1);
    const pct = Math.min((limit / (maxExpense * 1.5)) * 100, 95);
    return pct;
  });

  // ===== Methods =====

  getBarHeight(value: number, maxVal: number): number {
    if (maxVal === 0) return 4;
    return Math.max((value / maxVal) * 80, 4);
  }

  abbreviate(val: number): string {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
    return val.toString();
  }

  getCircleDash(goal: SavingsGoal): string {
    const circumference = 2 * Math.PI * 30; // r=30
    return `${circumference}`;
  }

  getCircleOffset(goal: SavingsGoal): string {
    const circumference = 2 * Math.PI * 30;
    const pct = this.goalsService.getGoalProgress(goal) / 100;
    return `${circumference * (1 - pct)}`;
  }

  startAddFund(goal: SavingsGoal): void {
    this.addingToGoal.set(goal);
    this.fundAmount.set(null);
    this.goalFeedback.set('');
  }

  submitFund(goal: SavingsGoal): void {
    const amt = this.fundAmount();
    if (!amt || amt <= 0) return;

    const success = this.goalsService.addFunds(goal.id, amt);
    if (success) {
      this.goalFeedback.set(`+${this.abbreviate(amt)} added!`);
      this.showToast(`✓ ${this.currencyService.formatUZS(amt)} → ${goal.name}`);
      setTimeout(() => {
        this.addingToGoal.set(null);
        this.goalFeedback.set('');
      }, 1500);
    }
  }

  createGoal(): void {
    if (!this.newGoalName.trim() || this.newGoalTarget <= 0) return;
    this.goalsService.addGoal(
      this.newGoalName,
      this.newGoalIcon || '🎯',
      'custom',
      this.newGoalTarget,
      this.newGoalColor,
    );
    this.showToast(`✓ "${this.newGoalName}" goal created!`);
    this.newGoalName = '';
    this.newGoalIcon = '🎯';
    this.newGoalTarget = 0;
    this.showNewGoal.set(false);
  }

  private getCategoryColor(category: string): string {
    const map: Record<string, string> = {
      Food: '#00d68f',
      Taxi: '#ffa94d',
      Shopping: '#6c5ce7',
      Utilities: '#0984e3',
      Rent: '#ff6b6b',
      Salary: '#00cec9',
      Freelance: '#a29bfe',
    };
    return map[category] || '#fd79a8';
  }

  private showToast(msg: string): void {
    this.globalFeedback.set(msg);
    setTimeout(() => this.globalFeedback.set(''), 2500);
  }
}
