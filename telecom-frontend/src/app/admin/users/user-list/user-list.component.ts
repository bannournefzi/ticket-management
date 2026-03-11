import { Component, OnInit } from '@angular/core';
import { AdminService, UserDTO, UserStatsDTO, CreateUserRequest, UpdateUserRequest } from '../../../services/admin.service';
import { PhotoService } from 'src/app/services/PhotoService';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {

  userPhotos: Map<number, string> = new Map();
  users: UserDTO[] = [];
  filteredUsers: UserDTO[] = [];
  stats: UserStatsDTO | null = null;

  searchQuery = '';
  selectedRole = '';
  selectedStatus = '';
  selectedDepartement = '';

  currentPage = 1;
  itemsPerPage = 10;
  isLoading = false;

  successMessage: string | null = null;
  errorMessage: string | null = null;

  // ✅ MODALS - TOUS LES ÉTATS
  isViewModalOpen = false;      // VIEW modal - détails utilisateur
  isEditModalOpen = false;      // EDIT modal - modification
  isCreateModalOpen = false;    // CREATE modal - création
  isDeleteModalOpen = false;    // DELETE modal - confirmation suppression

  selectedUser: UserDTO | null = null;
  editedUser: UserDTO | null = null;
  viewedUser: UserDTO | null = null;    // ✅ NOUVEAU
  userToDelete: UserDTO | null = null;  // ✅ NOUVEAU

  newUser: CreateUserRequest = this.emptyUser();
  showPassword = false;

  Math = Math;
  editedRole: string = '';


  departements = [
    'DME', 'DMFI', 'IT', 'DRC', 'DFR', 'DCF',
    'DMM', 'DRT', 'INFO_CENTRE', 'NOC_DATA',
    'BOM', 'PORTAIL', 'DCWI', 'SERVICE_1200'
  ];

  departementLabels: Record<string, string> = {
    'INFO_CENTRE': 'INFO CENTRE',
    'NOC_DATA': 'NOC DATA',
    'SERVICE_1200': '1200'
  };

  constructor(
    private adminService: AdminService,
    private photoService: PhotoService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadStats();
  }

  private emptyUser(): CreateUserRequest {
    return {
      firstName: '', lastName: '', email: '',
      password: '', phone: '', dateOfBirth: '',
      role: 'ROLE_METIER', departement: undefined
    };
  }

  loadUsers(): void {
    this.isLoading = true;
    this.adminService.getAllUsers().subscribe({
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
loadAllPhotos(): void {
    this.users.forEach(user => {
      this.photoService.hasPhoto(user.id).subscribe({
        next: (exists) => {
          if (exists) {
            this.photoService.getPhotoAsBlob(user.id).subscribe({
              next: (blob) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                  this.userPhotos.set(user.id, e.target?.result as string);
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
  loadStats(): void {
    this.adminService.getUserStats().subscribe({
      next: (data) => this.stats = data,
      error: (err) => console.error('Erreur stats:', err)
    });
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter(user => {
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

  // ── ✅ VIEW MODAL - AFFICHER DÉTAILS ────────────
  openViewModal(user: UserDTO): void {
    this.viewedUser = user;
    this.isViewModalOpen = true;
  }

  closeViewModal(): void {
    this.isViewModalOpen = false;
    this.viewedUser = null;
  }

  // ✅ Helper pour transition VIEW → EDIT
  openViewEditModal(user: UserDTO | null): void {
    if (user) {
      this.openEditModal(user);
      this.closeViewModal();
    }
  }

  // ── EDIT MODAL ──────────────────────────────
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
      departement: user.departement || ''
    };
    this.editedRole = user.roles[0]; 
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
    role: this.editedRole,        // ← CHANGED from this.editedUser.roles[0]
    departement: this.editedUser.departement || undefined
  };
  
    this.adminService.updateUser(this.editedUser.id, request).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) { this.users[index] = updatedUser; this.applyFilters(); this.loadStats(); }
        this.showSuccess('Utilisateur modifié avec succès');
        this.closeEditModal();
      },
      error: (err) => this.showError(err.error?.message || 'Erreur lors de la modification')
    });
  }

  // ── CREATE MODAL ─────────────────────────────
  openCreateModal(): void {
    this.newUser = this.emptyUser();
    this.showPassword = false;
    this.isCreateModalOpen = true;
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  generatePassword(): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%';
    this.newUser.password = Array.from({ length: 12 }, () =>
      chars[Math.floor(Math.random() * chars.length)]).join('');
    this.showPassword = true;
  }

  createUser(): void {
    if (!this.newUser.firstName || !this.newUser.lastName || !this.newUser.email || !this.newUser.password) {
      this.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }
    this.newUser.departement = this.newUser.departement || undefined;
    this.adminService.createUser(this.newUser).subscribe({
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

  // ── ✅ DELETE MODAL ──────────────────────────
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
    this.adminService.deleteUser(this.userToDelete.id).subscribe({
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

  deleteUser(user: UserDTO): void {
    this.openDeleteModal(user);
  }

  // ── TOGGLE STATUS ────────────────────────────
  toggleStatus(user: UserDTO): void {
    this.adminService.toggleUserStatus(user.id).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) { this.users[index] = updatedUser; this.applyFilters(); this.loadStats(); }
        this.showSuccess(`Utilisateur ${updatedUser.enabled ? 'activé' : 'désactivé'}`);
      },
      error: () => this.showError('Erreur lors de la modification du statut')
    });
  }

  // ── EXPORT CSV ───────────────────────────────
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
    a.href = url; a.download = `utilisateurs_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── HELPERS ──────────────────────────────────
  get paginatedUsers(): UserDTO[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  getDeptLabel(dept: string): string {
    return this.departementLabels[dept] || dept;
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      'ROLE_ADMIN': 'badge-admin',
      'ROLE_BUSINESS_ANALYST': 'badge-it',
      'ROLE_METIER': 'badge-metier'
    };
    return map[role] || 'badge-default';
  }

  getRoleLabel(role: string): string {
    return role.replace('ROLE_', '');
  }

  // ✅ Helper pour formater les rôles dans le template
  getFormattedRoles(roles: string[]): string {
    return roles.map(r => this.getRoleLabel(r)).join(', ');
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
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