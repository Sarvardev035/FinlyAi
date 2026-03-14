import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { OnDestroy } from '@angular/core';
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

      <div class="auth-card anim-scale-in" [class.auth-card--shake]="authShake()">
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
          <div
            class="field"
            [class.field--error]="isInvalid('email')"
            [class.field--pulse]="emailPulse()"
          >
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
          <div
            class="field"
            [class.field--error]="isInvalid('password')"
            [class.field--pulse]="passwordPulse()"
          >
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

        <div class="security-badge">
          <span aria-hidden="true">🔒</span>
          <span>256-bit SSL encrypted &amp; secure</span>
        </div>
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
    .orb--1 { width: 400px; height: 400px; background: radial-gradient(circle, var(--accent), transparent 70%); top: -100px; right: -80px; }
    .orb--2 { width: 280px; height: 280px; background: radial-gradient(circle, var(--success), transparent 70%); bottom: -60px; left: -40px; animation-delay: 3s; }
    .orb--3 { width: 220px; height: 220px; background: radial-gradient(circle, var(--warning), transparent 70%); top: 50%; left: 30%; animation-delay: 5s; }
    @keyframes float {
      0%, 100% { transform: translateY(0) scale(1); }
      50%       { transform: translateY(-20px) scale(1.05); }
    }
    .auth-card {
      position: relative; z-index: 1;
      width: 100%; max-width: 420px;
      background: rgba(13,18,35,0.75);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 2.5rem 2.5rem 2rem;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.02), var(--shadow-xl);
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.94) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .anim-scale-in { animation: scaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both; }
    .brand { display: flex; align-items: center; gap: 0.45rem; margin-bottom: 1.25rem; }
    .brand__icon { font-size: 1.6rem; }
    .brand__name { font-size: 1.2rem; font-weight: 800; letter-spacing: -0.025em; }
    .auth-card__header { margin-bottom: 1.5rem; }
    .auth-card__title { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.035em; margin-bottom: 0.4rem; color: var(--text-primary); }
    .auth-card__subtitle { color: var(--text-secondary); font-size: 0.9rem; }
    .alert {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.875rem 1rem; border-radius: var(--radius);
      font-size: var(--font-size-sm); font-weight: 500;
      margin-bottom: var(--space-5); line-height: 1.5;
      animation: scaleIn 0.25s ease both; border: 1px solid transparent;
    }
    .alert__icon { font-size: 1rem; }
    .alert--danger { background: var(--danger-bg); border-color: rgba(239,68,68,0.25); color: #fca5a5; }
    .auth-card--shake { animation: shakeX 0.28s ease; }
    @keyframes shakeX {
      0% { transform: translateX(0); }
      20% { transform: translateX(-7px); }
      40% { transform: translateX(7px); }
      60% { transform: translateX(-5px); }
      80% { transform: translateX(5px); }
      100% { transform: translateX(0); }
    }
    .auth-form { display: flex; flex-direction: column; gap: 1.15rem; }
    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .field__label-row { display: flex; justify-content: space-between; align-items: center; }
    .field__label { font-size: var(--font-size-xs); font-weight: 600; color: var(--text-secondary); letter-spacing: 0.05em; text-transform: uppercase; }
    .field__input-wrap { position: relative; display: flex; align-items: center; }
    .field__icon { position: absolute; left: 0.9rem; font-size: 0.95rem; pointer-events: none; opacity: 0.45; user-select: none; }
    .field__input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 2.8rem 0.75rem 2.6rem;
      color: var(--text-primary); font-size: var(--font-size-base);
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .field__input::placeholder { color: var(--text-tertiary); }
    .field__input:focus { outline: none; border-color: var(--accent); background: rgba(99,102,241,0.05); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .field--error .field__input { border-color: var(--danger); background: var(--danger-bg); }
    .field--error .field__input:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
    .field--pulse .field__input { animation: pulseDanger 0.42s ease; }
    @keyframes pulseDanger {
      0% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
      30% { box-shadow: 0 0 0 4px rgba(239,68,68,0.22); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
    .field__toggle { position: absolute; right: 0.75rem; background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0.25rem; opacity: 0.45; transition: opacity 0.2s; color: var(--text-primary); }
    .field__toggle:hover { opacity: 0.9; }
    .field__error { font-size: var(--font-size-xs); color: #fca5a5; font-weight: 500; }
    .link { color: var(--accent-light, var(--accent)); font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
    .link:hover { opacity: 0.75; text-decoration: underline; }
    .link--small { font-size: var(--font-size-xs); }
    .btn-primary {
      display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      width: 100%; padding: 0.9rem;
      background: linear-gradient(135deg, var(--accent-dark,#4F46E5) 0%, var(--accent-light,#818CF8) 100%);
      color: #fff; border: none; border-radius: var(--radius-lg);
      font-size: var(--font-size-base); font-weight: 700; letter-spacing: 0.02em;
      cursor: pointer; transition: opacity 0.2s, transform 0.18s, box-shadow 0.2s;
      box-shadow: var(--shadow-accent);
      margin-top: 0.25rem;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(99,102,241,0.5); }
    .btn-primary:active:not(:disabled) { transform: translateY(0); }
    .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-primary--loading { cursor: wait; }
    .spinner { display: inline-block; width: 15px; height: 15px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.65s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .auth-card__footer { text-align: center; font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: 1.5rem; }
    .security-badge {
      display: flex; align-items: center; justify-content: center; gap: 0.4rem;
      margin-top: 1rem; font-size: var(--font-size-xs); color: var(--text-tertiary);
      letter-spacing: 0.02em;
    }
    @media (max-width: 500px) {
      .auth-card { padding: 2rem 1.25rem 1.75rem; border-radius: var(--radius-lg); }
      .auth-card__title { font-size: 1.5rem; }
    }
  `],
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  form!: FormGroup;

  readonly showPassword = signal(false);
  readonly serverError = signal('');
  readonly isSubmitting = signal(false);
  readonly rateLimited = signal(false);
  readonly cooldown = signal(0);
  readonly authShake = signal(false);
  readonly emailPulse = signal(false);
  readonly passwordPulse = signal(false);
  readonly credentialError = computed(() => {
    const msg = this.serverError().toLowerCase();
    return msg.includes('incorrect email or password') || msg.includes('invalid email or password');
  });

  private cooldownTimer?: ReturnType<typeof setInterval>;
  private feedbackTimeouts: Array<ReturnType<typeof setTimeout>> = [];

  ngOnDestroy(): void {
    clearInterval(this.cooldownTimer);
    this.feedbackTimeouts.forEach((id) => clearTimeout(id));
  }

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
      const msg = resolveAuthError(err, 'sign-in');
      this.serverError.set(msg);
      this.triggerAuthFeedback(msg);
      this.startCooldown(5);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private triggerAuthFeedback(message: string): void {
    const msg = message.toLowerCase();

    if (this.credentialError() || msg.includes('incorrect email or password') || msg.includes('invalid email or password')) {
      this.authShake.set(false);
      this.emailPulse.set(false);
      this.passwordPulse.set(false);

      // Restart animation classes in the next frame so repeated failures animate again.
      this.feedbackTimeouts.push(
        setTimeout(() => {
          this.authShake.set(true);
          this.emailPulse.set(true);
          this.passwordPulse.set(true);

          this.feedbackTimeouts.push(setTimeout(() => this.authShake.set(false), 300));
          this.feedbackTimeouts.push(setTimeout(() => this.emailPulse.set(false), 450));
          this.feedbackTimeouts.push(setTimeout(() => this.passwordPulse.set(false), 450));
        }, 0),
      );
      return;
    }

    if (msg.includes('email')) {
      this.emailPulse.set(true);
      this.feedbackTimeouts.push(setTimeout(() => this.emailPulse.set(false), 450));
    }
    if (msg.includes('password')) {
      this.passwordPulse.set(true);
      this.feedbackTimeouts.push(setTimeout(() => this.passwordPulse.set(false), 450));
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

/** Maps raw HTTP errors to user-friendly inline messages for auth forms. */
function resolveAuthError(err: unknown, action: 'sign-in' | 'registration'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Our servers are temporarily unreachable. Please check your connection and try again.';
    }
    if (err.status === 401 || err.status === 403) {
      return 'Incorrect email or password. Please try again.';
    }
    if (err.status === 409) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (err.status === 429) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (err.status >= 500) {
      return 'Our servers are experiencing issues. Please try again in a few minutes.';
    }
    const serverMsg = (err.error as Record<string, unknown>)?.['message'];
    if (typeof serverMsg === 'string' && serverMsg.trim()) return serverMsg.trim();
  }
  if (err instanceof Error && err.message) return err.message;
  return `${action === 'sign-in' ? 'Sign-in' : 'Registration'} failed. Please try again.`;
}
