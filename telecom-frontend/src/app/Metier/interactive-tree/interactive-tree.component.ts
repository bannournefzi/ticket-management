import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef
} from '@angular/core';
import { Subject, takeUntil, finalize } from 'rxjs';
import { TroubleshootingTreeService, AiAgentResponse } from '../../services/troubleshooting-tree.service';
import { Router } from '@angular/router';

export interface ChatMessage {
  sender: 'USER' | 'IA' | 'SYSTEM';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-interactive-tree',
  templateUrl: './interactive-tree.component.html',
  styleUrls: ['./interactive-tree.component.scss']
})
export class InteractiveTreeComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('scrollMe') private scrollContainer!: ElementRef;

  messages: ChatMessage[] = [];
  currentOptions: string[] = [];
  userInput = '';
  isAiTyping = false;
  isResolved = false;
  hasError = false;
  errorMessage = '';

  // Compteur de tentatives infructueuses (pour affichage)
  private attemptCount = 0;

  // RxJS : destruction propre des subscriptions
  private readonly destroy$ = new Subject<void>();
  private shouldScroll = false;

  constructor(
    private treeService: TroubleshootingTreeService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.addMessage('IA', 'Bonjour ! Je suis votre assistant de diagnostic IT. Quel type de problème rencontrez-vous ?');
    this.currentOptions = [
      '🌐 Problème Réseau / VPN',
      '🔑 Mot de passe / Accès bloqué',
      '💻 Lenteur ou crash du PC',
      '🖨️ Imprimante / Périphérique',
      '📦 Logiciel / Application',
      '❓ Autre problème'
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  // ─── Envoi d'un message ────────────────────────────────────────────────────
  selectOption(option: string): void {
    this.sendMessage(option);
  }

  submitText(): void {
    const trimmed = this.userInput.trim();
    if (trimmed && !this.isAiTyping) {
      this.sendMessage(trimmed);
      this.userInput = '';
    }
  }

  // ─── Logique principale ────────────────────────────────────────────────────
  private sendMessage(text: string): void {
    if (this.isAiTyping) return;

    this.hasError = false;
    this.addMessage('USER', text);
    this.currentOptions = [];
    this.isAiTyping = true;
    this.shouldScroll = true;

    this.treeService.analyzeProblem(text)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isAiTyping = false;
          this.shouldScroll = true;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: AiAgentResponse) => {
          this.handleAiResponse(response);
        },
        error: (err) => {
          this.hasError = true;
          this.errorMessage = err.status === 0
            ? 'Le serveur IA est inaccessible. Vérifiez votre connexion réseau.'
            : err.status >= 500
              ? 'Le serveur IA est surchargé. Veuillez patienter et réessayer.'
              : 'Une erreur inattendue s\'est produite. Veuillez réessayer.';
          this.addMessage('SYSTEM', `⚠️ ${this.errorMessage}`);
        }
      });
  }

  private handleAiResponse(response: AiAgentResponse): void {
    this.addMessage('IA', response.reply);
    this.currentOptions = response.options ?? [];

    switch (response.action) {
      case 'CREATE_TICKET':
        this.attemptCount++;
        this.currentOptions = [];
        this.addMessage('SYSTEM', '📋 Génération du rapport de diagnostic en cours...');
        setTimeout(() => {
          this.router.navigate(['/create-ticket'], {
            queryParams: {
              title: response.ticketData?.title || '',
              description: response.ticketData?.description || this.buildDiagnosticReport(),
              category: response.ticketData?.category || 'SUPPORT',
              priority: response.ticketData?.priority || 'MEDIUM'
            }
          });
        }, 2000);
        break;

      case 'RESOLVED':
        this.currentOptions = [];
        this.isResolved = true;
        this.addMessage('SYSTEM', '✅ Incident résolu. Merci d\'avoir utilisé le diagnostic assisté.');
        break;

      case 'CONTINUE':
      default:
        // Rien à faire, les boutons sont déjà mis à jour
        break;
    }
  }

  // ─── Rapport de diagnostic professionnel ─────────────────────────────────
  buildDiagnosticReport(): string {
    const now = new Date().toLocaleString('fr-FR');
    const conversation = this.messages
      .filter(m => m.sender !== 'SYSTEM')
      .map(m => {
        const role = m.sender === 'USER' ? 'Utilisateur' : 'Technicien IA';
        const time = m.timestamp.toLocaleTimeString('fr-FR');
        return `  [${time}] ${role.padEnd(14)} : ${m.text}`;
      })
      .join('\n');

    return `
=======================================================
   RAPPORT DE DIAGNOSTIC AUTOMATIQUE — NIVEAU 1
=======================================================
Date / Heure     : ${now}
Généré par       : Agent IA Diagnostic (ITSM)
Tentatives N1    : ${this.attemptCount}
Statut           : Escalade N2 requise
-------------------------------------------------------
JOURNAL DE DIAGNOSTIC :

${conversation}
-------------------------------------------------------
CONCLUSION :
Le diagnostic de niveau 1 n'a pas permis de résoudre
l'incident. Une intervention de niveau 2 est nécessaire.
Merci de prendre en charge ce ticket en priorité.
=======================================================
`.trim();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private addMessage(sender: 'USER' | 'IA' | 'SYSTEM', text: string): void {
    this.messages.push({ sender, text, timestamp: new Date() });
    this.shouldScroll = true;
  }

  private scrollToBottom(): void {
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch { /* ignore */ }
  }

  // Utilitaire template
  trackByIndex = (index: number) => index;
}