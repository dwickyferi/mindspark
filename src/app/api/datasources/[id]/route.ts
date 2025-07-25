import { NextRequest, NextResponse } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { DatasourceSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { getSession } from "lib/auth/server";
import { encrypt, decrypt } from "lib/crypto";
import { DatabaseEngineFactory } from "lib/database/engines/DatabaseEngineFactory";
import type { ConnectionTestResult } from "@/types/database";

// GET - Get specific datasource
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const { id: datasourceId } = await params;

    const datasource = await db
      .select({
        id: DatasourceSchema.id,
        name: DatasourceSchema.name,
        type: DatasourceSchema.type,
        isActive: DatasourceSchema.isActive,
        lastConnectionTest: DatasourceSchema.lastConnectionTest,
        metadata: DatasourceSchema.metadata,
        tags: DatasourceSchema.tags,
        createdAt: DatasourceSchema.createdAt,
        updatedAt: DatasourceSchema.updatedAt,
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

    if (datasource.length === 0) {
      return NextResponse.json(
        { success: false, error: "Datasource not found" },
        { status: 404 },
      );
    }

    const ds = datasource[0];

    // Decrypt connection config for editing (remove sensitive data)
    let connectionConfig = null;
    try {
      const decryptedConfig = JSON.parse(
        decrypt(ds.connectionConfig as string),
      );
      // Remove password for security
      connectionConfig = {
        ...decryptedConfig,
        password: "••••••••",
      };
    } catch (error) {
      console.error("Failed to decrypt connection config:", error);
    }

    const transformedDatasource = {
      id: ds.id,
      name: ds.name,
      type: ds.type,
      status: ds.isActive ? "connected" : ("error" as const),
      description: (ds.metadata as any)?.description || "",
      lastTested: ds.lastConnectionTest,
      tablesCount: (ds.metadata as any)?.tableCount || 0,
      tags: ds.tags || [],
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
      connectionConfig,
    };

    return NextResponse.json({
      success: true,
      data: transformedDatasource,
    });
  } catch (error) {
    console.error("Error fetching datasource:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch datasource",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// PUT - Update datasource
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const { id: datasourceId } = await params;

    const body = await request.json();
    const { name, config, description, tags = [] } = body;

    // Check if datasource exists and belongs to user
    const existingDatasource = await db
      .select({
        id: DatasourceSchema.id,
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

    if (existingDatasource.length === 0) {
      return NextResponse.json(
        { success: false, error: "Datasource not found" },
        { status: 404 },
      );
    }

    const updateData: any = {};
    let testResult: ConnectionTestResult | null = null;

    // If config is provided, validate and test connection
    if (config) {
      const configValidation = DatabaseEngineFactory.validateConfig(config);
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

      try {
        const engine = DatabaseEngineFactory.createEngine(config);
        testResult = await engine.testConnection();

        if (!testResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: "Connection test failed",
              details: testResult.error,
            },
            { status: 400 },
          );
        }

        // Get schema information for metadata
        const schema = await engine.getSchema();
        await engine.disconnect();

        // Encrypt the new connection configuration
        updateData.connectionConfig = encrypt(JSON.stringify(config));
        updateData.type = config.type;
        updateData.isActive = true;
        updateData.lastConnectionTest = new Date();
        updateData.metadata = {
          description: description || "",
          tableCount: schema.tables.length,
          schemas: schema.schemas,
          serverVersion: testResult.metadata?.serverVersion,
          databaseSize: testResult.metadata?.databaseSize,
        };
      } catch (connectionError) {
        return NextResponse.json(
          {
            success: false,
            error: "Database connection failed",
            details:
              connectionError instanceof Error
                ? connectionError.message
                : "Unknown error",
          },
          { status: 400 },
        );
      }
    } else {
      // Update only metadata if no config change
      const existingMetadata = (existingDatasource[0] as any).metadata || {};
      updateData.metadata = {
        ...existingMetadata,
        description: description || existingMetadata.description || "",
      };
    }

    // Update name and tags
    if (name) updateData.name = name;
    if (tags) updateData.tags = tags;
    updateData.updatedAt = new Date();

    // Perform update
    const [updatedDatasource] = await db
      .update(DatasourceSchema)
      .set(updateData)
      .where(
        and(
          eq(DatasourceSchema.id, datasourceId),
          eq(DatasourceSchema.userId, userId),
        ),
      )
      .returning({
        id: DatasourceSchema.id,
        name: DatasourceSchema.name,
        type: DatasourceSchema.type,
        isActive: DatasourceSchema.isActive,
        lastConnectionTest: DatasourceSchema.lastConnectionTest,
        metadata: DatasourceSchema.metadata,
        tags: DatasourceSchema.tags,
        createdAt: DatasourceSchema.createdAt,
        updatedAt: DatasourceSchema.updatedAt,
      });

    const transformedDatasource = {
      id: updatedDatasource.id,
      name: updatedDatasource.name,
      type: updatedDatasource.type,
      status: updatedDatasource.isActive ? "connected" : ("error" as const),
      description: (updatedDatasource.metadata as any)?.description || "",
      lastTested: updatedDatasource.lastConnectionTest,
      tablesCount: (updatedDatasource.metadata as any)?.tableCount || 0,
      tags: updatedDatasource.tags || [],
      createdAt: updatedDatasource.createdAt,
      updatedAt: updatedDatasource.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: transformedDatasource,
      testResult,
    });
  } catch (error) {
    console.error("Error updating datasource:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update datasource",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete datasource
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const userId = session.user.id;
    const { id: datasourceId } = await params;

    // Check if datasource exists and belongs to user
    const existingDatasource = await db
      .select({ id: DatasourceSchema.id })
      .from(DatasourceSchema)
      .where(
        and(
          eq(DatasourceSchema.id, datasourceId),
          eq(DatasourceSchema.userId, userId),
        ),
      )
      .limit(1);

    if (existingDatasource.length === 0) {
      return NextResponse.json(
        { success: false, error: "Datasource not found" },
        { status: 404 },
      );
    }

    // Delete the datasource
    await db
      .delete(DatasourceSchema)
      .where(
        and(
          eq(DatasourceSchema.id, datasourceId),
          eq(DatasourceSchema.userId, userId),
        ),
      );

    return NextResponse.json({
      success: true,
      message: "Datasource deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting datasource:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete datasource",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
