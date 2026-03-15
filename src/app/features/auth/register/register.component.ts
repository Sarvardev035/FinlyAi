import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService, PasswordStrength } from '../../../core/services/auth.service';

/* ─── Custom Validators ────────────────────────────────────────────────────── */

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value as string;
  const confirm = control.get('confirmPassword')?.value as string;
  return password && confirm && password !== confirm ? { passwordsMismatch: true } : null;
}

function strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value as string) ?? '';
  if (!v) return null;
  const missing: string[] = [];
  if (v.length < 8) missing.push('8+ chars');
  if (!/[A-Z]/.test(v)) missing.push('uppercase');
  if (!/[a-z]/.test(v)) missing.push('lowercase');
  if (!/\d/.test(v)) missing.push('number');
  if (!/[^A-Za-z0-9]/.test(v)) missing.push('special character');
  return missing.length ? { weakPassword: { missing } } : null;
}

/* ─── Component ────────────────────────────────────────────────────────────── */

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-page">
      <!-- Background orbs -->
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
          <h1 class="auth-card__title">Create Account</h1>
          <p class="auth-card__subtitle">
            Start managing your finances securely
          </p>
        </div>

        <!-- Server error -->
        @if (serverError()) {
          <div class="alert alert--danger" role="alert" aria-live="assertive">
            <span class="alert__icon">⚠</span>
            {{ serverError() }}
          </div>
        }

        <!-- Success -->
        @if (successMsg()) {
          <div class="alert alert--success" role="status" aria-live="polite">
            <span class="alert__icon">✓</span>
            {{ successMsg() }}
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
          <!-- Full name -->
          <div class="field" [class.field--error]="isInvalid('fullName')">
            <label class="field__label" for="fullName">Full Name</label>
            <div class="field__input-wrap">
              <span class="field__icon">👤</span>
              <input
                id="fullName"
                type="text"
                class="field__input"
                formControlName="fullName"
                placeholder="Sardor Aliyev"
                autocomplete="name"
                spellcheck="false"
              />
            </div>
            @if (isInvalid('fullName')) {
              <span class="field__error">{{ getError('fullName') }}</span>
            }
          </div>

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
                spellcheck="false"
                inputmode="email"
              />
            </div>
            @if (isInvalid('email')) {
              <span class="field__error">{{ getError('email') }}</span>
            }
          </div>

          <!-- Password -->
          <div
            class="field"
            [class.field--error]="isInvalid('password')"
            [class.field--pulse]="passwordPulse()"
          >
            <label class="field__label" for="password">Password</label>
            <div class="field__input-wrap">
              <span class="field__icon">🔒</span>
              <input
                id="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="field__input"
                formControlName="password"
                placeholder="Min 8 chars, mixed case + symbol"
                autocomplete="new-password"
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

            <!-- Strength meter -->
            @if (passwordValue()) {
              <div class="strength-bar" role="progressbar"
                [attr.aria-valuenow]="strength().score"
                aria-valuemin="0" aria-valuemax="4">
                <div
                  class="strength-bar__fill"
                  [style.width]="strength().width"
                  [style.background]="strength().color"
                ></div>
              </div>
              <div class="strength-label" [style.color]="strength().color">
                {{ strength().label }}
                @if (strength().tips.length) {
                  — {{ strength().tips[0] }}
                }
              </div>
            }

            @if (isInvalid('password')) {
              <span class="field__error">{{ getError('password') }}</span>
            }
          </div>

          <!-- Confirm password -->
          <div class="field" [class.field--error]="isConfirmInvalid()">
            <label class="field__label" for="confirmPassword">Confirm Password</label>
            <div class="field__input-wrap">
              <span class="field__icon">🔑</span>
              <input
                id="confirmPassword"
                [type]="showConfirm() ? 'text' : 'password'"
                class="field__input"
                formControlName="confirmPassword"
                placeholder="Repeat your password"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="field__toggle"
                (click)="showConfirm.set(!showConfirm())"
                [attr.aria-label]="showConfirm() ? 'Hide confirm password' : 'Show confirm password'"
              >
                {{ showConfirm() ? '🙈' : '👁' }}
              </button>
            </div>
            @if (isConfirmInvalid()) {
              <span class="field__error">{{ getConfirmError() }}</span>
            }
          </div>

          <!-- Terms -->
          <div class="field field--checkbox" [class.field--error]="isInvalid('terms')">
            <label class="checkbox-wrap">
              <input
                type="checkbox"
                formControlName="terms"
                id="terms"
                class="checkbox-wrap__input"
                aria-labelledby="termsLabel"
              />
              <span class="checkbox-wrap__box" aria-hidden="true"></span>
              <span class="checkbox-wrap__text" id="termsLabel">
                I agree to the
                <a href="#" class="link" (click)="$event.preventDefault()">Terms of Service</a>
                and
                <a href="#" class="link" (click)="$event.preventDefault()">Privacy Policy</a>
              </span>
            </label>
            @if (isInvalid('terms')) {
              <span class="field__error">You must accept the terms</span>
            }
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn-primary"
            [disabled]="isSubmitting() || rateLimited() || form.invalid"
            [class.btn-primary--loading]="isSubmitting()"
          >
            @if (isSubmitting()) {
              <span class="spinner" aria-hidden="true"></span>
              Creating account…
            } @else if (rateLimited()) {
              Wait {{ cooldown() }}s before retrying
            } @else {
              Create Account
            }
          </button>
        </form>

        <!-- Footer -->
        <p class="auth-card__footer">
          Already have an account?
          <a routerLink="/login" class="link">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    /* ── Page shell ─────────────────────────────────────────────────────── */
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

    /* ── Animated background orbs ───────────────────────────────────────── */
    .orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.35;
      pointer-events: none;
      animation: float 8s ease-in-out infinite;
    }
    .orb--1 {
      width: 420px; height: 420px;
      background: radial-gradient(circle, var(--accent), transparent 70%);
      top: -120px; left: -100px;
    }
    .orb--2 {
      width: 320px; height: 320px;
      background: radial-gradient(circle, var(--success), transparent 70%);
      bottom: -80px; right: -60px;
      animation-delay: 3s;
    }
    .orb--3 {
      width: 260px; height: 260px;
      background: radial-gradient(circle, var(--warning), transparent 70%);
      top: 40%; left: 60%;
      animation-delay: 5s;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0) scale(1); }
      50%       { transform: translateY(-20px) scale(1.05); }
    }

    /* ── Card ───────────────────────────────────────────────────────────── */
    .auth-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 460px;
      background: rgba(13,18,35,0.75);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 2.5rem 2.5rem 2rem;
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.02), var(--shadow-xl);
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.94) translateY(16px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    .anim-scale-in { animation: scaleIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

    /* ── Brand ──────────────────────────────────────────────────────────── */
    .brand {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 1.25rem;
    }
    .brand__icon { font-size: 1.6rem; }
    .brand__name {
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -0.025em;
    }

    /* ── Header text ────────────────────────────────────────────────────── */
    .auth-card__header { margin-bottom: 1.5rem; }
    .auth-card__title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.035em;
      margin-bottom: 0.4rem;
      color: var(--text-primary);
    }
    .auth-card__subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* ── Alerts ─────────────────────────────────────────────────────────── */
    .alert {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.8rem 1rem;
      border-radius: var(--radius);
      font-size: var(--font-size-sm);
      font-weight: 500;
      margin-bottom: 1.25rem;
      animation: scaleIn 0.25s ease both;
      border: 1px solid transparent;
    }
    .alert__icon { font-size: 1rem; }
    .alert--danger  { background: var(--danger-bg);  border-color: rgba(239,68,68,0.25);   color: #fca5a5; }
    .alert--success { background: var(--success-bg); border-color: rgba(16,185,129,0.25);  color: #6ee7b7; }
    .auth-card--shake { animation: shakeX 0.28s ease; }
    @keyframes shakeX {
      0% { transform: translateX(0); }
      20% { transform: translateX(-7px); }
      40% { transform: translateX(7px); }
      60% { transform: translateX(-5px); }
      80% { transform: translateX(5px); }
      100% { transform: translateX(0); }
    }

    /* ── Form ───────────────────────────────────────────────────────────── */
    .auth-form { display: flex; flex-direction: column; gap: 1.1rem; }

    /* ── Field ──────────────────────────────────────────────────────────── */
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field__label {
      font-size: var(--font-size-xs);
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .field__input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .field__icon {
      position: absolute;
      left: 0.9rem;
      font-size: 0.95rem;
      pointer-events: none;
      opacity: 0.45;
      user-select: none;
    }
    .field__input {
      width: 100%;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 2.8rem 0.75rem 2.6rem;
      color: var(--text-primary);
      font-size: var(--font-size-base);
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .field__input::placeholder { color: var(--text-tertiary); }
    .field__input:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(99,102,241,0.05);
      box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
    }
    .field--error .field__input {
      border-color: var(--danger);
      background: var(--danger-bg);
    }
    .field--pulse .field__input { animation: pulseDanger 0.42s ease; }
    @keyframes pulseDanger {
      0% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
      30% { box-shadow: 0 0 0 4px rgba(239,68,68,0.22); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
    }
    .field--error .field__input:focus {
      box-shadow: 0 0 0 3px rgba(239,68,68,0.15);
    }
    .field__toggle {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.2rem;
      opacity: 0.45;
      transition: opacity 0.2s;
      color: var(--text-primary);
    }
    .field__toggle:hover { opacity: 0.9; }
    .field__error {
      font-size: var(--font-size-xs);
      color: #fca5a5;
      font-weight: 500;
    }

    /* ── Strength meter ──────────────────────────────────────────────────── */
    .strength-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.2rem;
    }
    .strength-bar__fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.4s ease, background 0.4s ease;
    }
    .strength-label {
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.15rem;
      transition: color 0.3s;
    }

    /* ── Checkbox ───────────────────────────────────────────────────────── */
    .field--checkbox { flex-direction: row; align-items: flex-start; }
    .checkbox-wrap {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-wrap__input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }
    .checkbox-wrap__box {
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      border-radius: 5px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
      display: grid;
      place-items: center;
      transition: border-color 0.2s, background 0.2s;
      margin-top: 1px;
    }
    .checkbox-wrap__input:checked + .checkbox-wrap__box {
      background: var(--accent);
      border-color: var(--accent);
    }
    .checkbox-wrap__input:checked + .checkbox-wrap__box::after {
      content: '✓';
      font-size: 0.65rem;
      font-weight: 900;
      color: #fff;
    }
    .checkbox-wrap__text {
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.55);
      line-height: 1.5;
    }
    .link {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .link:hover { opacity: 0.8; text-decoration: underline; }

    /* ── Submit button ──────────────────────────────────────────────────── */
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      width: 100%;
      padding: 0.875rem;
      background: linear-gradient(135deg, #6c5ce7 0%, #a78bfa 100%);
      color: #fff;
      border: none;
      border-radius: 0.875rem;
      font-size: 0.975rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
      box-shadow: 0 4px 20px rgba(108, 92, 231, 0.35);
      margin-top: 0.25rem;
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
      box-shadow: 0 8px 28px rgba(108, 92, 231, 0.45);
    }
    .btn-primary:active:not(:disabled) {
      transform: translateY(0);
    }
    .btn-primary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .btn-primary--loading { cursor: wait; }

    /* ── Spinner ────────────────────────────────────────────────────────── */
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Footer link ────────────────────────────────────────────────────── */
    .auth-card__footer {
      text-align: center;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.4);
      margin-top: 1.5rem;
    }

    /* ── Mobile ─────────────────────────────────────────────────────────── */
    @media (max-width: 500px) {
      .auth-card { padding: 2rem 1.5rem 1.75rem; border-radius: 1.25rem; }
      .auth-card__title { font-size: 1.5rem; }
    }
  `],
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  /* ── Form ── */
  form!: FormGroup;

  /* ── UI state ── */
  readonly showPassword = signal(false);
  readonly showConfirm = signal(false);
  readonly serverError = signal('');
  readonly successMsg = signal('');
  readonly isSubmitting = signal(false);
  readonly rateLimited = signal(false);
  readonly cooldown = signal(0);
  readonly authShake = signal(false);
  readonly emailPulse = signal(false);
  readonly passwordPulse = signal(false);

  /* ── Derived ── */
  readonly passwordValue = computed(
    () => (this.form?.get('password')?.value as string) ?? '',
  );
  readonly strength = computed(() =>
    this.authService.checkPasswordStrength(this.passwordValue()),
  );

  private cooldownTimer?: ReturnType<typeof setInterval>;
  private feedbackTimeouts: Array<ReturnType<typeof setTimeout>> = [];

  ngOnDestroy(): void {
    clearInterval(this.cooldownTimer);
    this.feedbackTimeouts.forEach((id) => clearTimeout(id));
  }

  ngOnInit(): void {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.form = this.fb.group(
      {
        fullName: [
          '',
          [
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(80),
            Validators.pattern(/^[\p{L}\s'-]+$/u),
          ],
        ],
        email: [
          '',
          [Validators.required, Validators.email, Validators.maxLength(254)],
        ],
        password: [
          '',
          [Validators.required, Validators.minLength(8), strongPasswordValidator],
        ],
        confirmPassword: ['', Validators.required],
        terms: [false, Validators.requiredTrue],
      },
      { validators: passwordsMatchValidator },
    );

    // Revalidate confirmPassword whenever password changes
    this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true });
    });

    // Clear stale server messages as soon as the user edits the form.
    this.form.valueChanges.subscribe(() => {
      if (this.serverError()) this.serverError.set('');
      if (this.successMsg()) this.successMsg.set('');
    });
  }

  /* ── Field helpers ── */

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  isConfirmInvalid(): boolean {
    const ctrl = this.form.get('confirmPassword');
    const mismatch = this.form.hasError('passwordsMismatch');
    return !!(ctrl?.touched && (ctrl.hasError('required') || mismatch));
  }

  getConfirmError(): string {
    const ctrl = this.form.get('confirmPassword');
    if (ctrl?.hasError('required')) return 'Please confirm your password';
    if (this.form.hasError('passwordsMismatch')) return 'Passwords do not match';
    return 'Invalid value';
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    const e = ctrl.errors;

    if (e['required']) return 'This field is required';
    if (e['email']) return 'Enter a valid email address';
    if (e['minlength']) return `Min ${e['minlength'].requiredLength} characters required`;
    if (e['maxlength']) return `Max ${e['maxlength'].requiredLength} characters allowed`;
    if (e['pattern']) return 'Only letters, spaces, hyphens, and apostrophes allowed';
    if (e['weakPassword']) {
      const missing: string[] = e['weakPassword'].missing;
      return `Needs: ${missing.join(', ')}`;
    }
    return 'Invalid value';
  }

  /* ── Submit ── */

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    this.serverError.set('');
    this.successMsg.set('');

    if (this.form.invalid || this.rateLimited()) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      await this.authService.register({
        fullName: this.form.value.fullName as string,
        email: this.form.value.email as string,
        password: this.form.value.password as string,
      });

      this.successMsg.set('Account created! Redirecting…');

      setTimeout(() => this.router.navigate(['/dashboard']), 1200);
    } catch (err: unknown) {
      const msg = resolveAuthError(err, 'registration');
      this.serverError.set(msg);
      this.triggerAuthFeedback(msg);
      this.startCooldown(8);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private triggerAuthFeedback(message: string): void {
    const msg = message.toLowerCase();
    this.authShake.set(false);
    this.emailPulse.set(false);
    this.passwordPulse.set(false);

    this.feedbackTimeouts.push(
      setTimeout(() => {
        if (msg.includes('email')) this.emailPulse.set(true);
        if (msg.includes('password')) this.passwordPulse.set(true);

        if (msg.includes('exists') || msg.includes('invalid') || msg.includes('failed')) {
          this.authShake.set(true);
        }

        this.feedbackTimeouts.push(setTimeout(() => this.authShake.set(false), 300));
        this.feedbackTimeouts.push(setTimeout(() => this.emailPulse.set(false), 450));
        this.feedbackTimeouts.push(setTimeout(() => this.passwordPulse.set(false), 450));
      }, 0),
    );
  }

  /* ── Rate-limit cooldown ── */

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
