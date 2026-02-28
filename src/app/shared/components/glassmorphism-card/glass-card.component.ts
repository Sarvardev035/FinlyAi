import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glass-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="glass-card" [ngClass]="variant ? 'glass-card--' + variant : ''">
      <ng-content />
    </div>
  `,
  styles: [`
    .glass-card {
      background: var(--surface);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius);
      padding: 1.5rem;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .glass-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(108, 92, 231, 0.1);
    }
    .glass-card--accent { border-left: 3px solid var(--accent); }
    .glass-card--success { border-left: 3px solid var(--success); }
    .glass-card--warning { border-left: 3px solid var(--warning); }
    .glass-card--danger { border-left: 3px solid var(--danger); }
  `],
})
export class GlassCardComponent {
  @Input() variant?: 'accent' | 'success' | 'warning' | 'danger';
}
