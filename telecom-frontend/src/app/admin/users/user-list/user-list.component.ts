import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { AdminService, UserDTO, UserStatsDTO, CreateUserRequest, UpdateUserRequest } from '../../../services/admin.service';
import { PhotoService } from 'src/app/services/PhotoService';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit, OnDestroy {

  // Data
  users: UserDTO[] = [];
  filteredUsers: UserDTO[] = [];
  stats: UserStatsDTO | null = null;
  userPhotos: Map<number, string> = new Map();
  mantisUsers: string[] = [];
  mantisUsersMap: { [key: string]: { realName?: string; email?: string; projects?: string[] } } = {};

  // Filters
  searchQuery = '';
  selectedRole = '';
  selectedStatus = '';
  selectedDepartement = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;

  // UI state
  isLoading = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Modals
  isViewModalOpen = false;
  isEditModalOpen = false;
  isCreateModalOpen = false;
  isDeleteModalOpen = false;

  viewedUser: UserDTO | null = null;
  selectedUser: UserDTO | null = null;
  editedUser: UserDTO | null = null;
  userToDelete: UserDTO | null = null;
  editedRole = '';
  showPassword = false;

  newUser: CreateUserRequest = this.emptyUser();

  // Constants
  readonly departements = [
    'DME', 'DMFI', 'IT', 'DRC', 'DFR', 'DCF',
    'DMM', 'DRT', 'INFO_CENTRE', 'NOC_DATA',
    'BOM', 'PORTAIL', 'DCWI', 'SERVICE_1200'
  ];

  private readonly departementLabels: Record<string, string> = {
    'INFO_CENTRE': 'INFO CENTRE',
    'NOC_DATA': 'NOC DATA',
    'SERVICE_1200': '1200'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private adminService: AdminService,
    private photoService: PhotoService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadStats();
    this.loadMantisUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -- Data Loading --

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.users = data;
        this.applyFilters();
        this.isLoading = false;
        this.loadAllPhotos();
      },
      error: () => {
        this.showError('Erreur lors du chargement des utilisateurs');
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.adminService.getUserStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Erreur stats:', err)
    });
  }

  loadMantisUsers(): void {
    this.adminService.getMantisUsersWithDetails().pipe(takeUntil(this.destroy$)).subscribe({
      next: (usersMap) => {
        this.mantisUsersMap = usersMap;
        this.mantisUsers = Object.keys(usersMap);
      },
      error: (err) => console.error('Erreur chargement utilisateurs MantisBT:', err)
    });
  }

  // Load user photos efficiently
  private loadAllPhotos(): void {
    this.userPhotos.clear();
    this.users.forEach(user => {
      this.photoService.hasPhoto(user.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (exists) => {
          if (exists) {
            this.photoService.getPhotoAsBlob(user.id).pipe(takeUntil(this.destroy$)).subscribe({
              next: (blob) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  this.userPhotos.set(user.id, reader.result as string);
                };
                reader.readAsDataURL(blob);
              },
              error: () => {}
            });
          }
        },
        error: () => {}
      });
    });
  }

  // -- Filtering --

  applyFilters(): void {
    const sortedUsers = [...this.users].sort((a, b) => {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return dateB - dateA;
    });

    this.filteredUsers = sortedUsers.filter(user => {
      const q = this.searchQuery.toLowerCase();
      const matchSearch = !q ||
        user.firstName.toLowerCase().includes(q) ||
        user.lastName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);

      const matchRole = !this.selectedRole || user.roles.includes(this.selectedRole);

      const matchStatus = !this.selectedStatus ||
        (this.selectedStatus === 'active' && user.enabled) ||
        (this.selectedStatus === 'inactive' && !user.enabled);

      const matchDept = !this.selectedDepartement ||
        user.departement === this.selectedDepartement;

      return matchSearch && matchRole && matchStatus && matchDept;
    });
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.selectedDepartement = '';
    this.applyFilters();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.selectedRole || this.selectedStatus || this.selectedDepartement);
  }

  // -- Pagination --

  get paginatedUsers(): UserDTO[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage) || 1;
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get pages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // -- View Modal --

  openViewModal(user: UserDTO): void {
  // 1. Essaie de matcher par username MantisBT
  let mantisInfo = user.username ? this.mantisUsersMap[user.username] : null;

  // 2. Fallback : matcher par email si username ne matche pas
  if (!mantisInfo && user.email) {
    mantisInfo = Object.values(this.mantisUsersMap)
      .find(m => m.email === user.email) ?? null;
  }

  this.viewedUser = {
    ...user,
    mantisProjects: mantisInfo?.projects ?? []
  };
  this.isViewModalOpen = true;
}
  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedUser = null;
  }

  // -- Edit Modal --

  openEditModal(user: UserDTO): void {
    this.selectedUser = user;
    this.editedUser = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth || '',
      roles: [...user.roles],
      enabled: user.enabled,
      accountLocked: user.accountLocked || false,
      createdDate: user.createdDate,
      departement: user.departement || '',
      username: user.username || ''
    };
    this.editedRole = user.roles[0] || '';
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.selectedUser = null;
    this.editedUser = null;
    this.editedRole = '';
  }

  saveUserChanges(): void {
    if (!this.editedUser) return;

    const request: UpdateUserRequest = {
      firstName: this.editedUser.firstName,
      lastName: this.editedUser.lastName,
      email: this.editedUser.email,
      phone: this.editedUser.phone,
      dateOfBirth: this.editedUser.dateOfBirth,
      role: this.editedRole,
      departement: this.editedUser.departement || undefined
    };

    this.adminService.updateUser(this.editedUser.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === updatedUser.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
            this.applyFilters();
            this.loadStats();
          }
          this.showSuccess('Utilisateur modifié avec succès');
          this.closeEditModal();
        },
        error: (err) => this.showError(err.error?.message || 'Erreur lors de la modification')
      });
  }

  // -- Create Modal --

  openCreateModal(): void {
    this.newUser = this.emptyUser();
    this.showPassword = false;
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  onRoleChange(): void {
    if (this.newUser.role !== 'ROLE_BUSINESS_ANALYST') {
      this.newUser.username = '';
    }
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
    this.newUser.password = Array.from({ length: 12 }, () =>
      chars[Math.floor(Math.random() * chars.length)]).join('');
    this.showPassword = true;
  }

  onUsernameChange(): void {
    
    const selectedUser: any = this.mantisUsersMap[this.newUser.username]; 
    
    if (selectedUser) {
      if (selectedUser.realName && selectedUser.realName.trim()) {
        this.newUser.firstName = selectedUser.realName.trim();
      } else {
        this.newUser.firstName = this.newUser.username;
      }

      if (selectedUser.email && selectedUser.email.trim()) {
        this.newUser.email = selectedUser.email.trim();
      }

      // Set the first project as the primary project, and store all projects
      if (selectedUser.projects && selectedUser.projects.length > 0) {
        this.newUser.mantisProject = selectedUser.projects[0].trim();
        this.newUser.mantisProjects = [...selectedUser.projects];
      } else {
        this.newUser.mantisProject = 'Non assigné';
        this.newUser.mantisProjects = ['Non assigné'];
      }
    } else {
      this.newUser.firstName = '';
      this.newUser.email = '';
      this.newUser.mantisProject = '';
      this.newUser.mantisProjects = [];
    }
  }

  createUser(): void {
   if (
  !this.newUser.firstName ||
  !this.newUser.email ||
  !this.newUser.password ||
  (this.newUser.role === 'ROLE_BUSINESS_ANALYST' && !this.newUser.username)
) {
  this.showError('Veuillez remplir tous les champs obligatoires');
  return;
}

    this.adminService.createUser(this.newUser)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdUser) => {
          this.users.push(createdUser);
          this.applyFilters();
          this.loadStats();
          this.showSuccess(`Utilisateur créé — email envoyé à ${createdUser.email}`);
          this.closeCreateModal();
        },
        error: (err) => this.showError(err.error?.message || 'Erreur lors de la création')
      });
  }

  // -- Delete Modal --

  openDeleteModal(user: UserDTO): void {
    this.userToDelete = user;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.userToDelete = null;
  }

  confirmDelete(): void {
    if (!this.userToDelete) return;

    this.adminService.deleteUser(this.userToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== this.userToDelete!.id);
          this.applyFilters();
          this.loadStats();
          this.showSuccess('Utilisateur supprimé');
          this.closeDeleteModal();
        },
        error: () => this.showError('Erreur lors de la suppression')
      });
  }

  // -- Actions --

  toggleStatus(user: UserDTO): void {
    this.adminService.toggleUserStatus(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === user.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
            this.applyFilters();
            this.loadStats();
          }
          this.showSuccess(`Utilisateur ${updatedUser.enabled ? 'activé' : 'désactivé'}`);
        },
        error: () => this.showError('Erreur lors de la modification du statut')
      });
  }

  exportCSV(): void {
    const headers = ['ID', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Date naissance', 'Département', 'Rôle', 'Statut', 'Créé le'];
    const rows = this.filteredUsers.map(u => [
      u.id, u.firstName, u.lastName, u.email,
      u.phone || '', u.dateOfBirth || '',
      u.departement || '',
      u.roles.map(r => r.replace('ROLE_', '')).join(', '),
      u.enabled ? 'Actif' : 'Inactif',
      u.createdDate ? new Date(u.createdDate).toLocaleDateString('fr-FR') : ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -- Helpers --

  getDeptLabel(dept: string): string {
    return this.departementLabels[dept] || dept;
  }

  getRoleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    'ROLE_ADMIN': 'badge-admin',
    'ROLE_BUSINESS_ANALYST': 'badge-it',
    'ROLE_USER': 'badge-user',
  };
  return map[role] || 'badge-default';
}


getRoleLabel(role: string): string {
  if (!role) return '';
  return role.replace('ROLE_', '');
}

  getFormattedRoles(roles: string[]): string {
    return roles.map(r => this.getRoleLabel(r)).join(', ');
  }

  getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  }

  getPhotoUrl(userId: number): string | null {
    return this.userPhotos.get(userId) || null;
  }

  trackByUserId(_index: number, user: UserDTO): number {
    return user.id;
  }

  private emptyUser(): CreateUserRequest {
  return {
    username: '',
    firstName: '', lastName: '', email: '',
    password: '', phone: '', dateOfBirth: '',
    role: 'ROLE_USER', departement: undefined,
    mantisProject: '', mantisProjects: []
  };
}

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 4000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 4000);
  }
}
