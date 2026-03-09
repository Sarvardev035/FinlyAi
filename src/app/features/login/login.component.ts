import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly fullName = new FormControl('', Validators.required);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly isRegister = signal(false);

  toggleMode(): void {
    this.isRegister.update((v) => !v);
    this.error.set(null);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();

    try {
      if (this.isRegister()) {
        await this.auth.register({ fullName: this.fullName.value ?? '', email, password });
      } else {
        await this.auth.login({ email, password });
      }
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(err?.error?.message ?? 'Login failed. Check your credentials.');
      this.loading.set(false);
    }
  }
}
