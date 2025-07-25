import { NextRequest, NextResponse } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { DatasourceSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";
import { decrypt } from "lib/crypto";
import { DatabaseEngineFactory } from "lib/database/engines/DatabaseEngineFactory";

// POST - Test specific datasource connection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const { id: datasourceId } = await params;

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

      // Test connection
      const engine = DatabaseEngineFactory.createEngine(config);
      const testResult = await engine.testConnection();
      await engine.disconnect();

      // Update last connection test time and status
      const updateData: any = {
        lastConnectionTest: new Date(),
        isActive: testResult.success,
        updatedAt: new Date(),
      };

      // Update metadata if connection successful
      if (testResult.success && testResult.metadata) {
        const currentMetadata = (datasource as any).metadata || {};
        updateData.metadata = {
          ...currentMetadata,
          serverVersion: testResult.metadata.serverVersion,
          databaseSize: testResult.metadata.databaseSize,
          tableCount: testResult.metadata.tableCount,
          schemas: testResult.metadata.schemas,
        };
      }

      await db
        .update(DatasourceSchema)
        .set(updateData)
        .where(
          and(
            eq(DatasourceSchema.id, datasourceId),
            eq(DatasourceSchema.userId, userId),
          ),
        );

      return NextResponse.json({
        success: true,
        testResult,
        datasourceName: datasource.name,
      });
    } catch (connectionError) {
      // Update status to error
      await db
        .update(DatasourceSchema)
        .set({
          lastConnectionTest: new Date(),
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(DatasourceSchema.id, datasourceId),
            eq(DatasourceSchema.userId, userId),
          ),
        );

      return NextResponse.json({
        success: false,
        testResult: {
          success: false,
          error:
            connectionError instanceof Error
              ? connectionError.message
              : "Unknown connection error",
        },
        datasourceName: datasource.name,
      });
    }
  } catch (error) {
    console.error("Error testing datasource connection:", error);
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
