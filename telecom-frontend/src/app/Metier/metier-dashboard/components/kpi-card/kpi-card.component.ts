import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { KpiData } from '../../models/dashboard-state.model';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.component.html',
  styleUrls: ['./kpi-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiCardComponent {
  @Input() data!: KpiData;
  @Input() clickable = false;
  @Output() clicked = new EventEmitter<void>();

  onClick(): void {
    if (this.clickable) this.clicked.emit();
  }
}
