import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export type ChartType = 'doughnut' | 'bar' | 'line';

@Component({
  selector: 'app-chart-widget',
  templateUrl: './chart-widget.component.html',
  styleUrls: ['./chart-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartWidgetComponent implements OnChanges, AfterViewInit {
  @Input() type: ChartType = 'doughnut';
  @Input() labels: string[] = [];
  @Input() data: number[] = [];
  @Input() colors: string[] = [];
  @Input() title = '';
  @Input() subtitle = '';
  @Input() showLegend = true;
  @Input() height = '260px';

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;
  private initialized = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized && (changes['data'] || changes['labels'] || changes['colors'])) {
      this.updateChart();
    }
  }

  ngAfterViewInit(): void {
    this.initialized = true;
    this.createChart();
  }

  private createChart(): void {
    if (!this.chartCanvas?.nativeElement) return;
    if (this.chart) this.chart.destroy();

    const config: ChartConfiguration = {
      type: this.type,
      data: {
        labels: this.labels,
        datasets: [{
          data: this.data,
          backgroundColor: this.colors,
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: this.getChartOptions()
    };

    if (this.type === 'bar') {
      (config.data as any).datasets[0].borderRadius = 6;
      (config.data as any).datasets[0].barThickness = 32;
    }

    if (this.type === 'line') {
      const ds = (config.data as any).datasets[0];
      ds.borderColor = this.colors[0] || '#6366f1';
      ds.backgroundColor = this.colors[1] || 'rgba(99,102,241,0.08)';
      ds.fill = true;
      ds.tension = 0.4;
      ds.pointRadius = 4;
      ds.pointBackgroundColor = this.colors[0] || '#6366f1';
      ds.pointBorderWidth = 2;
      ds.pointBorderColor = '#fff';
      ds.borderWidth = 2.5;
      ds.label = this.title;
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }

  private updateChart(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.labels;
    (this.chart.data.datasets[0] as any).data = this.data;
    (this.chart.data.datasets[0] as any).backgroundColor = this.colors;
    this.chart.update('active');
  }

  private getChartOptions(): any {
    const base = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' as const },
      plugins: {
        legend: {
          display: this.showLegend && this.type !== 'line',
          position: 'bottom' as const,
          labels: {
            padding: 14,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { size: 11, weight: '600' as const },
            color: '#64748b'
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleFont: { size: 12, weight: '600' as const },
          bodyFont: { size: 11 },
          padding: 10,
          cornerRadius: 8,
          displayColors: true
        }
      }
    };

    if (this.type === 'doughnut') {
      return {
        ...base,
        cutout: '70%',
      };
    }

    if (this.type === 'bar') {
      return {
        ...base,
        plugins: { ...base.plugins, legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' },
            grid: { color: '#f1f5f9' }
          },
          x: {
            ticks: { font: { size: 11, weight: '600' }, color: '#64748b' },
            grid: { display: false }
          }
        }
      };
    }

    return {
      ...base,
      plugins: { ...base.plugins, legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' },
          grid: { color: '#f1f5f9' }
        },
        x: {
          ticks: { font: { size: 10 }, color: '#94a3b8' },
          grid: { display: false }
        }
      }
    };
  }
}
