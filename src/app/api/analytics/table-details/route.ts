import { NextRequest } from "next/server";
import { getSession } from "lib/auth/server";
import { pgDb as db } from "lib/db/pg/db.pg";
import { DatasourceSchema } from "lib/db/pg/schema.pg";
import { eq, and } from "drizzle-orm";
import { decrypt } from "lib/crypto";
import { DatabaseEngineFactory } from "lib/database/engines/DatabaseEngineFactory";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const datasourceId = searchParams.get("datasourceId");
    const schema = searchParams.get("schema");
    const table = searchParams.get("table");

    if (!datasourceId || !schema || !table) {
      return Response.json(
        { error: "Missing required parameters: datasourceId, schema, table" },
        { status: 400 },
      );
    }

    // Get the datasource from database
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
          eq(DatasourceSchema.userId, session.user.id),
        ),
      )
      .limit(1);

    if (datasources.length === 0) {
      return Response.json({ error: "Datasource not found" }, { status: 404 });
    }

    const datasource = datasources[0];

    try {
      // Decrypt connection config
      const config = JSON.parse(decrypt(datasource.connectionConfig as string));

      // Create database engine
      const engine = DatabaseEngineFactory.createEngine(config);
      await engine.connect();

      try {
        // Get table schema with column information
        const tableName = schema === "public" ? table : `${schema}.${table}`;
        const tableSchema = await engine.getTableSchema(tableName);

        // Get sample data (first 5 rows)
        const sampleData = await engine.getSampleData(tableName, 5);

        // Format columns for response
        const columns = tableSchema.columns.map((column) => ({
          name: column.name,
          type: column.type,
          nullable: column.nullable,
          isPrimaryKey: column.isPrimaryKey,
          isForeignKey: column.isForeignKey,
          description: column.description || null,
        }));

        return Response.json({
          success: true,
          columns,
          sampleData,
          message: `Table details for ${schema}.${table}`,
          metadata: {
            tableName: table,
            schemaName: schema,
            columnCount: columns.length,
            sampleRowCount: sampleData.length,
          },
        });
      } finally {
        await engine.disconnect();
      }
    } catch (connectionError) {
      console.error("Database connection error:", connectionError);
      return Response.json(
        {
          error: "Failed to connect to database",
          details:
            connectionError instanceof Error
              ? connectionError.message
              : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Failed to fetch table details:", error);
    return Response.json(
      { error: "Failed to fetch table details" },
      { status: 500 },
    );
  }
}
