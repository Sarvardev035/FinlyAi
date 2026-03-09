import {
  Component,
  ChangeDetectionStrategy,
  input,
  effect,
  ElementRef,
  viewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, stagger, spring } from 'animejs';
import { Transaction } from '../../../models';

@Component({
  selector: 'app-anim-transaction-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="txlist" #host>
      <!-- Header -->
      <div class="txlist__header">
        <div class="txlist__title-row">
          <span class="txlist__title">Transactions</span>
          <span class="txlist__count">{{ transactions().length }}</span>
        </div>
        <!-- Mini flow summary -->
        @if (transactions().length > 0) {
          <div class="txlist__flow">
            <div class="flow-bar">
              <div class="flow-bar__in"  [style.flex]="totalInRatio()"></div>
              <div class="flow-bar__out" [style.flex]="1 - totalInRatio()"></div>
            </div>
            <div class="flow-labels">
              <span class="flow-in">+{{ totalIn() | number:'1.0-0' }}</span>
              <span class="flow-out">−{{ totalOut() | number:'1.0-0' }}</span>
            </div>
          </div>
        }
      </div>

      <!-- List -->
      <div class="txlist__items" #listEl>
        @if (transactions().length === 0) {
          <div class="txlist__empty">
            <span class="txlist__empty-icon">💸</span>
            <p>No transactions yet</p>
          </div>
        }

        @for (tx of transactions().slice(0, maxItems()); track tx.id; let i = $index) {
          <div
            class="tx-item"
            [class.tx-item--income]="tx.type === 'income'"
            [class.tx-item--expense]="tx.type === 'expense'"
            [attr.data-i]="i"
            (mouseenter)="onItemHover($event, true)"
            (mouseleave)="onItemHover($event, false)"
          >
            <!-- Type icon -->
            <div class="tx-item__dot">
              <div class="tx-item__dot-inner"></div>
            </div>

            <!-- Info -->
            <div class="tx-item__info">
              <span class="tx-item__label">
                {{ tx.description || tx.category }}
              </span>
              <span class="tx-item__meta">
                {{ tx.category }} &bull; {{ tx.date | date:'MMM d, h:mm a' }}
              </span>
            </div>

            <!-- Amount -->
            <div class="tx-item__right">
              <span class="tx-item__amount">
                {{ tx.type === 'income' ? '+' : '−' }}{{ tx.amountUZS | number:'1.0-0' }}
              </span>
              <span class="tx-item__currency">UZS</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Wrapper ─────────────────────────────────────────────────────────── */
    .txlist {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 1.5rem;
      overflow: hidden;
    }

    /* ── Header ──────────────────────────────────────────────────────────── */
    .txlist__header {
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .txlist__title-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .txlist__title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.6);
    }
    .txlist__count {
      font-size: 0.68rem;
      font-weight: 700;
      background: rgba(108,92,231,0.18);
      color: rgba(108,92,231,1);
      border: 1px solid rgba(108,92,231,0.25);
      padding: 0.1rem 0.45rem;
      border-radius: 99px;
    }

    /* ── Flow bar ────────────────────────────────────────────────────────── */
    .flow-bar {
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      display: flex;
      background: rgba(255,255,255,0.05);
    }
    .flow-bar__in  { background: #00d68f; transition: flex 0.8s cubic-bezier(0.34,1.56,0.64,1); }
    .flow-bar__out { background: #ff6b6b; transition: flex 0.8s cubic-bezier(0.34,1.56,0.64,1); }
    .flow-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      font-weight: 700;
      margin-top: 0.3rem;
    }
    .flow-in  { color: #00d68f; }
    .flow-out { color: #ff6b6b; }

    /* ── Items ───────────────────────────────────────────────────────────── */
    .txlist__items {
      max-height: 380px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.5rem 0 0.5rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(108,92,231,0.3) transparent;
    }

    .txlist__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2.5rem;
      color: rgba(255,255,255,0.25);
      font-size: 0.85rem;
    }
    .txlist__empty-icon { font-size: 2rem; opacity: 0.5; }

    /* ── Transaction item ────────────────────────────────────────────────── */
    .tx-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.7rem 1.5rem;
      position: relative;
      cursor: default;
      opacity: 0;       /* anime.js reveal */
      transform: translateY(12px);
      transition: background 0.15s;
    }
    .tx-item:hover {
      background: rgba(255,255,255,0.025);
    }

    /* ── Dot indicator ───────────────────────────────────────────────────── */
    .tx-item__dot {
      position: relative;
      width: 10px;
      height: 10px;
      flex-shrink: 0;
    }
    .tx-item__dot-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      position: absolute;
    }
    .tx-item--income .tx-item__dot-inner {
      background: #00d68f;
      box-shadow: 0 0 6px rgba(0,214,143,0.7);
    }
    .tx-item--expense .tx-item__dot-inner {
      background: #ff6b6b;
      box-shadow: 0 0 6px rgba(255,107,107,0.7);
    }

    /* ── Info ────────────────────────────────────────────────────────────── */
    .tx-item__info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .tx-item__label {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tx-item__meta {
      font-size: 0.7rem;
      color: rgba(255,255,255,0.3);
    }

    /* ── Right ───────────────────────────────────────────────────────────── */
    .tx-item__right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.05rem;
    }
    .tx-item__amount {
      font-size: 0.85rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .tx-item--income  .tx-item__amount { color: #00d68f; }
    .tx-item--expense .tx-item__amount { color: #ff6b6b; }
    .tx-item__currency {
      font-size: 0.6rem;
      font-weight: 700;
      color: rgba(255,255,255,0.2);
      letter-spacing: 0.06em;
    }
  `],
})
export class AnimTransactionListComponent implements AfterViewInit, OnDestroy {
  readonly transactions = input<Transaction[]>([]);
  readonly maxItems     = input<number>(30);

  private readonly listRef = viewChild.required<ElementRef<HTMLDivElement>>('listEl');
  private readonly zone    = inject(NgZone);

  private observer!: IntersectionObserver;

  /* Computed flow totals */
  totalIn  = () => this.transactions().filter(t => t.type === 'income' ).reduce((s,t) => s + t.amountUZS, 0);
  totalOut = () => this.transactions().filter(t => t.type === 'expense').reduce((s,t) => s + t.amountUZS, 0);
  totalInRatio = () => {
    const total = this.totalIn() + this.totalOut();
    return total > 0 ? this.totalIn() / total : 0.5;
  };

  constructor() {
    effect(() => {
      this.transactions();  // track
      // Re-run animation when list content changes
      setTimeout(() => this.animateItems(), 50);
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            this.animateItems();
            this.observer.disconnect();
          }
        },
        { threshold: 0.05 },
      );
      this.observer.observe(this.listRef().nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private animateItems(): void {
    const items = this.listRef().nativeElement.querySelectorAll<HTMLElement>('.tx-item');
    if (!items.length) return;

    animate(items, {
      opacity:    [0, 1],
      translateY: [12, 0],
      delay: stagger(45, { start: 0 }),
      ease: spring({ stiffness: 120, damping: 18 }),
    });
  }

  onItemHover(e: MouseEvent, entering: boolean): void {
    const item = (e.currentTarget as HTMLElement);
    this.zone.runOutsideAngular(() => {
      animate(item, {
        translateX: entering ? 3 : 0,
        duration: 180,
        ease: spring({ stiffness: 260, damping: 22 }),
      });
    });
  }
}
