import {
  Component,
  ChangeDetectionStrategy,
  input,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  viewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, stagger, spring } from 'animejs';

export interface CashflowBar {
  label:   string;
  income:  number;
  expense: number;
}

@Component({
  selector: 'app-anim-cashflow-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" #host>
      <!-- Header -->
      <div class="chart__header">
        <span class="chart__title">Cash Flow</span>
        <div class="chart__legend">
          <span class="legend-dot legend-dot--in"></span>Income
          <span class="legend-dot legend-dot--out"></span>Expense
        </div>
      </div>

      <!-- Bar chart -->
      <div class="chart__body" #body>
        @for (bar of data(); track bar.label) {
          <div class="chart__col">
            <!-- Bars -->
            <div class="chart__bars">
              <div class="bar-wrap bar-wrap--in">
                <div
                  class="bar bar--in"
                  [style.height.%]="barHeight(bar.income)"
                ></div>
              </div>
              <div class="bar-wrap bar-wrap--out">
                <div
                  class="bar bar--out"
                  [style.height.%]="barHeight(bar.expense)"
                ></div>
              </div>
            </div>
            <!-- Label -->
            <span class="chart__label">{{ bar.label }}</span>
          </div>
        }

        @if (data().length === 0) {
          <div class="chart__empty">No data</div>
        }
      </div>

      <!-- Y-axis hints -->
      <div class="chart__yaxis">
        @for (tick of yTicks(); track tick) {
          <span>{{ tick | number:'1.0-0' }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Wrapper ─────────────────────────────────────────────────────────── */
    .chart {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 1.5rem;
      padding: 1.25rem 1.5rem 1rem;
      position: relative;
    }

    /* ── Header ──────────────────────────────────────────────────────────── */
    .chart__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }
    .chart__title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.6);
    }
    .chart__legend {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.7rem;
      color: rgba(255,255,255,0.35);
    }
    .legend-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-right: 2px;
    }
    .legend-dot--in  { background: #00d68f; margin-left: 8px; }
    .legend-dot--out { background: #ff6b6b; }

    /* ── Body ────────────────────────────────────────────────────────────── */
    .chart__body {
      display: flex;
      align-items: flex-end;
      gap: 0.6rem;
      height: 160px;
      position: relative;
    }

    .chart__col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      height: 100%;
    }

    /* ── Bar track ───────────────────────────────────────────────────────── */
    .chart__bars {
      flex: 1;
      display: flex;
      align-items: flex-end;
      gap: 2px;
      width: 100%;
    }
    .bar-wrap {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: flex-end;
      border-radius: 3px 3px 0 0;
      overflow: hidden;
    }
    .bar {
      width: 100%;
      border-radius: 3px 3px 0 0;
      transform-origin: bottom center;
      transform: scaleY(0);  /* anime.js drives scaleY → 1 */
    }
    .bar--in  {
      background: linear-gradient(to top, #00d68f, rgba(0,214,143,0.5));
      box-shadow: 0 0 10px rgba(0,214,143,0.3);
    }
    .bar--out {
      background: linear-gradient(to top, #ff6b6b, rgba(255,107,107,0.5));
      box-shadow: 0 0 10px rgba(255,107,107,0.3);
    }

    /* ── Label ───────────────────────────────────────────────────────────── */
    .chart__label {
      font-size: 0.62rem;
      color: rgba(255,255,255,0.3);
      white-space: nowrap;
      font-weight: 600;
    }

    /* ── Y-axis ──────────────────────────────────────────────────────────── */
    .chart__yaxis {
      position: absolute;
      top: 3.5rem;
      left: 0;
      bottom: 1.5rem;
      display: flex;
      flex-direction: column-reverse;
      justify-content: space-between;
      padding-left: 0;
      pointer-events: none;
      width: 1px;  /* visually hidden; labels float on left */
    }
    .chart__yaxis span {
      font-size: 0.58rem;
      color: rgba(255,255,255,0.15);
      transform: translateX(-110%);
      white-space: nowrap;
    }

    .chart__empty {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.2);
      font-size: 0.8rem;
    }
  `],
})
export class AnimCashflowChartComponent implements AfterViewInit, OnDestroy {
  readonly data = input<CashflowBar[]>([]);

  private readonly hostRef = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly bodyRef = viewChild.required<ElementRef<HTMLElement>>('body');
  private readonly zone    = inject(NgZone);

  private observer!: IntersectionObserver;

  constructor() {
    effect(() => {
      this.data();
      setTimeout(() => this.animateBars(), 60);
    });
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            this.animateBars();
            this.observer.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      this.observer.observe(this.hostRef().nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** Percentage of the chart height a value occupies (1..100). */
  barHeight(value: number): number {
    const max = this.maxValue();
    if (!max) return 0;
    return Math.max(2, (value / max) * 100);
  }

  yTicks(): number[] {
    const max = this.maxValue();
    if (!max) return [];
    return [0, max * 0.25, max * 0.5, max * 0.75, max].map(v => Math.round(v));
  }

  private maxValue(): number {
    const all = this.data().flatMap(b => [b.income, b.expense]);
    return all.length ? Math.max(...all) : 0;
  }

  private animateBars(): void {
    this.zone.runOutsideAngular(() => {
      const barsIn  = this.bodyRef().nativeElement.querySelectorAll<HTMLElement>('.bar--in');
      const barsOut = this.bodyRef().nativeElement.querySelectorAll<HTMLElement>('.bar--out');
      const cols    = this.bodyRef().nativeElement.querySelectorAll<HTMLElement>('.chart__col');

      if (!cols.length) return;

      // Column stagger fade-in
      animate(cols, {
        opacity:    [0, 1],
        delay: stagger(60),
        ease: spring({ stiffness: 120, damping: 18 }),
      });

      // Bar grow from bottom
      if (barsIn.length) {
        animate(barsIn, {
          scaleY: [0, 1],
          delay: stagger(60, { start: 80 }),
          ease: spring({ stiffness: 85, damping: 14 }),
        });
      }
      if (barsOut.length) {
        animate(barsOut, {
          scaleY: [0, 1],
          delay: stagger(60, { start: 140 }),
          ease: spring({ stiffness: 85, damping: 14 }),
        });
      }
    });
  }
}
