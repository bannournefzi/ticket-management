import {
  Component,
  OnInit,
  OnDestroy
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
export class InteractiveTreeComponent implements OnInit, OnDestroy {

  messages: ChatMessage[] = [];
  currentOptions: string[] = [];
  userInput = '';
  isAiTyping = false;
  isResolved = false;
  hasError = false;
  errorMessage = '';

  // Scanner state
  progressPercent = 0;
  currentStep = 0;
  maxSteps = 8;
  elapsedTime = '00:00';
  detectedCategory = '';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  symptomLog: string[] = [];
  isScanning = false;
  currentStepTitle = 'Initialisation du diagnostic';
  showScannerResult = false;
  scannerResultAction: 'RESOLVED' | 'CREATE_TICKET' | null = null;

  attemptCount = 0;
  private readonly destroy$ = new Subject<void>();
  private timerInterval: any = null;
  private scanStartTime = 0;
  private tickSeconds = 0;

  constructor(
    private treeService: TroubleshootingTreeService,
    private router: Router
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
    this.currentStepTitle = 'Sélectionnez la catégorie du problème';
    this.currentStep = 1;
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
  }

  private startTimer(): void {
    this.scanStartTime = Date.now();
    this.tickSeconds = 0;
    this.timerInterval = setInterval(() => {
      this.tickSeconds++;
      this.elapsedTime = this.formatTime(this.tickSeconds);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private formatTime(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private detectCategory(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('réseau') || lower.includes('vpn') || lower.includes('connexion') || lower.includes('wifi') || lower.includes('ping')) return 'Réseau';
    if (lower.includes('mot de passe') || lower.includes('mdp') || lower.includes('accès') || lower.includes('bloqué') || lower.includes('login')) return 'Accès';
    if (lower.includes('lenteur') || lower.includes('crash') || lower.includes('pc') || lower.includes('ralenti') || lower.includes('freeze')) return 'Performance';
    if (lower.includes('imprimante') || lower.includes('périphérique') || lower.includes('scan') || lower.includes('impression')) return 'Périphérique';
    if (lower.includes('logiciel') || lower.includes('application') || lower.includes('bug') || lower.includes('erreur') || lower.includes('plante')) return 'Logiciel';
    return 'Général';
  }

  private detectSeverity(text: string, reply: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const combined = (text + ' ' + reply).toLowerCase();
    if (combined.includes('critique') || combined.includes('bloquant') || combined.includes('urgence') || combined.includes('plus rien')) return 'CRITICAL';
    if (combined.includes('urgent') || combined.includes('important') || combined.includes('impossible') || combined.includes('bloqué') || combined.includes('plus accès')) return 'HIGH';
    if (combined.includes('mineur') || combined.includes('léger') || combined.includes('peu') || combined.includes('parfois')) return 'LOW';
    return 'MEDIUM';
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
    this.isScanning = true;

    // Scanner state updates
    this.currentStep = Math.min(this.currentStep + 1, this.maxSteps);
    this.progressPercent = Math.min(95, this.progressPercent + 12);
    this.symptomLog.push(text);
    if (!this.detectedCategory) {
      this.detectedCategory = this.detectCategory(text);
    }

    this.treeService.analyzeProblem(text)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isAiTyping = false;
          this.isScanning = false;
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
    this.currentStepTitle = `VÉRIFICATION #${this.currentStep}`;

    // Update severity based on AI response
    this.severity = this.detectSeverity(
      this.symptomLog[this.symptomLog.length - 1] || '',
      response.reply
    );

    // Extract category from ticketData if present
    if (response.ticketData?.category && !this.detectedCategory) {
      const catMap: Record<string, string> = {
        'BUG': 'Logiciel',
        'FEATURE_REQUEST': 'Fonctionnalité',
        'IMPROVEMENT': 'Amélioration',
        'SUPPORT': 'Général',
        'DOCUMENTATION': 'Documentation',
        'OTHER': 'Autre'
      };
      this.detectedCategory = catMap[response.ticketData.category] || 'Général';
    }

    switch (response.action) {
      case 'CREATE_TICKET':
        this.attemptCount++;
        this.currentOptions = [];
        this.progressPercent = 100;
        this.showScannerResult = true;
        this.scannerResultAction = 'CREATE_TICKET';
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
        this.progressPercent = 100;
        this.showScannerResult = true;
        this.scannerResultAction = 'RESOLVED';
        this.addMessage('SYSTEM', '✅ Incident résolu. Merci d\'avoir utilisé le diagnostic assisté.');
        break;

      case 'CONTINUE':
      default:
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
Catégorie        : ${this.detectedCategory}
Sévérité         : ${this.severity}
Durée            : ${this.elapsedTime}
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
  }

  trackByIndex = (index: number) => index;

  getSeverityIcon(sev: string): string {
    const icons: Record<string, string> = { 'LOW': 'fa-arrow-down', 'MEDIUM': 'fa-equals', 'HIGH': 'fa-arrow-up', 'CRITICAL': 'fa-fire' };
    return icons[sev] || 'fa-minus';
  }

  getSeverityLabel(sev: string): string {
    const labels: Record<string, string> = { 'LOW': 'Faible', 'MEDIUM': 'Moyenne', 'HIGH': 'Élevée', 'CRITICAL': 'Critique' };
    return labels[sev] || 'Moyenne';
  }

  getStepIcon(index: number): string {
    if (index < this.currentStep) return 'fas fa-check-circle';
    if (index === this.currentStep) return 'fas fa-spinner fa-pulse';
    return 'fas fa-circle-notch';
  }

  getStepClass(index: number): string {
    if (index < this.currentStep) return 'step--done';
    if (index === this.currentStep) return 'step--active';
    return 'step--pending';
  }

  resetDiagnostic(): void {
    this.messages = [];
    this.currentOptions = [];
    this.userInput = '';
    this.isAiTyping = false;
    this.isResolved = false;
    this.hasError = false;
    this.errorMessage = '';
    this.progressPercent = 0;
    this.currentStep = 0;
    this.elapsedTime = '00:00';
    this.detectedCategory = '';
    this.severity = 'MEDIUM';
    this.symptomLog = [];
    this.isScanning = false;
    this.currentStepTitle = 'Redémarrage...';
    this.showScannerResult = false;
    this.scannerResultAction = null;
    this.attemptCount = 0;
    this.tickSeconds = 0;
    this.stopTimer();
    this.ngOnInit();
  }
}
