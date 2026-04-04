import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SkeletonLoaderComponent } from './components/skeleton-loader/skeleton-loader.component';
import { KpiCardComponent } from './components/kpi-card/kpi-card.component';
import { ChartWidgetComponent } from './components/chart-widget/chart-widget.component';
import { SlaGaugeComponent } from './components/sla-gauge/sla-gauge.component';
import { TicketListWidgetComponent } from './components/ticket-list-widget/ticket-list-widget.component';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';

@NgModule({
  declarations: [
    SkeletonLoaderComponent,
    KpiCardComponent,
    ChartWidgetComponent,
    SlaGaugeComponent,
    TicketListWidgetComponent,
    DashboardHeaderComponent,
    FilterPanelComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    SkeletonLoaderComponent,
    KpiCardComponent,
    ChartWidgetComponent,
    SlaGaugeComponent,
    TicketListWidgetComponent,
    DashboardHeaderComponent,
    FilterPanelComponent
  ]
})
export class DashboardModule {}
