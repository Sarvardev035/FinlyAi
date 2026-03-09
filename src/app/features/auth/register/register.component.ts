import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
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

      <div class="auth-card anim-scale-in">
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
                spellcheck="false"
                inputmode="email"
              />
            </div>
            @if (isInvalid('email')) {
              <span class="field__error">{{ getError('email') }}</span>
            }
          </div>

          <!-- Password -->
          <div class="field" [class.field--error]="isInvalid('password')">
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
              <span class="field__error">Passwords do not match</span>
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
              />
              <span class="checkbox-wrap__box" aria-hidden="true"></span>
              <span class="checkbox-wrap__text">
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
            [disabled]="isSubmitting() || rateLimited()"
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
      background: radial-gradient(circle, #6c5ce7, transparent 70%);
      top: -120px; left: -100px;
      animation-delay: 0s;
    }
    .orb--2 {
      width: 320px; height: 320px;
      background: radial-gradient(circle, #00d68f, transparent 70%);
      bottom: -80px; right: -60px;
      animation-delay: 3s;
    }
    .orb--3 {
      width: 260px; height: 260px;
      background: radial-gradient(circle, #ffa94d, transparent 70%);
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
      background: rgba(255, 255, 255, 0.045);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 1.5rem;
      padding: 2.5rem 2.5rem 2rem;
      box-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.03),
        0 24px 64px rgba(0, 0, 0, 0.45);
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
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    /* ── Header text ────────────────────────────────────────────────────── */
    .auth-card__header { margin-bottom: 1.5rem; }
    .auth-card__title {
      font-size: 1.75rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin-bottom: 0.35rem;
    }
    .auth-card__subtitle {
      color: rgba(255, 255, 255, 0.45);
      font-size: 0.9rem;
    }

    /* ── Alerts ─────────────────────────────────────────────────────────── */
    .alert {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.8rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 1.25rem;
      animation: scaleIn 0.25s ease both;
    }
    .alert__icon { font-size: 1rem; }
    .alert--danger  { background: rgba(255, 107, 107, 0.15); border: 1px solid rgba(255, 107, 107, 0.3); color: #ff6b6b; }
    .alert--success { background: rgba(0, 214, 143, 0.12);  border: 1px solid rgba(0, 214, 143, 0.3);  color: #00d68f; }

    /* ── Form ───────────────────────────────────────────────────────────── */
    .auth-form { display: flex; flex-direction: column; gap: 1.1rem; }

    /* ── Field ──────────────────────────────────────────────────────────── */
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field__label {
      font-size: 0.8rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.65);
      letter-spacing: 0.03em;
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
      font-size: 1rem;
      pointer-events: none;
      opacity: 0.55;
      user-select: none;
    }
    .field__input {
      width: 100%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      padding: 0.75rem 2.8rem 0.75rem 2.6rem;
      color: #fff;
      font-size: 0.925rem;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .field__input::placeholder { color: rgba(255, 255, 255, 0.25); }
    .field__input:focus {
      outline: none;
      border-color: var(--accent);
      background: rgba(108, 92, 231, 0.06);
      box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.18);
    }
    .field--error .field__input {
      border-color: var(--danger);
      background: rgba(255, 107, 107, 0.05);
    }
    .field--error .field__input:focus {
      box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.18);
    }
    .field__toggle {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 0.2rem;
      opacity: 0.55;
      transition: opacity 0.2s;
    }
    .field__toggle:hover { opacity: 1; }
    .field__error {
      font-size: 0.78rem;
      color: var(--danger);
      font-weight: 500;
      padding-left: 0.15rem;
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
export class RegisterComponent implements OnInit {
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

  /* ── Derived ── */
  readonly passwordValue = computed(
    () => (this.form?.get('password')?.value as string) ?? '',
  );
  readonly strength = computed(() =>
    this.authService.checkPasswordStrength(this.passwordValue()),
  );

  private cooldownTimer?: ReturnType<typeof setInterval>;

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
  }

  /* ── Field helpers ── */

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  isConfirmInvalid(): boolean {
    const ctrl = this.form.get('confirmPassword');
    const mismatch = this.form.hasError('passwordsMismatch');
    return !!(ctrl?.touched && mismatch);
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

    if (this.form.invalid || this.rateLimited()) return;

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
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      this.serverError.set(msg);
      this.startCooldown(8);
    } finally {
      this.isSubmitting.set(false);
    }
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
