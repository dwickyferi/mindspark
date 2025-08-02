// MindSpark Studio - Chart Types
import type { EChartsOption } from "echarts";

export interface ChartData {
  id: string;
  title: string;
  description?: string;
  userId: string;
  datasourceId: string;
  sqlQuery: string;
  chartType: ChartType;
  chartConfig: EChartsOption;
  dataCache?: any[];
  dataMode: "static" | "realtime";
  refreshInterval?: number;
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "table"
  | "scatter"
  | "area"
  | "heatmap"
  | "treemap"
  | "sunburst"
  | "radar"
  | "gauge"
  | "funnel"
  | "candlestick";

export interface ChartGenerationRequest {
  query: string;
  selectedTables: string[];
  datasourceId: string;
  aiProvider: string; // Support any AI provider, not just limited ones
  aiModel: string;
  maxRetries?: number;
}

export interface ChartGenerationResponse {
  success: boolean;
  chart?: ChartData;
  sql?: string;
  explanation?: string;
  error?: string;
  retryCount?: number;
  executionTime?: number;
}

export interface ChartCardState {
  mode: "visualization" | "settings" | "ai-input";
  isLoading: boolean;
  error?: string;
  lastModified: Date;
}

export interface ChartCardActions {
  toggleMode: (mode: ChartCardState["mode"]) => void;
  executeQuery: (query: string) => Promise<any>;
  updateConfig: (config: Partial<EChartsOption>) => void;
  saveChart: () => Promise<void>;
  pinChart: () => Promise<void>;
  exportChart: (format: "png" | "jpg" | "svg" | "pdf") => Promise<void>;
}

// Dashboard Types
export interface DashboardData {
  id: string;
  name: string;
  description?: string;
  userId: string;
  layout: DashboardLayout;
  refreshConfig: DashboardRefreshConfig;
  isPublic: boolean;
  tags: string[];
  charts: DashboardChartItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardLayout {
  layouts: {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
    xs: LayoutItem[];
    xxs: LayoutItem[];
  };
  breakpoints: {
    lg: number;
    md: number;
    sm: number;
    xs: number;
    xxs: number;
  };
  cols: {
    lg: number;
    md: number;
    sm: number;
    xs: number;
    xxs: number;
  };
}

export interface LayoutItem {
  i: string; // Chart ID
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface DashboardRefreshConfig {
  globalRefreshEnabled: boolean;
  masterRefreshInterval: number; // seconds
  refreshScheduler: "immediate" | "staggered" | "synchronized";
  chartRefreshConfigs: Record<string, ChartRefreshConfig>;
}

export interface ChartRefreshConfig {
  chartId: string;
  autoRefreshEnabled: boolean;
  refreshInterval: number; // seconds
  backoffMultiplier: number;
  maxRetries: number;
  lastRefresh?: Date;
  errorCount: number;
}

export interface DashboardChartItem {
  id: string;
  dashboardId: string;
  chartId: string;
  chart: ChartData;
  gridPosition: LayoutItem;
  autoRefreshEnabled: boolean;
  refreshInterval: number;
  lastRefresh?: Date;
  refreshErrorCount: number;
}

// Real-time Data Types
export interface ChartUpdateMessage {
  type: "chart_data_update" | "chart_config_change" | "dashboard_update";
  chartId: string;
  dashboardId?: string;
  data?: any;
  config?: Partial<EChartsOption>;
  timestamp: Date;
}

export interface ChartRefreshStatus {
  chartId: string;
  isRefreshing: boolean;
  lastRefresh?: Date;
  nextRefresh?: Date;
  errorCount: number;
  lastError?: string;
}

// Chart Export Types
export interface ChartExportOptions {
  format: "png" | "jpg" | "svg" | "pdf" | "csv" | "json" | "excel";
  width?: number;
  height?: number;
  quality?: number;
  filename?: string;
}

// Chart Enhancement Types (AI-powered modifications)
export interface ChartEnhancementRequest {
  chartId: string;
  command: string; // Natural language command
  currentConfig: EChartsOption;
  aiProvider: string;
  aiModel: string;
}

export interface ChartEnhancementResponse {
  success: boolean;
  modification?: {
    type: "config_change" | "query_change" | "type_change";
    newConfig?: EChartsOption;
    newQuery?: string;
    newType?: ChartType;
    explanation: string;
  };
  error?: string;
}

// Chart Library and Management
export interface ChartFilter {
  search?: string;
  chartType?: ChartType;
  datasource?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  isPinned?: boolean;
}

export interface ChartSortOptions {
  field: "title" | "createdAt" | "updatedAt" | "chartType";
  direction: "asc" | "desc";
}

export interface ChartListResponse {
  charts: ChartData[];
  total: number;
  page: number;
  pageSize: number;
}

// Chart Performance and Caching
export interface ChartCacheEntry {
  chartId: string;
  data: any[];
  cachedAt: Date;
  ttl: number; // seconds
  queryHash: string;
}

export interface ChartPerformanceMetrics {
  chartId: string;
  queryExecutionTime: number;
  renderTime: number;
  dataSize: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdated: Date;
}
