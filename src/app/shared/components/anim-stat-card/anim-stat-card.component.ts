import {
  Component,
  ChangeDetectionStrategy,
  input,
  effect,
  signal,
  ElementRef,
  viewChild,
  OnDestroy,
  NgZone,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, spring, createTimeline } from 'animejs';

type CardVariant = 'networth' | 'income' | 'expense' | 'accent';

interface VariantConfig {
  gradient: string;
  glowColor: string;
  icon: string;
  borderColor: string;
}

const VARIANTS: Record<CardVariant, VariantConfig> = {
  networth: {
    gradient: 'linear-gradient(135deg, rgba(108,92,231,0.18) 0%, rgba(108,92,231,0.06) 100%)',
    glowColor: 'rgba(108,92,231,0.35)',
    icon: '💰',
    borderColor: 'rgba(108,92,231,0.3)',
  },
  income: {
    gradient: 'linear-gradient(135deg, rgba(0,214,143,0.15) 0%, rgba(0,214,143,0.05) 100%)',
    glowColor: 'rgba(0,214,143,0.3)',
    icon: '📈',
    borderColor: 'rgba(0,214,143,0.25)',
  },
  expense: {
    gradient: 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(255,107,107,0.05) 100%)',
    glowColor: 'rgba(255,107,107,0.3)',
    icon: '📉',
    borderColor: 'rgba(255,107,107,0.25)',
  },
  accent: {
    gradient: 'linear-gradient(135deg, rgba(255,169,77,0.15) 0%, rgba(255,169,77,0.05) 100%)',
    glowColor: 'rgba(255,169,77,0.3)',
    icon: '⚡',
    borderColor: 'rgba(255,169,77,0.25)',
  },
};

@Component({
  selector: 'app-anim-stat-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #card
      class="stat-card"
      [style.background]="variantConfig().gradient"
      [style.--glow]="variantConfig().glowColor"
      [style.border-color]="variantConfig().borderColor"
      (mouseenter)="onMouseEnter()"
      (mousemove)="onMouseMove($event)"
      (mouseleave)="onMouseLeave()"
    >
      <!-- Shine sweep layer -->
      <div class="stat-card__shine"></div>

      <!-- Icon badge -->
      <div class="stat-card__icon-wrap">
        <span class="stat-card__icon">{{ variantConfig().icon }}</span>
      </div>

      <!-- Content -->
      <div class="stat-card__body">
        <span class="stat-card__label">{{ label() }}</span>
        <span #valueEl class="stat-card__value">0</span>
        <span class="stat-card__currency">UZS</span>
      </div>

      <!-- Change badge -->
      @if (change() !== 0) {
        <div class="stat-card__badge" [class.stat-card__badge--pos]="change() > 0" [class.stat-card__badge--neg]="change() < 0">
          {{ change() > 0 ? '▲' : '▼' }} {{ change() | number:'1.1-1' }}%
        </div>
      }

      <!-- Glow ring on hover -->
      <div class="stat-card__glow-ring"></div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .stat-card {
      position: relative;
      border-radius: 1.5rem;
      border: 1px solid;
      padding: 1.5rem 1.6rem 1.4rem;
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      overflow: hidden;
      cursor: default;
      /* spring transitions handled by anime.js; only smooth what it doesn't touch */
      transition: box-shadow 0.3s ease;
      will-change: transform;
      box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset,
                  0 4px 24px rgba(0,0,0,0.25);
    }
    .stat-card:hover {
      box-shadow:
        0 1px 0 rgba(255,255,255,0.05) inset,
        0 8px 40px rgba(0,0,0,0.35),
        0 0 40px var(--glow, transparent);
    }

    /* Shine sweep */
    .stat-card__shine {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        105deg,
        transparent 40%,
        rgba(255,255,255,0.04) 50%,
        transparent 60%
      );
      background-size: 200% 100%;
      background-position: -100% 0;
      transition: background-position 0.6s ease;
      pointer-events: none;
      z-index: 0;
    }
    .stat-card:hover .stat-card__shine {
      background-position: 200% 0;
    }

    /* Glow ring */
    .stat-card__glow-ring {
      position: absolute;
      inset: -2px;
      border-radius: inherit;
      border: 1px solid transparent;
      background: linear-gradient(135deg, var(--glow, transparent), transparent 60%);
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }
    .stat-card:hover .stat-card__glow-ring { opacity: 1; }

    /* Icon */
    .stat-card__icon-wrap {
      position: absolute;
      top: 1.2rem;
      right: 1.2rem;
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.08);
      display: grid;
      place-items: center;
      backdrop-filter: blur(8px);
      font-size: 1.1rem;
      z-index: 1;
    }

    /* Body */
    .stat-card__body {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .stat-card__label {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255,255,255,0.45);
    }
    .stat-card__value {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: #fff;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .stat-card__currency {
      font-size: 0.65rem;
      font-weight: 700;
      color: rgba(255,255,255,0.25);
      letter-spacing: 0.08em;
      margin-top: -0.1rem;
    }

    /* Change badge */
    .stat-card__badge {
      position: absolute;
      bottom: 1.1rem;
      right: 1.2rem;
      z-index: 1;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 99px;
      letter-spacing: 0.03em;
    }
    .stat-card__badge--pos {
      background: rgba(0,214,143,0.15);
      color: #00d68f;
      border: 1px solid rgba(0,214,143,0.25);
    }
    .stat-card__badge--neg {
      background: rgba(255,107,107,0.15);
      color: #ff6b6b;
      border: 1px solid rgba(255,107,107,0.25);
    }
  `],
})
export class AnimStatCardComponent implements OnDestroy {
  /* ── Inputs ── */
  readonly value   = input<number>(0);
  readonly label   = input<string>('');
  readonly variant = input<CardVariant>('accent');
  readonly change  = input<number>(0);   // % change badge

  readonly variantConfig = () => VARIANTS[this.variant()];

  /* ── DOM refs ── */
  private readonly cardRef  = viewChild.required<ElementRef<HTMLDivElement>>('card');
  private readonly valueRef = viewChild.required<ElementRef<HTMLSpanElement>>('valueEl');

  private readonly zone = inject(NgZone);

  /* ── State ── */
  private prevValue   = 0;
  private isEntered   = false;

  private tiltAnim?: ReturnType<typeof animate>;

  constructor() {
    /* Count-up whenever value input changes */
    effect(() => {
      const target = this.value();
      this.zone.runOutsideAngular(() => this.countUp(this.prevValue, target));
      this.prevValue = target;
    });
  }

  ngOnDestroy(): void {
    this.tiltAnim?.cancel();
  }

  /* ─── Count-up animation via anime.js ───────────────────────────────────── */
  private countUp(from: number, to: number): void {
    const el = this.valueRef()?.nativeElement;
    if (!el) return;

    const counter = { val: from };

    animate(counter, {
      val: to,
      duration: 1100,
      ease: spring({ stiffness: 85, damping: 16, velocity: 0 }),
      onUpdate: () => {
        el.textContent = Math.round(counter.val).toLocaleString('en-US');
      },
    });
  }

  /* ─── 3D tilt on hover ───────────────────────────────────────────────────── */
  onMouseEnter(): void {
    if (!this.isEntered) {
      this.isEntered = true;
      this.zone.runOutsideAngular(() => {
        animate(this.cardRef().nativeElement, {
          scale: 1.025,
          duration: 260,
          ease: spring({ stiffness: 200, damping: 20 }),
        });
      });
    }
  }

  onMouseMove(e: MouseEvent): void {
    const card = this.cardRef().nativeElement;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const rotX = ((e.clientY - cy) / (rect.height / 2)) * -7;
    const rotY = ((e.clientX - cx) / (rect.width  / 2)) *  7;

    this.zone.runOutsideAngular(() => {
      card.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.025)`;
    });
  }

  onMouseLeave(): void {
    this.isEntered = false;
    const card = this.cardRef().nativeElement;
    this.zone.runOutsideAngular(() => {
      this.tiltAnim?.cancel();
      this.tiltAnim = animate(card, {
        rotateX:   0,
        rotateY:   0,
        scale:     1,
        ease: spring({ stiffness: 180, damping: 20 }),
      });
    });
  }
}
