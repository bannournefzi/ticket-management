import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { SlaMetrics } from '../../models/dashboard-state.model';

@Component({
  selector: 'app-sla-gauge',
  templateUrl: './sla-gauge.component.html',
  styleUrls: ['./sla-gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SlaGaugeComponent {
  @Input() metrics!: SlaMetrics;

  formatHours(h: number): string {
    if (h < 1) return '< 1h';
    if (h < 24) return `${h}h`;
    return `${Math.round(h / 24)}j`;
  }
}
