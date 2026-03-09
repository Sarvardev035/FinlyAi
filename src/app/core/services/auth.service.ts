import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

/* ─── Public Types ─────────────────────────────────────────────────────────── */
export interface User {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  width: string;
  tips: string[];
}

/* Let's simulate an in-memory DB so we never put passwords in localStorage! */
const IN_MEMORY_DB = new Map<string, { user: User; ph: string }>();

/* ─── Auth Service ─────────────────────────────────────────────────────────── */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /* ── DI ── */
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  /* ── Storage keys ── */
  private readonly TOKEN_KEY = 'fineco_jwt';
  private readonly USER_KEY = 'fineco_user'; // Storing just the UI user profile, no secrets.

  /* ── State ── */
  private readonly _currentUser = signal<User | null>(this.loadPersistedUser());
  private readonly _isLoading = signal(false);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);
  readonly isLoading = this._isLoading.asReadonly();

  /* ─── Persistence helpers ──────────────────────────────────────────────── */

  private loadPersistedUser(): User | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private persistSession(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  /* ─── Mock token ───────────────────────────────────────────────────────── */

  private buildMockJwt(user: User): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({ sub: user.id, email: user.email, iat: Math.floor(Date.now() / 1000) })
    );
    const signature = btoa(`${user.id}.${Date.now()}`); // Fake signature
    return `${header}.${payload}.${signature}`;
  }

  /* ─── Register ─────────────────────────────────────────────────────────── */

  async register(payload: RegisterPayload): Promise<void> {
    this._isLoading.set(true);

    try {
      await delay(900);
      const emailKey = payload.email.toLowerCase().trim();

      if (IN_MEMORY_DB.has(emailKey)) {
        throw new Error('An account with this email already exists.');
      }

      const user: User = {
        id: crypto.randomUUID(),
        fullName: payload.fullName.trim(),
        email: emailKey,
        createdAt: new Date().toISOString(),
      };

      // In-memory so it never touches disk/localStorage
      // Very basic hash simulation. In real life backend handles this.
      IN_MEMORY_DB.set(emailKey, { user, ph: btoa(payload.password) });

      const token = this.buildMockJwt(user);
      this.persistSession(token, user);
    } finally {
      this._isLoading.set(false);
    }
  }

  /* ─── Login ────────────────────────────────────────────────────────────── */

  async login(payload: LoginPayload): Promise<void> {
    this._isLoading.set(true);

    try {
      await delay(800);
      const emailKey = payload.email.toLowerCase().trim();
      const account = IN_MEMORY_DB.get(emailKey);

      if (!account) {
        throw new Error('Invalid email or password.');
      }

      if (atob(account.ph) !== payload.password) {
        throw new Error('Invalid email or password.');
      }

      const token = this.buildMockJwt(account.user);
      this.persistSession(token, account.user);
    } finally {
      this._isLoading.set(false);
    }
  }

  /* ─── Logout ───────────────────────────────────────────────────────────── */

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /* ─── Password strength ────────────────────────────────────────────────── */

  checkPasswordStrength(password: string): PasswordStrength {
    if (!password) {
      return { score: 0, label: '', color: 'transparent', width: '0%', tips: [] };
    }

    let met = 0;
    const tips: string[] = [];

    if (password.length >= 8) met++;
    else tips.push('Use at least 8 characters');

    if (password.length >= 12) met++;

    if (/[A-Z]/.test(password)) met++;
    else tips.push('Add an uppercase letter');

    if (/[a-z]/.test(password)) met++;
    else tips.push('Add a lowercase letter');

    if (/\d/.test(password)) met++;
    else tips.push('Add a number');

    if (/[^A-Za-z0-9]/.test(password)) met++;
    else tips.push('Add a special character (!@#$%...)');

    const rawScore = Math.min(4, Math.floor((met / 6) * 5)) as 0 | 1 | 2 | 3 | 4;
    const META: Record<number, { label: string; color: string; width: string }> = {
      0: { label: 'Very Weak', color: '#ff6b6b', width: '20%' },
      1: { label: 'Weak', color: '#ff6b6b', width: '30%' },
      2: { label: 'Fair', color: '#ffa94d', width: '55%' },
      3: { label: 'Strong', color: '#69db7c', width: '80%' },
      4: { label: 'Very Strong', color: '#00d68f', width: '100%' },
    };

    return { score: rawScore, tips, ...META[rawScore] };
  }
}

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));
