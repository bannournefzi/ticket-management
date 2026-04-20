import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GroupService, GroupResponse } from '../../../services/group.service';

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.component.html',
  styleUrls: ['./group-list.component.scss']
})
export class GroupListComponent implements OnInit, OnDestroy {

  groups: GroupResponse[] = [];
  filteredGroups: GroupResponse[] = [];
  isLoading = false;
  searchQuery = '';
  successMessage: string | null = null;
  errorMessage: string | null = null;

  isDeleteModalOpen = false;
  groupToDelete: GroupResponse | null = null;

  currentPage = 1;
  itemsPerPage = 8;
  sumMembers = (acc: number, g: any) => acc + (g.members?.length ?? 0);


  private destroy$ = new Subject<void>();

  constructor(
    private groupService: GroupService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroups(): void {
    this.isLoading = true;
    this.groupService.getAllGroups().pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.groups = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des groupes');
        this.isLoading = false;
      }
    });
  }

  applyFilter(): void {
    const q = this.searchQuery.trim().toLowerCase();
    this.filteredGroups = !q ? [...this.groups] :
      this.groups.filter(g =>
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.createdBy?.toLowerCase().includes(q)
      );
    this.currentPage = 1;
  }

  get paginatedGroups(): GroupResponse[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredGroups.slice(start, start + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredGroups.length / this.itemsPerPage) || 1;
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages;
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
  }

  goToCreate(): void {
    this.router.navigate(['/admin/groups/create']);
  }

  goToDetail(id: number): void {
    this.router.navigate(['/admin/groups', id]);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/admin/groups', id, 'edit']);
  }

  openDeleteModal(group: GroupResponse): void {
    this.groupToDelete = group;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen = false;
    this.groupToDelete = null;
  }

  confirmDelete(): void {
    if (!this.groupToDelete) return;
    this.groupService.deleteGroup(this.groupToDelete.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.showSuccess('Groupe supprimé avec succès');
        this.loadGroups();
        this.closeDeleteModal();
      },
      error: () => this.showError('Erreur lors de la suppression')
    });
  }

  getMemberCount(group: GroupResponse): number {
    return group.members?.length || 0;
  }

  getRoleBadgeClass(role: string): string {
    const map: Record<string, string> = {
      'ROLE_USER': 'badge-user',
      'ROLE_OPERATIONNEL': 'badge-operationnel',
      'ROLE_ADMIN': 'badge-admin',
      'ROLE_BUSINESS_ANALYST': 'badge-it'
    };
    return map[role] || 'badge-default';
  }

  getRoleLabel(role: string): string {
    return role?.replace('ROLE_', '') || '';
  }

  getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
  }

  getTimeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `${m}min`;
    if (h < 24) return `${h}h`;
    if (d < 7) return `${d}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR');
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