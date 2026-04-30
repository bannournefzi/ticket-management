import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { TroubleshootingTreeService } from '../../services/troubleshooting-tree.service';
import { TroubleshootingTree, TreeNode, TreeOption } from '../../models/troubleshooting-tree.model';

type ComponentState = 'idle' | 'scanning' | 'navigating' | 'resolved' | 'needs-ticket';

interface DiagnosticStep {
  question: string;
  answer: string;
}

interface ScanStep {
  label: string;
  detail: string;
  duration: number; // durée de la barre de progression en ms
}

@Component({
  selector: 'app-interactive-tree',
  templateUrl: './interactive-tree.component.html',
  styleUrls: ['./interactive-tree.component.scss']
})
export class InteractiveTreeComponent implements OnDestroy {

  // ── State machine ──────────────────────────────────────────────────────────
  state: ComponentState = 'idle';
  userProblem = '';

  // ── Arbre ──────────────────────────────────────────────────────────────────
  currentTree: TroubleshootingTree | null = null;
  private currentNodeId: string | null = null;
  diagnosticHistory: DiagnosticStep[] = [];

  // ── Scan animation ─────────────────────────────────────────────────────────
  readonly scanSteps: ScanStep[] = [
    { label: 'Analyse de la description',         detail: 'Traitement du langage naturel…',     duration: 900 },
    { label: 'Identification du contexte IT',      detail: 'Classification du type de problème…', duration: 800 },
    { label: 'Recherche de procédure adaptée',     detail: 'Correspondance dans la base de données…', duration: 950 },
    { label: 'Chargement de l\'arbre de décision', detail: 'Préparation du guide interactif…',   duration: 700 },
  ];
  activeScanStep = 0;

  // ── Coordination API / animation ───────────────────────────────────────────
  private _scanDone = false;
  private _pendingTreeId: string | null = null;
  private _apiError = false;

  private subscriptions = new Subscription();
  private scanTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(
    private readonly treeService: TroubleshootingTreeService,
    private readonly router: Router
  ) {}

  // ── Getters ────────────────────────────────────────────────────────────────

  get currentNode(): TreeNode | null {
    if (!this.currentTree || !this.currentNodeId) return null;
    return this.currentTree.treeJsonContent.nodes[this.currentNodeId] ?? null;
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  submitProblem(): void {
    const problem = this.userProblem.trim();
    if (!problem) return;

    this._clearDiagnosticData();
    this.state = 'scanning';
    this.activeScanStep = 0;
    this._scanDone = false;
    this._pendingTreeId = null;
    this._apiError = false;

    this._startScanAnimation();
    this._callAnalyzeApi(problem);
  }

  selectOption(option: TreeOption): void {
    if (!this.currentNode) return;

    this.diagnosticHistory.push({
      question: this.currentNode.text,
      answer: option.label
    });

    if (option.next) {
      this.currentNodeId = option.next;
    } else if (option.action === 'RESOLVED') {
      this.state = 'resolved';
    } else if (option.action === 'CREATE_TICKET') {
      this.state = 'needs-ticket';
    }
  }

  resetState(): void {
    this._clearScanTimers();
    this.state = 'idle';
    this._clearDiagnosticData();
    this.userProblem = '';
  }

  goToCreateTicket(): void {
    this.router.navigate(['/create-ticket'], {
      state: {
        aiDescription: this._buildTechnicalSummary(),
        aiCategory: this.currentTree?.title ?? 'Diagnostic Général'
      }
    });
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this._clearScanTimers();
    this.subscriptions.unsubscribe();
  }

  // ── Privé : Animation de scan ──────────────────────────────────────────────

  private _startScanAnimation(): void {
    let elapsed = 0;

    this.scanSteps.forEach((step, i) => {
      const t = setTimeout(() => {
        this.activeScanStep = i;
      }, elapsed);
      this.scanTimers.push(t);
      elapsed += step.duration + 300; // durée barre + délai transition
    });

    // Toutes les étapes terminées
    const doneTimer = setTimeout(() => {
      this.activeScanStep = this.scanSteps.length; // force all done
      this._scanDone = true;
      this._resolveScanIfReady();
    }, elapsed);

    this.scanTimers.push(doneTimer);
  }

  private _resolveScanIfReady(): void {
    if (!this._scanDone) return;

    if (this._apiError) {
      this.state = 'needs-ticket';
      return;
    }

    if (this._pendingTreeId !== null) {
      if (this._pendingTreeId === 'UNKNOWN') {
        this.state = 'needs-ticket';
      } else {
        this._loadTree(this._pendingTreeId);
      }
    }
    // Si l'API n'a pas encore répondu → on attend (l'animation s'arrête sur la
    // dernière étape, le spinner reste visible jusqu'à la réponse API)
  }

  // ── Privé : Appel API ──────────────────────────────────────────────────────

  private _callAnalyzeApi(problem: string): void {
    const sub = this.treeService.analyzeProblem(problem).subscribe({
      next: (response) => {
        this._pendingTreeId = response.treeId;
        this._resolveScanIfReady();
      },
      error: (err) => {
        console.error('[InteractiveTree] Analyse échouée :', err);
        this._apiError = true;
        this._resolveScanIfReady();
      }
    });

    this.subscriptions.add(sub);
  }

  private _loadTree(treeId: string): void {
    const sub = this.treeService.getTreeById(treeId).subscribe({
      next: (tree) => {
        this.currentTree = tree;
        this.currentNodeId = tree.treeJsonContent.startNode;
        this.state = 'navigating';
      },
      error: (err) => {
        console.error('[InteractiveTree] Chargement arbre échoué :', err);
        this.state = 'needs-ticket';
      }
    });

    this.subscriptions.add(sub);
  }

  // ── Privé : Utilitaires ────────────────────────────────────────────────────

  private _clearScanTimers(): void {
    this.scanTimers.forEach(clearTimeout);
    this.scanTimers = [];
  }

  private _clearDiagnosticData(): void {
    this.currentTree = null;
    this.currentNodeId = null;
    this.diagnosticHistory = [];
  }

  private _buildTechnicalSummary(): string {
    const lines = [
      '====== RAPPORT DE DIAGNOSTIC IA ======',
      '',
      `Description employé : "${this.userProblem}"`,
      ''
    ];

    if (this.currentTree) {
      lines.push(`Catégorie identifiée : ${this.currentTree.title}`, '', 'Tests effectués :');
      this.diagnosticHistory.forEach((s, i) => {
        lines.push(`  Étape ${i + 1} — ${s.question}`, `           → ${s.answer}`);
      });
      lines.push('', 'Résultat : Intervention technicienne requise.');
    } else {
      lines.push('Statut : Problème non reconnu — analyse manuelle requise.');
    }

    return lines.join('\n');
  }
}