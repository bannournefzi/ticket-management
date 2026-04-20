import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GroupService, GroupResponse, UserSummary } from '../../../services/group.service';


@Component({
  selector: 'app-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss']
})
export class GroupDetailComponent implements OnInit, OnDestroy {

  group: GroupResponse | null = null;
  availableUsers: UserSummary[] = [];
  filteredAvailable: UserSummary[] = [];
  selectedUserIds: Set<number> = new Set();

  isLoading = false;
  isModalOpen = false;
  isAdding = false;
  searchMembers = '';
  searchAvailable = '';
  roleFilter = '';
  successMessage: string | null = null;
  errorMessage: string | null = null;

  removeConfirmUserId: number | null = null;

  private destroy$ = new Subject<void>();
  private groupId!: number;

  constructor(
    private groupService: GroupService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/admin/groups']); return; }
    this.groupId = +id;
    this.loadGroup();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroup(): void {
    this.isLoading = true;
    this.groupService.getGroupById(this.groupId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => { this.group = data; this.isLoading = false; },
      error: () => { this.showError('Groupe introuvable'); this.isLoading = false; }
    });
  }

  // ─── Members filter ────────────────────────────────────────────────────────

  get filteredMembers(): UserSummary[] {
    if (!this.group?.members) return [];
    const q = this.searchMembers.toLowerCase();
    return this.group.members.filter(m =>
      !q || m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }

  // ─── Add member modal ─────────────────────────────────────────────────────

  openAddModal(): void {
    this.selectedUserIds.clear();
    this.searchAvailable = '';
    this.roleFilter = '';
    this.isModalOpen = true;
    this.loadAvailableUsers();
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedUserIds.clear();
  }

  loadAvailableUsers(): void {
    this.groupService.getAvailableUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (users) => {
        const memberIds = new Set(this.group?.members?.map(m => m.id) || []);
        this.availableUsers = users.filter(u => !memberIds.has(u.id));
        this.applyAvailableFilter();
      },
      error: () => this.showError('Erreur chargement utilisateurs')
    });
  }

  applyAvailableFilter(): void {
    const q = this.searchAvailable.toLowerCase();
    this.filteredAvailable = this.availableUsers.filter(u => {
      const matchSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole = !this.roleFilter || u.roles.includes(this.roleFilter);
      return matchSearch && matchRole;
    });
  }

  toggleSelect(id: number): void {
    this.selectedUserIds.has(id) ? this.selectedUserIds.delete(id) : this.selectedUserIds.add(id);
  }

  isSelected(id: number): boolean {
    return this.selectedUserIds.has(id);
  }

  addSelectedMembers(): void {
    if (this.selectedUserIds.size === 0) return;
    this.isAdding = true;
    const ids = Array.from(this.selectedUserIds);
    let done = 0;

    ids.forEach(userId => {
      this.groupService.addMember(this.groupId, userId).pipe(takeUntil(this.destroy$)).subscribe({
        next: (updatedGroup) => {
          done++;
          this.group = updatedGroup;
          if (done === ids.length) {
            this.isAdding = false;
            this.closeModal();
            this.showSuccess(`${ids.length} membre(s) ajouté(s) avec succès`);
          }
        },
        error: () => {
          done++;
          if (done === ids.length) { this.isAdding = false; this.closeModal(); }
        }
      });
    });
  }

  // ─── Remove member ────────────────────────────────────────────────────────

  confirmRemove(userId: number): void {
    this.removeConfirmUserId = userId;
  }

  cancelRemove(): void {
    this.removeConfirmUserId = null;
  }

  removeMember(userId: number): void {
    this.groupService.removeMember(this.groupId, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updatedGroup) => {
        this.group = updatedGroup;
        this.removeConfirmUserId = null;
        this.showSuccess('Membre retiré du groupe');
      },
      error: () => this.showError('Erreur lors du retrait')
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getRoleBadgeClass(role: string): string {
  const map: Record<string, string> = {
    'ROLE_USER': 'badge-user',
    'ROLE_ADMIN': 'badge-admin',
    'ROLE_BUSINESS_ANALYST': 'badge-it'
  };
  return map[role] || 'badge-default';
}

  getRoleLabel(role: string): string {
    return role?.replace('ROLE_', '') || '';
  }

  getInitials(fullName: string): string {
    const parts = (fullName || '').split(' ');
    return `${(parts[0] || '').charAt(0)}${(parts[1] || '').charAt(0)}`.toUpperCase();
  }

  goBack(): void { this.router.navigate(['/admin/groups']); }
  goToEdit(): void { this.router.navigate(['/admin/groups', this.groupId, 'edit']); }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 4000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 4000);
  }
}