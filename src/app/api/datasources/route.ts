import { NextRequest, NextResponse } from "next/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { DatasourceSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { getSession } from "lib/auth/server";
import { encrypt } from "lib/crypto";
import { DatabaseEngineFactory } from "lib/database/engines/DatabaseEngineFactory";

// GET - List user's datasources
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const datasources = await db
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
      })
      .from(DatasourceSchema)
      .where(eq(DatasourceSchema.userId, userId))
      .orderBy(DatasourceSchema.updatedAt);

    // Transform the data to match the frontend interface
    const transformedDatasources = datasources.map((ds) => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      status: ds.isActive
        ? "connected"
        : ("error" as "connected" | "error" | "connecting"),
      description: (ds.metadata as any)?.description || "",
      lastTested: ds.lastConnectionTest,
      tablesCount: (ds.metadata as any)?.tableCount || 0,
      tags: ds.tags || [],
      createdAt: ds.createdAt,
      updatedAt: ds.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: transformedDatasources,
    });
  } catch (error) {
    console.error("Error fetching datasources:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch datasources",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST - Create new datasource
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const userId = session.user.id;

    const body = await request.json();
    const { name, config, description, tags = [] } = body;

    if (!name || !config) {
      return NextResponse.json(
        {
          success: false,
          error: "Name and database configuration are required",
        },
        { status: 400 },
      );
    }

    // Validate configuration
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

    // Test connection before saving
    try {
      const engine = DatabaseEngineFactory.createEngine(config);
      const testResult = await engine.testConnection();

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

      // Encrypt the connection configuration
      const encryptedConfig = encrypt(JSON.stringify(config));

      // Save to database
      const [newDatasource] = await db
        .insert(DatasourceSchema)
        .values({
          name,
          type: config.type,
          userId,
          connectionConfig: encryptedConfig,
          isActive: true,
          lastConnectionTest: new Date(),
          metadata: {
            description: description || "",
            tableCount: schema.tables.length,
            schemas: schema.schemas,
            serverVersion: testResult.metadata?.serverVersion,
            databaseSize: testResult.metadata?.databaseSize,
          },
          tags,
        })
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

      // Transform for frontend
      const transformedDatasource = {
        id: newDatasource.id,
        name: newDatasource.name,
        type: newDatasource.type,
        status: "connected" as const,
        description: (newDatasource.metadata as any)?.description || "",
        lastTested: newDatasource.lastConnectionTest,
        tablesCount: (newDatasource.metadata as any)?.tableCount || 0,
        tags: newDatasource.tags || [],
        createdAt: newDatasource.createdAt,
        updatedAt: newDatasource.updatedAt,
      };

      return NextResponse.json({
        success: true,
        data: transformedDatasource,
        testResult,
      });
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
  } catch (error) {
    console.error("Error creating datasource:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create datasource",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
