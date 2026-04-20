import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../auth/service/auth.service';
import { Router } from '@angular/router';
import { AuthenticationRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  isLoading = false;

  // ✅ Nouvelles variables
  showPassword = false;
  emailFocused = false;
  passwordFocused = false;
  rememberMe = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
goToForgotPassword(): void {
  this.router.navigate(['/forgot-password']);
}
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const request: AuthenticationRequest = this.loginForm.value;

    this.authService.login(request).subscribe({
      next: (response) => {
        const token = response.token;
        localStorage.setItem('access_token', token);

        this.isLoading = false;

        if (this.authService.isAdmin()) {
          this.router.navigate(['/admin']);
        } else if (this.authService.isBusinessAnalyst()) {
          this.router.navigate(['/business-analyst']);
        } else if (this.authService.isUser()) {
          this.router.navigate(['/metier']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Email ou mot de passe incorrect.';
      }
    });
  }
}