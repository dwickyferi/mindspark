import { serverCache } from "@/lib/cache";
import { createHash } from "crypto";

export interface CachedChartData {
  data: any[];
  sql: string;
  executionTime: number;
  rowCount: number;
  cachedAt: string;
  query: string;
  selectedTables: string[];
  datasourceId: string;
}

/**
 * Chart Data Cache Service
 * Handles caching of chart query results using Redis
 */
export class ChartCacheService {
  private static readonly CACHE_PREFIX = "chart_data:";
  private static readonly DEFAULT_TTL = 1000 * 60 * 60; // 1 hour in milliseconds

  /**
   * Generate a unique cache key for chart data
   */
  private static generateCacheKey(
    sql: string,
    datasourceId: string,
    selectedTables: string[],
  ): string {
    const content = `${sql}:${datasourceId}:${selectedTables.sort().join(",")}`;
    const hash = createHash("sha256").update(content).digest("hex");
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Generate cache key from chart ID
   */
  private static chartIdToCacheKey(chartId: string): string {
    return `${this.CACHE_PREFIX}id:${chartId}`;
  }

  /**
   * Store chart data in cache
   */
  static async cacheChartData(
    chartId: string,
    sql: string,
    datasourceId: string,
    selectedTables: string[],
    data: any[],
    executionTime: number,
    query: string,
    ttlMs: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(sql, datasourceId, selectedTables);
      const chartIdKey = this.chartIdToCacheKey(chartId);

      const cachedData: CachedChartData = {
        data,
        sql,
        executionTime,
        rowCount: data.length,
        cachedAt: new Date().toISOString(),
        query,
        selectedTables,
        datasourceId,
      };

      // Store the data with both the hash key and chart ID key
      await Promise.all([
        serverCache.set(cacheKey, cachedData, ttlMs),
        serverCache.set(chartIdKey, cacheKey, ttlMs), // Store reference to hash key
      ]);

      console.log(
        `Chart data cached with key: ${cacheKey} and chartId: ${chartId}`,
      );
    } catch (error) {
      console.error("Failed to cache chart data:", error);
      // Don't throw - caching failures shouldn't break the flow
    }
  }

  /**
   * Retrieve chart data from cache using SQL query
   */
  static async getCachedChartData(
    sql: string,
    datasourceId: string,
    selectedTables: string[],
  ): Promise<CachedChartData | null> {
    try {
      const cacheKey = this.generateCacheKey(sql, datasourceId, selectedTables);
      const cachedData = await serverCache.get<CachedChartData>(cacheKey);

      if (cachedData) {
        console.log(`Chart data cache hit for key: ${cacheKey}`);
        return cachedData;
      }

      console.log(`Chart data cache miss for key: ${cacheKey}`);
      return null;
    } catch (error) {
      console.error("Failed to retrieve cached chart data:", error);
      return null;
    }
  }

  /**
   * Retrieve chart data from cache using chart ID
   */
  static async getCachedChartDataById(
    chartId: string,
  ): Promise<CachedChartData | null> {
    try {
      const chartIdKey = this.chartIdToCacheKey(chartId);
      const cacheKey = await serverCache.get<string>(chartIdKey);

      if (!cacheKey) {
        console.log(`No cache reference found for chart ID: ${chartId}`);
        return null;
      }

      const cachedData = await serverCache.get<CachedChartData>(cacheKey);

      if (cachedData) {
        console.log(`Chart data retrieved from cache for chart ID: ${chartId}`);
        return cachedData;
      }

      return null;
    } catch (error) {
      console.error(
        `Failed to retrieve cached chart data for ID ${chartId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Handle chart modification - invalidate old cache and prepare for new SQL
   */
  static async handleChartModification(
    chartId: string,
    newSql: string,
    datasourceId: string,
    selectedTables: string[],
  ): Promise<void> {
    try {
      // First, invalidate any existing cache for this chart
      await this.invalidateChartCache(chartId);

      // Also invalidate the old query cache if it exists
      const chartIdKey = this.chartIdToCacheKey(chartId);
      const oldCacheKey = await serverCache.get<string>(chartIdKey);
      if (oldCacheKey) {
        await serverCache.delete(oldCacheKey);
      }

      // Generate the new cache key and store the mapping
      const newCacheKey = this.generateCacheKey(
        newSql,
        datasourceId,
        selectedTables,
      );
      await serverCache.set(chartIdKey, newCacheKey, this.DEFAULT_TTL);

      console.log(`Chart ${chartId} modified - cache prepared for new SQL`);
    } catch (error) {
      console.error(
        `Failed to handle chart modification for ${chartId}:`,
        error,
      );
    }
  }

  /**
   * Invalidate cache for specific chart
   */
  static async invalidateChartCache(chartId: string): Promise<void> {
    try {
      const chartIdKey = this.chartIdToCacheKey(chartId);
      const cacheKey = await serverCache.get<string>(chartIdKey);

      if (cacheKey) {
        await Promise.all([
          serverCache.delete(cacheKey),
          serverCache.delete(chartIdKey),
        ]);
        console.log(`Cache invalidated for chart ID: ${chartId}`);
      }
    } catch (error) {
      console.error(
        `Failed to invalidate cache for chart ID ${chartId}:`,
        error,
      );
    }
  }

  /**
   * Invalidate cache by SQL query
   */
  static async invalidateQueryCache(
    sql: string,
    datasourceId: string,
    selectedTables: string[],
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(sql, datasourceId, selectedTables);
      await serverCache.delete(cacheKey);
      console.log(`Query cache invalidated for key: ${cacheKey}`);
    } catch (error) {
      console.error("Failed to invalidate query cache:", error);
    }
  }

  /**
   * Update cached data with new results (for refresh scenarios)
   */
  static async refreshChartCache(
    chartId: string,
    newData: any[],
    executionTime: number,
    ttlMs: number = this.DEFAULT_TTL,
  ): Promise<void> {
    try {
      const chartIdKey = this.chartIdToCacheKey(chartId);
      const cacheKey = await serverCache.get<string>(chartIdKey);

      if (!cacheKey) {
        console.warn(`No cache reference found for chart ID: ${chartId}`);
        return;
      }

      const existingData = await serverCache.get<CachedChartData>(cacheKey);

      if (existingData) {
        const updatedData: CachedChartData = {
          ...existingData,
          data: newData,
          executionTime,
          rowCount: newData.length,
          cachedAt: new Date().toISOString(),
        };

        await serverCache.set(cacheKey, updatedData, ttlMs);
        console.log(`Chart cache refreshed for chart ID: ${chartId}`);
      }
    } catch (error) {
      console.error(`Failed to refresh cache for chart ID ${chartId}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    chartKeys: number;
  }> {
    try {
      const allKeys = await serverCache.getAll();
      const chartKeys = Array.from(allKeys.keys()).filter((key) =>
        key.startsWith(this.CACHE_PREFIX),
      );

      return {
        totalKeys: allKeys.size,
        chartKeys: chartKeys.length,
      };
    } catch (error) {
      console.error("Failed to get cache stats:", error);
      return { totalKeys: 0, chartKeys: 0 };
    }
  }
}
