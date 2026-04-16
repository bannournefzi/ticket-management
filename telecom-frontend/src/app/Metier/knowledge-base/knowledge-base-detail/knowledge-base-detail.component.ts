import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { KnowledgeBaseService } from '../../../services/knowledge-base.service';
import { KnowledgeBaseArticle } from '../../../models/knowledge-base.model';

@Component({
  selector: 'app-knowledge-base-detail',
  templateUrl: './knowledge-base-detail.component.html',
  styleUrls: ['./knowledge-base-detail.component.scss']
})
export class KnowledgeBaseDetailComponent implements OnInit {
article!: KnowledgeBaseArticle;
  isLoading = true;
  errorMessage: string | null = null;

  constructor(
    private kbService: KnowledgeBaseService,
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
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Article introuvable';
        this.isLoading = false;
      }
    });
  }

  back(): void {
    this.router.navigate(['/knowledge-base']);
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
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}