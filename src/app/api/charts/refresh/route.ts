import { NextRequest, NextResponse } from "next/server";
import { ChartCacheService } from "@/lib/services/chart-cache";
import { TextToSQLService } from "@/lib/text-to-sql/service";
import { DatabaseEngineFactory } from "@/lib/database/engines/DatabaseEngineFactory";
import { DatasourceService } from "@/lib/services/datasource";

export async function POST(request: NextRequest) {
  try {
    const {
      chartId,
      datasourceId,
      sql,
      selectedTables,
      query,
      forceRefresh = false,
      lastUpdated,
    } = await request.json();

    // Validate required fields
    if (!chartId || !datasourceId || !sql) {
      return NextResponse.json(
        {
          success: false,
          error: "Chart ID, datasource ID, and SQL are required",
        },
        { status: 400 },
      );
    }

    console.log("[Refresh API] Processing refresh request:", {
      chartId,
      sql: sql.substring(0, 100) + "...",
      forceRefresh,
      lastUpdated,
      selectedTablesCount: selectedTables?.length || 0,
    });

    // Get datasource configuration
    const datasourceResponse =
      await DatasourceService.getDatasource(datasourceId);

    if (
      !datasourceResponse.success ||
      !datasourceResponse.data?.connectionConfig
    ) {
      return NextResponse.json(
        { success: false, error: "Failed to get datasource configuration" },
        { status: 404 },
      );
    }

    // Validate datasource configuration
    const configValidation = DatabaseEngineFactory.validateConfig(
      datasourceResponse.data.connectionConfig,
    );
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid datasource configuration",
          details: configValidation.errors,
        },
        { status: 400 },
      );
    }

    // If forceRefresh is true, invalidate existing cache first
    if (forceRefresh) {
      console.log("[Refresh API] Force refresh requested - invalidating cache");
      await ChartCacheService.invalidateChartCache(chartId);
    }

    // Execute the SQL query to get fresh data
    const textToSQLService = new TextToSQLService();

    const result = await textToSQLService.generateAndExecuteSQL({
      query: query || "Refresh data",
      selectedTables: selectedTables || [],
      datasourceId,
      datasourceConfig: datasourceResponse.data.connectionConfig,
      aiProvider: "openai", // These could be made configurable
      aiModel: "gpt-4",
      maxRetries: 1,
      chartId,
      useCache: !forceRefresh, // Use cache only if not force refreshing
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to refresh chart data",
          details: result,
        },
        { status: 500 },
      );
    }

    // Update the cache with fresh data
    if (result.data && result.executionTime !== undefined) {
      await ChartCacheService.refreshChartCache(
        chartId,
        result.data,
        result.executionTime,
      );
    }

    // Return the fresh data
    return NextResponse.json({
      success: true,
      data: result.data,
      executionTime: result.executionTime,
      rowCount: result.data?.length || 0,
      sql: result.sql,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Chart refresh API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
