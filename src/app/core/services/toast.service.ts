import { Injectable, signal, computed } from '@angular/core';

export type ToastLevel = 'error' | 'warning' | 'success' | 'info';

export interface Toast {
  id: number;
  level: ToastLevel;
  message: string;
  durationMs: number;
}

let _seq = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, level: ToastLevel = 'info', durationMs = 4000): void {
    const id = ++_seq;
    this._toasts.update(list => [...list, { id, level, message, durationMs }]);
    setTimeout(() => this.dismiss(id), durationMs + 400); // +400 for exit animation
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string, durationMs = 6000): void { this.show(message, 'error', durationMs); }
  warning(message: string): void { this.show(message, 'warning'); }
  info(message: string): void { this.show(message, 'info'); }

  dismiss(id: number): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
