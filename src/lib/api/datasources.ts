import type { DatabaseConfig, ConnectionTestResult } from "@/types/database";

export interface DatasourceListItem {
  id: string;
  name: string;
  type: string;
  status: "connected" | "error" | "connecting";
  description?: string;
  lastTested?: Date;
  tablesCount?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDatasourceRequest {
  name: string;
  config: DatabaseConfig;
  description?: string;
  tags?: string[];
}

export interface UpdateDatasourceRequest {
  name?: string;
  config?: DatabaseConfig;
  description?: string;
  tags?: string[];
}

export class DatasourceAPI {
  private static async request<T>(
    url: string,
    options: RequestInit = {},
  ): Promise<{ success: boolean; data?: T; error?: string; details?: string }> {
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
      console.error(`API request failed: ${url}`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // List all datasources for current user
  static async listDatasources(): Promise<{
    success: boolean;
    data?: DatasourceListItem[];
    error?: string;
  }> {
    return this.request<DatasourceListItem[]>("/api/datasources", {
      method: "GET",
    });
  }

  // Get specific datasource details
  static async getDatasource(id: string): Promise<{
    success: boolean;
    data?: DatasourceListItem & { connectionConfig?: any };
    error?: string;
  }> {
    return this.request(`/api/datasources/${id}`, {
      method: "GET",
    });
  }

  // Create new datasource
  static async createDatasource(request: CreateDatasourceRequest): Promise<{
    success: boolean;
    data?: DatasourceListItem;
    testResult?: ConnectionTestResult;
    error?: string;
  }> {
    return this.request("/api/datasources", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // Update existing datasource
  static async updateDatasource(
    id: string,
    request: UpdateDatasourceRequest,
  ): Promise<{
    success: boolean;
    data?: DatasourceListItem;
    testResult?: ConnectionTestResult;
    error?: string;
  }> {
    return this.request(`/api/datasources/${id}`, {
      method: "PUT",
      body: JSON.stringify(request),
    });
  }

  // Delete datasource
  static async deleteDatasource(id: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    return this.request(`/api/datasources/${id}`, {
      method: "DELETE",
    });
  }

  // Test connection for specific datasource
  static async testConnection(id: string): Promise<{
    success: boolean;
    testResult?: ConnectionTestResult;
    datasourceName?: string;
    error?: string;
  }> {
    return this.request(`/api/datasources/${id}/test-connection`, {
      method: "POST",
    });
  }

  // Test connection for configuration (before saving)
  static async testConnectionConfig(config: DatabaseConfig): Promise<{
    success: boolean;
    testResult?: ConnectionTestResult;
    error?: string;
  }> {
    return this.request("/api/datasources/test-connection", {
      method: "POST",
      body: JSON.stringify({ config }),
    });
  }

  // Get schema information
  static async getSchema(
    datasourceId: string,
    tableName?: string,
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const params = new URLSearchParams({ datasourceId });
    if (tableName) {
      params.append("tableName", tableName);
    }

    return this.request(`/api/datasources/${datasourceId}/schema?${params}`, {
      method: "GET",
    });
  }
}
