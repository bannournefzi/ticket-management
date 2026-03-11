import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AuthService } from '../../auth/service/auth.service';
import { Router } from '@angular/router';
import { RegistrationRequest } from '../../models/auth.model';



@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Pour afficher/masquer les mots de passe
  showPassword = false;
  showConfirmPassword = false;

  // Pour gérer l’indicateur de force du mot de passe
  passwordStrength = 0;

  // Chargement
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      phone: [''],
      emailNotifications: [false],
      smsNotifications: [false],
      acceptTerms: [false, Validators.requiredTrue],
      acceptMarketing: [false],
      role: ['ROLE_METIER', Validators.required],
    }, { validators: this.matchPasswords });
  }

  ngOnInit(): void {
    localStorage.removeItem('token'); // Supprimer un token potentiellement expiré

    // Mise à jour de la force du mot de passe
    this.registerForm.get('password')?.valueChanges.subscribe(password => {
      this.passwordStrength = this.calculatePasswordStrength(password);
    });
  }

  // Valider le formulaire
  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    const formValue = this.registerForm.value;

    const request: RegistrationRequest = {
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      email: formValue.email,
      password: formValue.password,
      dateOfBirth: formValue.dateOfBirth,
      role: formValue.role
    };

    this.authService.register(request).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/validate-account']);
        this.registerForm.reset();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Erreur lors de l’inscription.';
        console.error(err);
      }
    });
  }

  // Toggle affichage mot de passe
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Calculer la force du mot de passe
  private calculatePasswordStrength(password: string): number {
    let strength = 0;
    if (!password) return strength;

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[\W_]/.test(password)) strength++;

    return Math.min(strength, 4);
  }

  // Obtenir une classe CSS selon la force
  getPasswordStrengthClass(level: number): string {
    return this.passwordStrength >= level ? 'strength-bar active' : 'strength-bar';
  }

  // Texte selon la force
  getPasswordStrengthText(): string {
    switch (this.passwordStrength) {
      case 1: return 'Faible';
      case 2: return 'Moyen';
      case 3: return 'Bon';
      case 4: return 'Excellent';
      default: return 'Trop court';
    }
  }

  // Vérification des mots de passe
  matchPasswords(group: AbstractControl): void | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;

    if (password !== confirm) {
      group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    } else {
      const errors = group.get('confirmPassword')?.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        if (Object.keys(errors).length === 0) {
          group.get('confirmPassword')?.setErrors(null);
        }
      }
    }
  }

  // Connexion sociale (à implémenter)
  signUpWithGoogle(): void {
    console.log('Sign up with Google clicked');
  }

  signUpWithFacebook(): void {
    console.log('Sign up with Facebook clicked');
  }
}
