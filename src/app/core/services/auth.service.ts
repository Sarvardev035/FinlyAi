import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'fineco_jwt';
  private readonly REFRESH_KEY = 'fineco_refresh';

  private readonly _token = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));

  readonly isLoggedIn = computed(() => !!this._token());

  constructor(private readonly http: HttpClient, private readonly router: Router) {}

  login(credentials: LoginRequest): Observable<{ data: AuthResponse }> {
    return this.http.post<{ data: AuthResponse }>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap((res) => this.saveTokens(res.data))
    );
  }

  register(data: RegisterRequest): Observable<{ data: AuthResponse }> {
    return this.http.post<{ data: AuthResponse }>(`${environment.apiUrl}/auth/register`, data).pipe(
      tap((res) => this.saveTokens(res.data))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._token();
  }

  private saveTokens(auth: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, auth.accessToken);
    localStorage.setItem(this.REFRESH_KEY, auth.refreshToken);
    this._token.set(auth.accessToken);
  }
}
