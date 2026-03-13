import { signal, computed } from '@angular/core';

/**
 * Lightweight signal-based helper for tracking async loading states in
 * components.  Each component creates its own instance so there is no
 * shared mutable state.
 *
 * Usage:
 *   private readonly ls = new LoadingState();
 *
 *   async loadData() {
 *     this.ls.start('accounts');
 *     try { ... } finally { this.ls.stop('accounts'); }
 *   }
 *
 *   // In template: @if (ls.busy('accounts')) { <app-skeleton /> }
 */
export class LoadingState {
  private readonly _keys = signal<Set<string>>(new Set());

  /** True while at least one key is loading. */
  readonly any = computed(() => this._keys().size > 0);

  start(key: string): void {
    this._keys.update(s => { const n = new Set(s); n.add(key); return n; });
  }

  stop(key: string): void {
    this._keys.update(s => { const n = new Set(s); n.delete(key); return n; });
  }

  /** Returns true while the specific key is loading. */
  busy(key: string): boolean {
    return this._keys().has(key);
  }

  /** Wraps an async call and manages start/stop automatically. */
  async wrap<T>(key: string, fn: () => Promise<T>): Promise<T> {
    this.start(key);
    try {
      return await fn();
    } finally {
      this.stop(key);
    }
  }
}
