import { NextRequest, NextResponse } from "next/server";
import { TextToSQLService } from "@/lib/text-to-sql/service";
import { DatabaseEngineFactory } from "@/lib/database/engines/DatabaseEngineFactory";
import type { TextToSQLRequest } from "@/lib/text-to-sql/service";

export async function POST(request: NextRequest) {
  try {
    const body: TextToSQLRequest = await request.json();

    // Validate required fields
    const { query, selectedTables, aiProvider, aiModel, datasourceConfig } =
      body;

    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: "Query text is required" },
        { status: 400 },
      );
    }

    if (!selectedTables || selectedTables.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one table must be selected" },
        { status: 400 },
      );
    }

    if (!datasourceConfig) {
      return NextResponse.json(
        { success: false, error: "Datasource configuration is required" },
        { status: 400 },
      );
    }

    if (!aiProvider || !aiModel) {
      return NextResponse.json(
        { success: false, error: "AI provider and model are required" },
        { status: 400 },
      );
    }

    // Validate datasource configuration
    const configValidation =
      DatabaseEngineFactory.validateConfig(datasourceConfig);
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

    // Initialize text-to-SQL service
    const textToSQLService = new TextToSQLService();

    // Generate and execute SQL with caching support
    const result = await textToSQLService.generateAndExecuteSQL({
      ...body, // Include all body parameters (chartId, useCache, etc.)
      datasourceConfig,
    });

    // Return result
    return NextResponse.json(result);
  } catch (error) {
    console.error("Text-to-SQL API Error:", error);

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
