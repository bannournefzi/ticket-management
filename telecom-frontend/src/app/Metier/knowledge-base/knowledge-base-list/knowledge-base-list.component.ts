import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { AuthService } from '../../../auth/service/auth.service';
import { KnowledgeBaseArticle } from '../../../models/knowledge-base.model';

@Component({
  selector: 'app-knowledge-base-list',
  templateUrl: './knowledge-base-list.component.html',
  styleUrls: ['./knowledge-base-list.component.scss']
})
export class KnowledgeBaseListComponent implements OnInit {
  articles: KnowledgeBaseArticle[] = [];
  filteredArticles: KnowledgeBaseArticle[] = [];
  isLoading = false;
  searchQuery = '';
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private kbService: KnowledgeBaseService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadArticles();
  }

  isUserBA(): boolean {
    return this.authService.isBusinessAnalyst();
  }

  loadArticles(): void {
    this.isLoading = true;
    this.kbService.getAllArticles().subscribe({
      next: (data) => {
        this.articles = data;
        this.filteredArticles = data;
        this.isLoading = false;
      },
      error: () => {
        this.showError('Erreur lors du chargement des articles');
        this.isLoading = false;
      }
    });
  }

  deleteArticle(article: KnowledgeBaseArticle): void {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'article "${article.title}" ?`)) {
      return;
    }
    
    this.kbService.deleteArticle(article.id).subscribe({
      next: () => {
        this.showSuccess('Article supprimé avec succès');
        this.loadArticles();
      },
      error: (err) => {
        this.showError(err.error?.message || 'Erreur lors de la suppression');
      }
    });
  }

  search(): void {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredArticles = this.articles;
      return;
    }
    this.filteredArticles = this.articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q)
    );
  }

  viewArticle(article: KnowledgeBaseArticle): void {
    this.router.navigate(['/knowledge-base', article.id]);
  }

  getTimeAgo(dateStr: string): string {
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