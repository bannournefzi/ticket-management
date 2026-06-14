import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../auth/service/auth.service';
import { Router } from '@angular/router';

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
  selector: 'app-first-login-modal',
  templateUrl: './first-login-modal.component.html',
  styleUrls: ['./first-login-modal.component.scss']
})
export class FirstLoginModalComponent {
  passwordForm: FormGroup;
  isLoading = false;
  success = false;
  errorMessage: string | null = null;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.authService.firstLoginChangePassword(
      this.passwordForm.value.newPassword,
      this.passwordForm.value.confirmPassword
    ).subscribe({
      next: () => {
        this.isLoading = false;
        this.success = true;
        this.authService.clearMustChangePassword();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Une erreur est survenue.';
      }
    });
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  hasUpperCase(v: string): boolean { return /[A-Z]/.test(v || ''); }
  hasNumber(v: string): boolean { return /[0-9]/.test(v || ''); }
  hasSpecialChar(v: string): boolean { return /[^A-Za-z0-9]/.test(v || ''); }

  get passwordStrength(): number {
    const p = this.passwordForm.value.newPassword || '';
    return [p.length >= 8, this.hasUpperCase(p), this.hasNumber(p), this.hasSpecialChar(p)].filter(Boolean).length;
  }

  get strengthLabel(): string { return ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][this.passwordStrength] || ''; }
  get strengthClass(): string { return ['', 'weak', 'medium', 'strong', 'very-strong'][this.passwordStrength] || ''; }
  get strengthWidth(): number { return this.passwordStrength * 25; }
}
