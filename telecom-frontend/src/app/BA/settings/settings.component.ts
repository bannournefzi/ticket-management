import { Component, OnInit } from '@angular/core';
import {
  SettingsService,
  SlaConfig,
  CategoryConfig,
  WorkingHoursConfig
} from '../../services/SettingsService';

@Component({
  selector: 'app-ba-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class BaSettingsComponent implements OnInit {

  activeTab: 'sla' | 'categories' | 'hours' = 'sla';

  // SLA
  slaConfigs: SlaConfig[] = [];
  slaEdits: { [key: string]: { resolutionHours: number; firstResponseHours: number } } = {};
  isSavingSla = false;

  // Categories
  categories: CategoryConfig[] = [];
  newCategory = { code: '', label: '', icon: 'fas fa-tag' };
  editingCategoryId: number | null = null;
  editingCategory: Partial<CategoryConfig> = {};
  isSavingCategory = false;

  // Working Hours
  workingHours: WorkingHoursConfig[] = [];
  hoursEdits: { [day: string]: { isWorkingDay: boolean; startTime: string; endTime: string } } = {};
  isSavingHours = false;

  // Messages
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // Icons disponibles pour les catégories
  availableIcons = [
    'fas fa-bug', 'fas fa-lightbulb', 'fas fa-chart-line', 'fas fa-headset',
    'fas fa-book', 'fas fa-ellipsis-h', 'fas fa-network-wired', 'fas fa-shield-alt',
    'fas fa-database', 'fas fa-server', 'fas fa-print', 'fas fa-envelope',
    'fas fa-user-cog', 'fas fa-tools', 'fas fa-globe', 'fas fa-lock'
  ];

  dayLabels: { [key: string]: string } = {
    'MONDAY': 'Lundi', 'TUESDAY': 'Mardi', 'WEDNESDAY': 'Mercredi',
    'THURSDAY': 'Jeudi', 'FRIDAY': 'Vendredi', 'SATURDAY': 'Samedi', 'SUNDAY': 'Dimanche'
  };

  priorityLabels: { [key: string]: string } = {
    'LOW': 'Basse', 'MEDIUM': 'Moyenne', 'HIGH': 'Haute', 'CRITICAL': 'Critique'
  };

  priorityIcons: { [key: string]: string } = {
    'LOW': 'fas fa-arrow-down', 'MEDIUM': 'fas fa-equals',
    'HIGH': 'fas fa-arrow-up', 'CRITICAL': 'fas fa-fire'
  };

  constructor(private settingsService: SettingsService) {}

  ngOnInit(): void {
    this.loadSla();
    this.loadCategories();
    this.loadWorkingHours();
  }

  // ══════════════════════════════════════════
  //  SLA
  // ══════════════════════════════════════════

  loadSla(): void {
    this.settingsService.getAllSla().subscribe({
      next: (data) => {
        this.slaConfigs = data;
        this.slaEdits = {};
        data.forEach(c => {
          this.slaEdits[c.priorityLevel] = {
            resolutionHours: c.resolutionHours,
            firstResponseHours: c.firstResponseHours
          };
        });
      },
      error: () => this.showError('Erreur lors du chargement des SLA')
    });
  }

  saveSla(): void {
    this.isSavingSla = true;
    const configs = Object.entries(this.slaEdits).map(([level, val]) => ({
      priorityLevel: level,
      resolutionHours: val.resolutionHours,
      firstResponseHours: val.firstResponseHours
    }));

    this.settingsService.updateAllSla(configs).subscribe({
      next: (data) => {
        this.slaConfigs = data;
        this.isSavingSla = false;
        this.showSuccess('Configuration SLA mise à jour');
      },
      error: () => { this.isSavingSla = false; this.showError('Erreur lors de la sauvegarde'); }
    });
  }

  hasSlaChanges(): boolean {
    return this.slaConfigs.some(c =>
      this.slaEdits[c.priorityLevel]?.resolutionHours !== c.resolutionHours ||
      this.slaEdits[c.priorityLevel]?.firstResponseHours !== c.firstResponseHours
    );
  }

  // ══════════════════════════════════════════
  //  CATEGORIES
  // ══════════════════════════════════════════

  loadCategories(): void {
    this.settingsService.getAllCategories().subscribe({
      next: (data) => this.categories = data,
      error: () => this.showError('Erreur lors du chargement des catégories')
    });
  }

  addCategory(): void {
    if (!this.newCategory.code.trim() || !this.newCategory.label.trim()) {
      this.showError('Le code et le label sont obligatoires');
      return;
    }
    this.isSavingCategory = true;
    this.settingsService.addCategory({
      code: this.newCategory.code.toUpperCase().replace(/\s+/g, '_'),
      label: this.newCategory.label,
      icon: this.newCategory.icon,
      enabled: true
    }).subscribe({
      next: () => {
        this.newCategory = { code: '', label: '', icon: 'fas fa-tag' };
        this.loadCategories();
        this.isSavingCategory = false;
        this.showSuccess('Catégorie ajoutée');
      },
      error: (err) => { this.isSavingCategory = false; this.showError(err.error?.message || 'Erreur'); }
    });
  }

  startEditCategory(cat: CategoryConfig): void {
    this.editingCategoryId = cat.id;
    this.editingCategory = { label: cat.label, icon: cat.icon };
  }

  saveEditCategory(): void {
    if (this.editingCategoryId === null) return;
    this.settingsService.updateCategory(this.editingCategoryId, this.editingCategory).subscribe({
      next: () => {
        this.editingCategoryId = null;
        this.loadCategories();
        this.showSuccess('Catégorie modifiée');
      },
      error: () => this.showError('Erreur lors de la modification')
    });
  }

  cancelEditCategory(): void {
    this.editingCategoryId = null;
  }

  toggleCategory(cat: CategoryConfig): void {
    this.settingsService.toggleCategory(cat.id).subscribe({
      next: () => {
        cat.enabled = !cat.enabled;
        this.showSuccess(`Catégorie "${cat.label}" ${cat.enabled ? 'activée' : 'désactivée'}`);
      },
      error: () => this.showError('Erreur')
    });
  }

  deleteCategory(cat: CategoryConfig): void {
    if (!confirm(`Supprimer la catégorie "${cat.label}" ?`)) return;
    this.settingsService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.loadCategories();
        this.showSuccess('Catégorie supprimée');
      },
      error: () => this.showError('Erreur lors de la suppression')
    });
  }

  // ══════════════════════════════════════════
  //  WORKING HOURS
  // ══════════════════════════════════════════

  loadWorkingHours(): void {
    this.settingsService.getAllWorkingHours().subscribe({
      next: (data) => {
        this.workingHours = data;
        this.hoursEdits = {};
        data.forEach(wh => {
          this.hoursEdits[wh.dayOfWeek] = {
            isWorkingDay: wh.isWorkingDay,
            startTime: wh.startTime || '08:00',
            endTime: wh.endTime || '17:00'
          };
        });
      },
      error: () => this.showError('Erreur lors du chargement des horaires')
    });
  }

  saveWorkingHours(): void {
    this.isSavingHours = true;
    const configs = Object.entries(this.hoursEdits).map(([day, val]) => ({
      dayOfWeek: day,
      isWorkingDay: val.isWorkingDay,
      startTime: val.startTime,
      endTime: val.endTime
    }));

    this.settingsService.updateAllWorkingHours(configs).subscribe({
      next: (data) => {
        this.workingHours = data;
        this.isSavingHours = false;
        this.showSuccess('Horaires de travail mis à jour');
      },
      error: () => { this.isSavingHours = false; this.showError('Erreur'); }
    });
  }

  getWorkingHoursPerWeek(): number {
    return Object.values(this.hoursEdits).reduce((total, day) => {
      if (!day.isWorkingDay) return total;
      const start = this.timeToMinutes(day.startTime);
      const end = this.timeToMinutes(day.endTime);
      return total + (end - start) / 60;
    }, 0);
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  // ══════════════════════════════════════════
  //  MESSAGES
  // ══════════════════════════════════════════

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 4000);
  }

  private showError(msg: string): void {
    this.errorMessage = msg;
    setTimeout(() => this.errorMessage = null, 4000);
  }
}