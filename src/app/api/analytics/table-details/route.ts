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
      console.log("🚫 table-details: Unauthorized - no session");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const datasourceId = searchParams.get("datasourceId");
    const schema = searchParams.get("schema");
    const table = searchParams.get("table");

    console.log(
      `🔍 table-details: Request for datasource=${datasourceId}, schema=${schema}, table=${table}`,
    );

    if (!datasourceId || !schema || !table) {
      console.log("❌ table-details: Missing required parameters");
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

    console.log(
      `📊 table-details: Found ${datasources.length} datasources for user ${session.user.id}`,
    );

    if (datasources.length === 0) {
      console.log("❌ table-details: Datasource not found");
      return Response.json({ error: "Datasource not found" }, { status: 404 });
    }

    const datasource = datasources[0];
    console.log(
      `✅ table-details: Using datasource ${datasource.name} (${datasource.type})`,
    );

    try {
      // Decrypt connection config
      const config = JSON.parse(decrypt(datasource.connectionConfig as string));
      console.log(
        `🔐 table-details: Decrypted config for ${datasource.type} connection`,
      );

      // Create database engine
      const engine = DatabaseEngineFactory.createEngine(config);
      console.log(`🏭 table-details: Created database engine`);

      await engine.connect();
      console.log(`🔌 table-details: Connected to database`);

      try {
        // Get table schema with column information
        // Always use schema.table format for consistency with database engines
        const tableName = `${schema}.${table}`;
        console.log(`🗂️  table-details: Getting schema for table ${tableName}`);

        const tableSchema = await engine.getTableSchema(tableName);
        console.log(
          `📋 table-details: Retrieved ${tableSchema.columns.length} columns`,
        );

        // Get sample data (first 5 rows)
        console.log(`📊 table-details: Getting sample data for ${tableName}`);
        let sampleData: any[] = [];

        try {
          sampleData = await engine.getSampleData(tableName, 5);
          console.log(
            `📊 table-details: Retrieved ${sampleData.length} sample rows`,
          );
        } catch (sampleError) {
          console.warn(
            `⚠️  table-details: Failed to get sample data for ${tableName}:`,
            sampleError,
          );
          // Continue without sample data instead of failing entirely
          sampleData = [];
        }

        // Log the actual sample data for debugging
        if (sampleData.length > 0) {
          console.log(
            `📊 table-details: Sample data preview:`,
            JSON.stringify(sampleData[0], null, 2).substring(0, 200) + "...",
          );
        } else {
          console.warn(
            `⚠️  table-details: No sample data returned for ${tableName}`,
          );
        }

        // Format columns for response
        const columns = tableSchema.columns.map((column) => ({
          name: column.name,
          type: column.type,
          nullable: column.nullable,
          isPrimaryKey: column.isPrimaryKey,
          isForeignKey: column.isForeignKey,
          description: column.description || null,
        }));

        console.log(
          `✅ table-details: Successfully processed ${columns.length} columns and ${sampleData.length} sample rows`,
        );

        // Validate response data
        if (!columns || columns.length === 0) {
          console.warn(
            `⚠️  table-details: No columns found for table ${tableName}`,
          );
        }

        if (!sampleData || sampleData.length === 0) {
          console.warn(
            `⚠️  table-details: No sample data found for table ${tableName}`,
          );
        }

        const response = {
          success: true,
          columns: columns || [],
          sampleData: sampleData || [],
          message: `Table details for ${schema}.${table}`,
          metadata: {
            tableName: table,
            schemaName: schema,
            columnCount: columns?.length || 0,
            sampleRowCount: sampleData?.length || 0,
          },
        };

        console.log(`📤 table-details: Sending response:`, {
          success: response.success,
          columnCount: response.columns.length,
          sampleRowCount: response.sampleData.length,
          hasColumns: response.columns.length > 0,
          hasSampleData: response.sampleData.length > 0,
        });

        return Response.json(response);
      } finally {
        await engine.disconnect();
        console.log(`🔌 table-details: Disconnected from database`);
      }
    } catch (connectionError) {
      console.error(
        "💥 table-details: Database connection error:",
        connectionError,
      );

      // More specific error messages based on error type
      let errorMessage = "Failed to connect to database";
      let errorDetails = "Unknown error";

      if (connectionError instanceof Error) {
        errorDetails = connectionError.message;

        // Check for common database errors
        if (connectionError.message.includes("ECONNREFUSED")) {
          errorMessage =
            "Database connection refused - check if database server is running";
        } else if (connectionError.message.includes("authentication failed")) {
          errorMessage = "Database authentication failed - check credentials";
        } else if (
          connectionError.message.includes("database") &&
          connectionError.message.includes("does not exist")
        ) {
          errorMessage = "Database does not exist";
        } else if (
          connectionError.message.includes("relation") &&
          connectionError.message.includes("does not exist")
        ) {
          errorMessage = "Table does not exist in the specified schema";
        } else {
          errorMessage = "Database operation failed";
        }
      }

      return Response.json(
        {
          success: false,
          error: errorMessage,
          details: errorDetails,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("💥 table-details: Failed to fetch table details:", error);

    // More detailed error information for debugging
    const errorMessage = "Failed to fetch table details";
    let errorDetails = "Unknown error";

    if (error instanceof Error) {
      errorDetails = error.message;
      console.error("💥 table-details: Error stack:", error.stack);
    }

    return Response.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 },
    );
  }
}
