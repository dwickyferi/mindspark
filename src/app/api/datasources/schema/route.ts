import { NextRequest, NextResponse } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { DatasourceSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";
import { decrypt } from "lib/crypto";
import { DatabaseEngineFactory } from "lib/database/engines/DatabaseEngineFactory";
import type { DatabaseConfig } from "@/types/database";
import { TextToSQLService } from "@/lib/text-to-sql/service";

// GET - Get datasource schema information
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const datasourceId = searchParams.get("datasourceId");
    const tableName = searchParams.get("tableName");

    if (!datasourceId) {
      return NextResponse.json(
        { success: false, error: "Datasource ID is required" },
        { status: 400 },
      );
    }

    // Get datasource
    const datasources = await db
      .select({
        id: DatasourceSchema.id,
        name: DatasourceSchema.name,
        type: DatasourceSchema.type,
        connectionConfig: DatasourceSchema.connectionConfig,
      })
      .from(DatasourceSchema)
      .where(
        and(
          eq(DatasourceSchema.id, datasourceId),
          eq(DatasourceSchema.userId, userId),
        ),
      )
      .limit(1);

    if (datasources.length === 0) {
      return NextResponse.json(
        { success: false, error: "Datasource not found" },
        { status: 404 },
      );
    }

    const datasource = datasources[0];

    try {
      // Decrypt connection config
      const config = JSON.parse(decrypt(datasource.connectionConfig as string));

      // Create database engine
      const engine = DatabaseEngineFactory.createEngine(config);

      if (tableName) {
        // Get specific table schema with sample data
        const tableSchema = await engine.getTableSchema(tableName);
        const sampleData = await engine.getSampleData(tableName, 5);

        await engine.disconnect();

        return NextResponse.json({
          success: true,
          data: {
            ...tableSchema,
            sampleData,
          },
        });
      } else {
        // Get full database schema
        const schema = await engine.getSchema();
        await engine.disconnect();

        return NextResponse.json({
          success: true,
          data: schema,
        });
      }
    } catch (connectionError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to retrieve schema",
          details:
            connectionError instanceof Error
              ? connectionError.message
              : "Unknown error",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error getting datasource schema:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get schema",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST - Legacy support for text-to-sql service
export async function POST(request: Request) {
  try {
    const body: { config: DatabaseConfig; selectedTables?: string[] } =
      await request.json();

    if (!body.config) {
      return NextResponse.json(
        { success: false, error: "Database configuration is required" },
        { status: 400 },
      );
    }

    const textToSQLService = new TextToSQLService();

    // If specific tables are requested, get detailed info for each
    if (body.selectedTables && body.selectedTables.length > 0) {
      const tableDetails: any[] = [];

      for (const tableName of body.selectedTables) {
        const result = await textToSQLService.getTableDetails(
          body.config,
          tableName,
        );
        if (result.success && result.table) {
          tableDetails.push(result.table);
        }
      }

      return NextResponse.json({
        success: true,
        tables: tableDetails,
      });
    }

    // Otherwise, get full database schema
    const result = await textToSQLService.getDatabaseSchema(body.config);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Schema API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get database schema",
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
