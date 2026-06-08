import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KnowledgeBaseService } from '../../services/knowledge-base.service';
import { KnowledgeBaseArticle, UpdateArticleRequest, ARTICLE_CATEGORIES } from '../../models/knowledge-base.model';

@Component({
  selector: 'app-ba-knowledge-base',
  templateUrl: './ba-knowledge-base.component.html',
  styleUrls: ['./ba-knowledge-base.component.scss']
})
export class BaKnowledgeBaseComponent implements OnInit {
  articles: KnowledgeBaseArticle[] = [];
  filteredArticles: KnowledgeBaseArticle[] = [];
  isLoading = false;
  searchQuery = '';
  filterCategory = '';

  successMessage: string | null = null;
  errorMessage: string | null = null;

  showEditModal = false;
  editArticle: KnowledgeBaseArticle | null = null;
  editForm: UpdateArticleRequest = { title: '', description: '', solution: '', category: '' };
  isSaving = false;

  categories = ARTICLE_CATEGORIES;

  constructor(
    private kbService: KnowledgeBaseService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadArticles();
  }

  get totalArticles(): number { return this.articles.length; }
  categoryStats: { label: string; count: number }[] = [];

  private updateCategoryStats(): void {
    this.categoryStats = this.categories.map(c => ({
      label: c.label,
      count: this.articles.filter(a => a.category === c.value).length
    })).filter(s => s.count > 0);
  }

  loadArticles(): void {
    this.isLoading = true;
    this.kbService.getAllArticles().subscribe({
      next: (data) => {
        this.articles = data;
        this.filteredArticles = data;
        this.updateCategoryStats();
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des articles');
        this.isLoading = false;
      }
    });
  }

  filter(): void {
    let list = this.articles;
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.solution?.toLowerCase().includes(q)
      );
    }
    if (this.filterCategory) {
      list = list.filter(a => a.category === this.filterCategory);
    }
    this.filteredArticles = list;
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterCategory = '';
    this.filter();
  }

  openEdit(article: KnowledgeBaseArticle): void {
    this.editArticle = article;
    this.editForm = {
      title: article.title,
      description: article.description || '',
      solution: article.solution,
      category: article.category || ''
    };
    this.showEditModal = true;
  }

  closeEdit(): void {
    this.showEditModal = false;
    this.editArticle = null;
  }

  saveEdit(): void {
    if (!this.editArticle) return;
    this.isSaving = true;
    this.kbService.updateArticle(this.editArticle.id, this.editForm).subscribe({
      next: () => {
        this.showSuccess('Article mis à jour avec succès');
        this.isSaving = false;
        this.closeEdit();
        this.loadArticles();
      },
      error: (err) => {
        this.showError(err.error?.message || 'Erreur lors de la mise à jour');
        this.isSaving = false;
      }
    });
  }

  deleteArticle(article: KnowledgeBaseArticle): void {
    if (!confirm(`Supprimer définitivement l'article "${article.title}" ?`)) return;
    this.kbService.deleteArticle(article.id).subscribe({
      next: () => {
        this.showSuccess('Article supprimé');
        this.loadArticles();
      },
      error: (err) => this.showError(err.error?.message || 'Erreur de suppression')
    });
  }

  viewArticle(id: number): void {
    this.router.navigate(['/knowledge-base', id]);
  }

  getCategoryLabel(value: string | undefined): string {
    return this.categories.find(c => c.value === value)?.label || 'Non classé';
  }

  getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (h < 1) return 'Récent';
    if (h < 24) return `${h}h`;
    if (d < 30) return `${d}j`;
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
