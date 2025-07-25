import { NextRequest, NextResponse } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { DatasourceSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";
import { decrypt } from "lib/crypto";
import { DatabaseEngineFactory } from "lib/database/engines/DatabaseEngineFactory";

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
