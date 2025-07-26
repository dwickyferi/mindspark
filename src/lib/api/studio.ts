// Studio API Client for managing sessions and charts persistence
import type { ChartData } from "@/types/charts";

export interface StudioSession {
  selectedDatasourceId: string | null;
  selectedDatabase: string;
  selectedSchema: string;
  selectedTables: string[];
  expandedSidebar: boolean;
  sessionMetadata: any;
}

export interface CreateChartRequest {
  title: string;
  description?: string;
  datasourceId: string;
  sqlQuery: string;
  chartType: string;
  chartConfig: any;
  dataCache?: any[];
  dataMode?: "static" | "realtime";
  refreshInterval?: number;
  tags?: string[];
}

export class StudioAPI {
  private static async request<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error("Studio API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Session Management
  static async getSession(): Promise<{
    success: boolean;
    data?: StudioSession;
    error?: string;
  }> {
    return this.request<StudioSession>("/api/studio/sessions");
  }

  static async saveSession(
    session: StudioSession,
  ): Promise<{ success: boolean; error?: string }> {
    return this.request("/api/studio/sessions", {
      method: "POST",
      body: JSON.stringify(session),
    });
  }

  // Chart Management
  static async getCharts(): Promise<{
    success: boolean;
    data?: ChartData[];
    error?: string;
  }> {
    return this.request<ChartData[]>("/api/studio/charts");
  }

  static async createChart(chart: CreateChartRequest): Promise<{
    success: boolean;
    data?: ChartData;
    error?: string;
  }> {
    return this.request<ChartData>("/api/studio/charts", {
      method: "POST",
      body: JSON.stringify(chart),
    });
  }

  static async updateChart(
    chartId: string,
    chart: CreateChartRequest,
  ): Promise<{
    success: boolean;
    data?: ChartData;
    error?: string;
  }> {
    return this.request<ChartData>(`/api/studio/charts/${chartId}`, {
      method: "PUT",
      body: JSON.stringify(chart),
    });
  }

  static async deleteChart(
    chartId: string,
  ): Promise<{ success: boolean; error?: string }> {
    return this.request(`/api/studio/charts/${chartId}`, {
      method: "DELETE",
    });
  }
}
