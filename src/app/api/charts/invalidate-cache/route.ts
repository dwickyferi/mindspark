import { NextRequest, NextResponse } from "next/server";
import { ChartCacheService } from "@/lib/services/chart-cache";

export async function POST(request: NextRequest) {
  try {
    const { chartId, newSql, datasourceId, selectedTables } =
      await request.json();

    // Validate required fields
    if (!chartId || !newSql || !datasourceId) {
      return NextResponse.json(
        {
          success: false,
          error: "Chart ID, SQL, and datasource ID are required",
        },
        { status: 400 },
      );
    }

    console.log("[Cache Invalidation API] Processing cache invalidation:", {
      chartId,
      sql: newSql.substring(0, 100) + "...",
      datasourceId,
      selectedTablesCount: selectedTables?.length || 0,
    });

    // Handle chart modification cache invalidation
    await ChartCacheService.handleChartModification(
      chartId,
      newSql,
      datasourceId,
      selectedTables || [],
    );

    console.log(
      "[Cache Invalidation API] Cache invalidation completed successfully",
    );

    return NextResponse.json({
      success: true,
      message: "Cache invalidated successfully",
    });
  } catch (error) {
    console.error("Cache invalidation API error:", error);

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
