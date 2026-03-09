import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <div class="orb orb--1"></div>
      <div class="orb orb--2"></div>
      <div class="orb orb--3"></div>

      <div class="auth-card anim-scale-in">
        <!-- Header -->
        <div class="auth-card__header">
          <div class="brand">
            <span class="brand__icon">💰</span>
            <span class="brand__name">FinEco</span>
          </div>
          <h1 class="auth-card__title">Welcome back</h1>
          <p class="auth-card__subtitle">Sign in to your account</p>
        </div>

        <!-- Server error -->
        @if (serverError()) {
          <div class="alert alert--danger" role="alert" aria-live="assertive">
            <span class="alert__icon">⚠</span>
            {{ serverError() }}
          </div>
        }

        <!-- Form -->
        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          novalidate
          autocomplete="on"
          class="auth-form"
        >
          <!-- Email -->
          <div class="field" [class.field--error]="isInvalid('email')">
            <label class="field__label" for="email">Email Address</label>
            <div class="field__input-wrap">
              <span class="field__icon">✉</span>
              <input
                id="email"
                type="email"
                class="field__input"
                formControlName="email"
                placeholder="you@example.com"
                autocomplete="email"
                inputmode="email"
                spellcheck="false"
              />
            </div>
            @if (isInvalid('email')) {
              <span class="field__error">Enter a valid email address</span>
            }
          </div>

          <!-- Password -->
          <div class="field" [class.field--error]="isInvalid('password')">
            <div class="field__label-row">
              <label class="field__label" for="password">Password</label>
              <a href="#" class="link link--small" (click)="$event.preventDefault()">
                Forgot password?
              </a>
            </div>
            <div class="field__input-wrap">
              <span class="field__icon">🔒</span>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="field__input"
                formControlName="password"
                placeholder="Your password"
                autocomplete="current-password"
              />
              <button
                type="button"
                class="field__toggle"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
              >
                {{ showPassword() ? '🙈' : '👁' }}
              </button>
            </div>
            @if (isInvalid('password')) {
              <span class="field__error">Password is required</span>
            }
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn-primary"
            [disabled]="isSubmitting() || rateLimited()"
            [class.btn-primary--loading]="isSubmitting()"
          >
            @if (isSubmitting()) {
              <span class="spinner" aria-hidden="true"></span>
              Signing in…
            } @else if (rateLimited()) {
              Wait {{ cooldown() }}s
            } @else {
              Sign In
            }
          </button>
        </form>

        <!-- Footer -->
        <p class="auth-card__footer">
          Don't have an account?
          <a routerLink="/register" class="link">Create one</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      position: relative;
      overflow: hidden;
      background: var(--bg);
    }
    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.35;
      pointer-events: none;
      animation: float 8s ease-in-out infinite;
    }
    .orb--1 { width: 400px; height: 400px; background: radial-gradient(circle, #6c5ce7, transparent 70%); top: -100px; right: -80px; animation-delay: 0s; }
    .orb--2 { width: 280px; height: 280px; background: radial-gradient(circle, #00d68f, transparent 70%); bottom: -60px; left: -40px; animation-delay: 3s; }
    .orb--3 { width: 220px; height: 220px; background: radial-gradient(circle, #ffa94d, transparent 70%); top: 50%; left: 30%; animation-delay: 5s; }
    @keyframes float {
      0%, 100% { transform: translateY(0) scale(1); }
      50%       { transform: translateY(-20px) scale(1.05); }
    }
    .auth-card {
      position: relative; z-index: 1;
      width: 100%; max-width: 420px;
      background: rgba(255, 255, 255, 0.045);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 1.5rem;
      padding: 2.5rem 2.5rem 2rem;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.03), 0 24px 64px rgba(0,0,0,0.45);
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.94) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .anim-scale-in { animation: scaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
    .brand { display: flex; align-items: center; gap: 0.45rem; margin-bottom: 1.25rem; }
    .brand__icon { font-size: 1.6rem; }
    .brand__name { font-size: 1.3rem; font-weight: 800; letter-spacing: -0.02em; }
    .auth-card__header { margin-bottom: 1.5rem; }
    .auth-card__title { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 0.35rem; }
    .auth-card__subtitle { color: rgba(255,255,255,0.45); font-size: 0.9rem; }
    .alert {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.8rem 1rem; border-radius: 0.75rem;
      font-size: 0.875rem; font-weight: 500;
      margin-bottom: 1.25rem;
      animation: scaleIn 0.25s ease both;
    }
    .alert__icon { font-size: 1rem; }
    .alert--danger { background: rgba(255,107,107,0.15); border: 1px solid rgba(255,107,107,0.3); color: #ff6b6b; }
    .auth-form { display: flex; flex-direction: column; gap: 1.1rem; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field__label-row { display: flex; justify-content: space-between; align-items: center; }
    .field__label { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.65); letter-spacing: 0.03em; text-transform: uppercase; }
    .field__input-wrap { position: relative; display: flex; align-items: center; }
    .field__icon { position: absolute; left: 0.9rem; font-size: 1rem; pointer-events: none; opacity: 0.55; user-select: none; }
    .field__input {
      width: 100%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.75rem;
      padding: 0.75rem 2.8rem 0.75rem 2.6rem;
      color: #fff; font-size: 0.925rem;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .field__input::placeholder { color: rgba(255,255,255,0.25); }
    .field__input:focus { outline: none; border-color: var(--accent); background: rgba(108,92,231,0.06); box-shadow: 0 0 0 3px rgba(108,92,231,0.18); }
    .field--error .field__input { border-color: var(--danger); background: rgba(255,107,107,0.05); }
    .field--error .field__input:focus { box-shadow: 0 0 0 3px rgba(255,107,107,0.18); }
    .field__toggle { position: absolute; right: 0.75rem; background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.2rem; opacity: 0.55; transition: opacity 0.2s; }
    .field__toggle:hover { opacity: 1; }
    .field__error { font-size: 0.78rem; color: var(--danger); font-weight: 500; padding-left: 0.15rem; }
    .link { color: var(--accent); font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
    .link:hover { opacity: 0.8; text-decoration: underline; }
    .link--small { font-size: 0.78rem; }
    .btn-primary {
      display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      width: 100%; padding: 0.875rem;
      background: linear-gradient(135deg, #6c5ce7 0%, #a78bfa 100%);
      color: #fff; border: none; border-radius: 0.875rem;
      font-size: 0.975rem; font-weight: 700; letter-spacing: 0.02em;
      cursor: pointer; transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 20px rgba(108,92,231,0.35);
      margin-top: 0.25rem;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(108,92,231,0.45); }
    .btn-primary:active:not(:disabled) { transform: translateY(0); }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary--loading { cursor: wait; }
    .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .auth-card__footer { text-align: center; font-size: 0.875rem; color: rgba(255,255,255,0.4); margin-top: 1.5rem; }
    @media (max-width: 500px) {
      .auth-card { padding: 2rem 1.5rem 1.75rem; border-radius: 1.25rem; }
      .auth-card__title { font-size: 1.5rem; }
    }
  `],
})
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  form!: FormGroup;

  readonly showPassword = signal(false);
  readonly serverError = signal('');
  readonly isSubmitting = signal(false);
  readonly rateLimited = signal(false);
  readonly cooldown = signal(0);

  private cooldownTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    this.serverError.set('');

    if (this.form.invalid || this.rateLimited()) return;

    this.isSubmitting.set(true);

    try {
      await this.authService.login({
        email: this.form.value.email as string,
        password: this.form.value.password as string,
      });
      await this.router.navigate(['/dashboard']);
    } catch (err: unknown) {
      // Handle both Error objects and HTTP error responses from backend
      let msg = 'Sign-in failed. Please try again.';
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object' && 'error' in err) {
        const httpErr = err as { error?: { message?: string } };
        msg = httpErr.error?.message ?? msg;
      }
      this.serverError.set(msg);
      this.startCooldown(5);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private startCooldown(seconds: number): void {
    this.rateLimited.set(true);
    this.cooldown.set(seconds);

    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      const next = this.cooldown() - 1;
      if (next <= 0) {
        clearInterval(this.cooldownTimer);
        this.rateLimited.set(false);
        this.cooldown.set(0);
      } else {
        this.cooldown.set(next);
      }
    }, 1000);
  }
}
