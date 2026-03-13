import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Reusable inline shimmer skeleton block.
 *
 * Examples:
 *   <app-skeleton />                   — full-width, 1.2rem tall
 *   <app-skeleton height="4rem" />     — taller block (e.g. card)
 *   <app-skeleton [count]="3" />       — 3 stacked lines
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (_ of rows; track $index) {
      <div
        class="skeleton"
        [style.height]="height"
        [style.borderRadius]="radius"
        [style.marginBottom]="count > 1 ? '0.5rem' : '0'"
        role="status"
        aria-label="Loading…"
      ></div>
    }
  `,
  styles: [`
    .skeleton {
      width: 100%;
      background: linear-gradient(
        90deg,
        rgba(255,255,255,0.06) 25%,
        rgba(255,255,255,0.13) 50%,
        rgba(255,255,255,0.06) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
      border-radius: 0.5rem;
      display: block;
    }
    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class SkeletonComponent {
  @Input() height = '1.2rem';
  @Input() radius = '0.5rem';
  @Input() count  = 1;

  get rows(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
