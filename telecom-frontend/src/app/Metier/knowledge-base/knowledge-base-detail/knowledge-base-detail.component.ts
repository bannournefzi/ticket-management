import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { AuthService } from '../../../auth/service/auth.service';
import { KnowledgeBaseArticle, ARTICLE_CATEGORIES } from '../../../models/knowledge-base.model';

@Component({
  selector: 'app-knowledge-base-detail',
  templateUrl: './knowledge-base-detail.component.html',
  styleUrls: ['./knowledge-base-detail.component.scss']
})
export class KnowledgeBaseDetailComponent implements OnInit {
  article!: KnowledgeBaseArticle;
  relatedArticles: KnowledgeBaseArticle[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  hasRated = false;
  ratingMessage: string | null = null;
  categories = ARTICLE_CATEGORIES;

  constructor(
    private kbService: KnowledgeBaseService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadArticle(+id);
    }
  }

  loadArticle(id: number): void {
    this.isLoading = true;
    this.kbService.getArticleById(id).subscribe({
      next: (data) => {
        this.article = data;
        this.loadRelated(data.category);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Article introuvable';
        this.isLoading = false;
      }
    });
  }

  loadRelated(category: string | undefined): void {
    if (!category) { this.relatedArticles = []; return; }
    this.kbService.getArticlesByCategory(category).subscribe({
      next: (data) => {
        this.relatedArticles = data.filter(a => a.id !== this.article.id).slice(0, 3);
      },
      error: () => { this.relatedArticles = []; }
    });
  }

  rateArticle(helpful: boolean): void {
    if (this.hasRated) return;
    this.kbService.rateArticle(this.article.id, { helpful }).subscribe({
      next: (updated) => {
        this.article = updated;
        this.hasRated = true;
        this.ratingMessage = helpful ? 'Merci pour votre retour !' : 'Merci, nous allons améliorer cet article.';
        setTimeout(() => this.ratingMessage = null, 3000);
      },
      error: () => {}
    });
  }

  back(): void {
    this.router.navigate(['/knowledge-base']);
  }

  viewArticle(article: KnowledgeBaseArticle): void {
    this.router.navigate(['/knowledge-base', article.id]);
  }

  getCategoryLabel(value: string | undefined): string {
    return this.categories.find(c => c.value === value)?.label || 'Non classé';
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

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
