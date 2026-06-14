import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../service/auth.service';
import { PhotoService } from '../../services/PhotoService';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  activeTab: 'info' | 'password' | 'photo' = 'info';
  isLoadingInfo = false;
  isLoadingPassword = false;
  isLoadingPhoto = false;
  successInfo = false;
  successPassword = false;
  successPhoto = false;
  errorInfo: string | null = null;
  errorPassword: string | null = null;
  errorPhoto: string | null = null;

  fullName = '';
  email = '';
  role = '';
  roleLabel = '';
  initials = '';
  avatarColor = '';
  memberSince = '';
  userId: number = 0;

  departement = '';
  dateOfBirth = '';
  phone = '';

  // Photo
  avatarPreview: string | null = null;
  selectedFile: File | null = null;
  hasExistingPhoto = false;

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  infoForm!: FormGroup;
  passwordForm!: FormGroup;

  departements = [
    'DME', 'DMFI', 'IT', 'DRC', 'DFR', 'DCF',
    'DMM', 'DRT', 'INFO_CENTRE', 'NOC_DATA',
    'BOM', 'PORTAIL', 'DCWI', 'SERVICE_1200'
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private photoService: PhotoService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.initForms();
    this.loadUserFromApi();
    this.loadPhoto();
  }

  loadUserData(): void {
    this.fullName    = this.authService.getFullName() || 'Utilisateur';
    this.email       = this.getEmailFromToken();
    const roles      = this.authService.getUserRoles();
    this.role        = roles[0] || '';
    this.roleLabel   = this.getRoleLabel(this.role);
    this.avatarColor = this.getRoleColor(this.role);
    this.memberSince = this.getMemberSince();
    this.initials    = this.buildInitials(this.fullName);
    try { this.userId = this.authService.getUserId(); } catch {}
  }

  initForms(): void {
    this.infoForm = this.fb.group({
      firstName:    [{ value: '', disabled: true }],
      lastName:     [{ value: '', disabled: true }],
      email:        [{ value: this.email, disabled: true }],
      phone:        [''],
      dateOfBirth:  [''],
      departement:  [{ value: '', disabled: true }],
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  loadUserFromApi(): void {
    if (!this.userId) return;
    this.http.get<any>(`${environment.apiUrl}/admin/users/${this.userId}`)
      .subscribe({
        next: (user) => {
          this.infoForm.patchValue({
            phone:       user.phone       || '',
            dateOfBirth: user.dateOfBirth || '',
            departement: user.departement || '',
          });
          if (user.firstName || user.lastName) {
            this.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            this.initials = this.buildInitials(this.fullName);
          }
          this.departement = user.departement || '';
          this.dateOfBirth = user.dateOfBirth || '';
          this.phone       = user.phone       || '';
        },
        error: () => {
          const p = this.fullName.split(' ');
          this.infoForm.patchValue({ firstName: p[0] || '', lastName: p.slice(1).join(' ') || '' });
        }
      });
  }

  // ── PHOTO (API) ─────────────────────────────
  loadPhoto(): void {
  if (!this.userId) return;
  this.photoService.hasPhoto(this.userId).subscribe({
    next: (exists) => {
      this.hasExistingPhoto = exists;
      if (exists) {
        // ✅ Fetch as blob and convert to base64 so <img> displays correctly
        this.photoService.getPhotoAsBlob(this.userId).subscribe({
          next: (blob) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              this.avatarPreview = e.target?.result as string;
            };
            reader.readAsDataURL(blob);
          },
          error: () => {}
        });
      }
    },
    error: () => {}
  });
}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.errorPhoto = 'La taille maximale est de 5 Mo';
        return;
      }
      if (!file.type.startsWith('image/')) {
        this.errorPhoto = 'Seules les images sont acceptées';
        return;
      }
      this.selectedFile = file;
      this.errorPhoto = null;
      // Preview locale
      const reader = new FileReader();
      reader.onload = (e) => { this.avatarPreview = e.target?.result as string; };
      reader.readAsDataURL(file);
    }
  }

  savePhoto(): void {
  if (!this.selectedFile || !this.userId) return;
  this.isLoadingPhoto = true;
  this.errorPhoto = null;

  this.photoService.uploadPhoto(this.userId, this.selectedFile).subscribe({
    next: () => {
      this.isLoadingPhoto = false;
      this.successPhoto = true;
      this.hasExistingPhoto = true;
      this.selectedFile = null;
      // ✅ avatarPreview already has the base64 from onFileSelected()
      // No need to replace it with the API URL
      setTimeout(() => this.successPhoto = false, 4000);
    },
    error: (err) => {
      this.isLoadingPhoto = false;
      this.errorPhoto = err.error || 'Erreur lors de l\'upload';
    }
  });
}

  removePhoto(): void {
    if (!this.userId) return;
    this.photoService.deletePhoto(this.userId).subscribe({
      next: () => {
        this.avatarPreview = null;
        this.selectedFile = null;
        this.hasExistingPhoto = false;
        this.successPhoto = true;
        setTimeout(() => this.successPhoto = false, 3000);
      },
      error: () => { this.errorPhoto = 'Erreur lors de la suppression'; }
    });
  }

  // ── INFO SUBMIT ─────────────────────────────
  onSubmitInfo(): void {
    if (this.infoForm.invalid) { this.infoForm.markAllAsTouched(); return; }
    this.isLoadingInfo = true;
    this.errorInfo = null;

    const body = {
      email:       this.email,
      phone:       this.infoForm.value.phone       || '',
      dateOfBirth: this.infoForm.value.dateOfBirth  || null,
      role:        this.role,
    };

    this.http.put<any>(`${environment.apiUrl}/admin/users/${this.userId}`, body)
      .subscribe({
        next: () => {
          this.isLoadingInfo = false;
          this.successInfo = true;
          this.dateOfBirth = body.dateOfBirth || '';
          this.phone       = body.phone       || '';
          setTimeout(() => this.successInfo = false, 4000);
        },
        error: (err) => {
          this.isLoadingInfo = false;
          this.errorInfo = err.error?.message || 'Erreur lors de la mise à jour.';
        }
      });
  }

  // ── PASSWORD SUBMIT ─────────────────────────
  onSubmitPassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    this.isLoadingPassword = true;
    this.errorPassword = null;

    this.authService.changePassword(
      this.passwordForm.value.currentPassword,
      this.passwordForm.value.newPassword,
      this.passwordForm.value.confirmPassword
    ).subscribe({
      next: () => {
        this.isLoadingPassword = false;
        this.successPassword = true;
        this.passwordForm.reset();
        this.authService.clearMustChangePassword();
        setTimeout(() => this.successPassword = false, 5000);
      },
      error: (err) => {
        this.isLoadingPassword = false;
        this.errorPassword = err.error?.message || 'Une erreur est survenue.';
      }
    });
  }

  // ── HELPERS ─────────────────────────────────
  buildForms(): void { this.loadUserFromApi(); }

  getEmailFromToken(): string {
    try { return JSON.parse(atob(localStorage.getItem('access_token')!.split('.')[1])).sub || ''; }
    catch { return ''; }
  }

  getMemberSince(): string {
    try {
      const iat = JSON.parse(atob(localStorage.getItem('access_token')!.split('.')[1])).iat;
      return new Date(iat * 1000).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return ''; }
  }

  buildInitials(name: string): string {
    if (!name) return 'U';
    const p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  getDepartementLabel(dept: string): string {
    const labels: Record<string, string> = { 'INFO_CENTRE': 'Info Centre', 'NOC_DATA': 'NOC Data', 'SERVICE_1200': 'Service 1200' };
    return labels[dept] || dept;
  }

  getRoleLabel(r: string): string {
    return ({ ROLE_ADMIN: 'Administrateur', ROLE_BUSINESS_ANALYST: 'Business Analyst', ROLE_USER: 'Utilisateur' } as any)[r] || 'Utilisateur';
  }

  getRoleColor(r: string): string {
    return ({ ROLE_ADMIN: '#374151', ROLE_BUSINESS_ANALYST: '#2563eb', ROLE_USER: '#059669' } as any)[r] || '#6b7280';
  }

  getRoleBadgeClass(): string {
    return ({ ROLE_ADMIN: 'badge-admin', ROLE_BUSINESS_ANALYST: 'badge-ba', ROLE_USER: 'badge-user' } as any)[this.role] || '';
  }

  hasUpperCase(v: string): boolean   { return /[A-Z]/.test(v || ''); }
  hasNumber(v: string): boolean      { return /[0-9]/.test(v || ''); }
  hasSpecialChar(v: string): boolean { return /[^A-Za-z0-9]/.test(v || ''); }

  get passwordStrength(): number {
    const p = this.passwordForm.value.newPassword || '';
    return [p.length >= 8, this.hasUpperCase(p), this.hasNumber(p), this.hasSpecialChar(p)].filter(Boolean).length;
  }

  get strengthLabel(): string { return ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][this.passwordStrength] || ''; }
  get strengthClass(): string { return ['', 'weak', 'medium', 'strong', 'very-strong'][this.passwordStrength] || ''; }
  get strengthWidth(): number { return this.passwordStrength * 25; }
}