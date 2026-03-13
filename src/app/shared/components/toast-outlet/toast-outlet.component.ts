import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-outlet',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-outlet" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast toast--{{ toast.level }}"
          role="alert"
          (click)="toastService.dismiss(toast.id)"
        >
          <span class="toast__icon">{{ icon(toast.level) }}</span>
          <span class="toast__msg">{{ toast.message }}</span>
          <button
            class="toast__close"
            aria-label="Dismiss"
            (click)="$event.stopPropagation(); toastService.dismiss(toast.id)"
          >✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-outlet {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      max-width: min(24rem, calc(100vw - 2rem));
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.85rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      line-height: 1.4;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45);
      cursor: pointer;
      pointer-events: all;
      animation: toast-in 0.28s cubic-bezier(0.34,1.56,0.64,1) both;
      will-change: transform, opacity;
    }
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to   { opacity: 1; transform: none; }
    }
    .toast--error   { background: rgba(220,38,38,0.88); color: #fff; }
    .toast--warning { background: rgba(217,119,6,0.88); color: #fff; }
    .toast--success { background: rgba(22,163,74,0.88); color: #fff; }
    .toast--info    { background: rgba(37,99,235,0.88); color: #fff; }
    .toast__icon { font-size: 1rem; flex-shrink: 0; margin-top: 0.05rem; }
    .toast__msg  { flex: 1; }
    .toast__close {
      background: none;
      border: none;
      color: inherit;
      opacity: 0.7;
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
    }
    .toast__close:hover { opacity: 1; }
  `],
})
export class ToastOutletComponent {
  readonly toastService = inject(ToastService);

  icon(level: Toast['level']): string {
    const map: Record<Toast['level'], string> = { error: '✖', warning: '⚠', success: '✔', info: 'ℹ' };
    return map[level];
  }
}
