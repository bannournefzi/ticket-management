export interface KpiData {
  label: string;
  value: number;
  icon: string;
  color: string;
  bgColor: string;
  trend?: { value: number; positive: boolean };
}

export interface ChartDataset {
  labels: string[];
  data: number[];
  colors: string[];
}

export interface DashboardFilters {
  status: string | null;
  priority: string | null;
  dateRange: '7d' | '30d' | '90d' | 'all';
  search: string;
}

export interface SlaMetrics {
  rate: number;
  breachedCount: number;
  onTrackCount: number;
  metCount: number;
  avgResolutionHours: number;
}

export interface DashboardState {
  isLoading: boolean;
  error: string | null;
  totalTickets: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  slaMetrics: SlaMetrics;
  urgentTickets: any[];
  recentTickets: any[];
  trendData: { labels: string[]; values: number[] };
}
