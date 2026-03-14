import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SUPPRESS_ERROR_TOAST } from '../interceptors/error.interceptor';

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

interface AuthTokens { accessToken: string; refreshToken: string; }
interface ApiResponse<T> { success: boolean; data: T; }

/* ─── Auth Service ─────────────────────────────────────────────────────────── */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /* ── DI ── */
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = environment.apiUrl;

  /* ── Storage keys ── */
  private readonly TOKEN_KEY = 'fineco_jwt';
  private readonly REFRESH_KEY = 'fineco_refresh';
  private readonly USER_KEY = 'fineco_user';

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

  private persistTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.REFRESH_KEY, tokens.refreshToken);
  }

  private persistUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  /* ─── Register ─────────────────────────────────────────────────────────── */

  async register(payload: RegisterPayload): Promise<void> {
    this._isLoading.set(true);
    try {
      const res = await lastValueFrom(
        this.http.post<ApiResponse<AuthTokens>>(`${this.base}/auth/register`, payload, {
          context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
        })
      );
      this.persistTokens(res.data);
      await this.fetchAndPersistUser();
    } finally {
      this._isLoading.set(false);
    }
  }

  /* ─── Login ────────────────────────────────────────────────────────────── */

  async login(payload: LoginPayload): Promise<void> {
    this._isLoading.set(true);
    try {
      const res = await lastValueFrom(
        this.http.post<ApiResponse<AuthTokens>>(`${this.base}/auth/login`, payload, {
          context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
        })
      );
      this.persistTokens(res.data);
      await this.fetchAndPersistUser();
    } finally {
      this._isLoading.set(false);
    }
  }

  /* ─── Fetch current user profile ──────────────────────────────────────── */

  private async fetchAndPersistUser(): Promise<void> {
    try {
      const res = await lastValueFrom(
        this.http.get<ApiResponse<User>>(`${this.base}/users/me`, {
          context: new HttpContext().set(SUPPRESS_ERROR_TOAST, true),
        })
      );
      this.persistUser(res.data);
    } catch {
      // If /users/me fails, still treat as logged in — token is stored
      this._currentUser.set({ id: '', fullName: 'User', email: '', createdAt: '' });
    }
  }

  /* ─── Logout ───────────────────────────────────────────────────────────── */

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
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
