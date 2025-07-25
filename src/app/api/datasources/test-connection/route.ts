import { NextRequest, NextResponse } from "next/server";
import { DatabaseEngineFactory } from "lib/database/engines/DatabaseEngineFactory";
import type { DatabaseConfig } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body: { config: DatabaseConfig } = await request.json();

    if (!body.config) {
      return NextResponse.json(
        { success: false, error: "Database configuration is required" },
        { status: 400 },
      );
    }

    // Validate configuration
    const configValidation = DatabaseEngineFactory.validateConfig(body.config);
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid database configuration",
          details: configValidation.errors,
        },
        { status: 400 },
      );
    }

    // Test connection
    const engine = DatabaseEngineFactory.createEngine(body.config);
    const result = await engine.testConnection();
    await engine.disconnect();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Connection test API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to test connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
