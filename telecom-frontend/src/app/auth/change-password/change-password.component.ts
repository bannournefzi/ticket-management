import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../auth/service/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const np = control.get('newPassword');
  const cp = control.get('confirmPassword');
  if (np && cp && np.value !== cp.value) {
    cp.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {

  form: FormGroup;
  isLoading = false;
  success = false;
  errorMessage: string | null = null;
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.form = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  // ── Regex helpers (called from template to avoid Angular parser errors) ──────

  hasUpperCase(value: string): boolean {
    return /[A-Z]/.test(value || '');
  }

  hasNumber(value: string): boolean {
    return /[0-9]/.test(value || '');
  }

  hasSpecialChar(value: string): boolean {
    return /[^A-Za-z0-9]/.test(value || '');
  }

  // ── Password strength ────────────────────────────────────────────────────────

  get passwordStrength(): number {
    const pwd = this.form.value.newPassword || '';
    let score = 0;
    if (pwd.length >= 8)          score++;
    if (this.hasUpperCase(pwd))   score++;
    if (this.hasNumber(pwd))      score++;
    if (this.hasSpecialChar(pwd)) score++;
    return score;
  }

  get strengthLabel(): string {
    return ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][this.passwordStrength] || '';
  }

  get strengthClass(): string {
    return ['', 'weak', 'medium', 'strong', 'very-strong'][this.passwordStrength] || '';
  }

  get strengthWidth(): number {
    return this.passwordStrength * 25;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.success = false;

    this.authService.changePassword(
      this.form.value.currentPassword,
      this.form.value.newPassword,
      this.form.value.confirmPassword
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.success = true;
        this.form.reset();
        setTimeout(() => this.success = false, 5000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Une erreur est survenue.';
      }
    });
  }
}