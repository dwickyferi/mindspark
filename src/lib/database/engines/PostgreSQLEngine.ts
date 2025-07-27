import { Pool, QueryResult as PgQueryResult } from "pg";
import { DatabaseEngine } from "./BaseEngine";
import type {
  PostgreSQLConfig,
  QueryResult,
  DatabaseSchema,
  TableInfo,
  ColumnInfo,
  ConnectionTestResult,
} from "@/types/database";

/**
 * PostgreSQL Database Engine Implementation
 * Handles PostgreSQL connections, queries, and schema introspection
 */
export class PostgreSQLEngine extends DatabaseEngine {
  private pool: Pool | null = null;
  protected config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    super(config);
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.pool) {
      await this.disconnect();
    }

    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: 10, // Maximum number of connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test the connection
      const client = await this.pool.connect();
      client.release();

      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(
        `Failed to connect to PostgreSQL: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.isConnected = false;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      if (!this.pool) {
        await this.connect();
      }

      const client = await this.pool!.connect();

      try {
        // Test basic connectivity and get server info
        const versionResult = await client.query("SELECT version() as version");
        const dbSizeResult = await client.query(
          `
          SELECT pg_size_pretty(pg_database_size($1)) as size
        `,
          [this.config.database],
        );

        const schemasResult = await client.query(`
          SELECT schema_name 
          FROM information_schema.schemata 
          WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          ORDER BY schema_name
        `);

        const tableCountResult = await client.query(`
          SELECT COUNT(*) as count
          FROM information_schema.tables 
          WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        `);

        const responseTime = Date.now() - startTime;

        return {
          success: true,
          message: "Connection successful",
          responseTime,
          metadata: {
            serverVersion: versionResult.rows[0]?.version,
            databaseSize: dbSizeResult.rows[0]?.size,
            tableCount: parseInt(tableCountResult.rows[0]?.count || "0"),
            schemas: schemasResult.rows.map((row) => row.schema_name),
          },
        };
      } finally {
        client.release();
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown connection error",
        responseTime,
      };
    }
  }

  async getSchema(): Promise<DatabaseSchema> {
    if (!this.pool) {
      await this.connect();
    }

    const client = await this.pool!.connect();

    try {
      // Get all schemas
      const schemasResult = await client.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
        ORDER BY schema_name
      `);

      // Get all tables with basic info
      const tablesResult = await client.query(`
        SELECT 
          t.table_schema,
          t.table_name,
          COALESCE(c.reltuples::bigint, 0) as row_count,
          COUNT(col.column_name) as column_count,
          obj_description(c.oid) as description
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN information_schema.columns col ON col.table_name = t.table_name 
          AND col.table_schema = t.table_schema
        WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
          AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_schema, t.table_name, c.reltuples, c.oid
        ORDER BY t.table_schema, t.table_name
      `);

      const tables: TableInfo[] = [];

      for (const tableRow of tablesResult.rows) {
        const tableInfo = await this.getTableSchema(
          `${tableRow.table_schema}.${tableRow.table_name}`,
        );
        tables.push({
          ...tableInfo,
          rowCount: parseInt(tableRow.row_count) || 0,
          columnCount: parseInt(tableRow.column_count) || 0,
          description: tableRow.description,
        });
      }

      return {
        schemas: schemasResult.rows.map((row) => row.schema_name),
        tables,
      };
    } finally {
      client.release();
    }
  }

  async getTableSchema(tableName: string): Promise<TableInfo> {
    if (!this.pool) {
      await this.connect();
    }

    const { schema, table } = this.parseTableName(tableName);
    const effectiveSchema = schema || "public";

    const client = await this.pool!.connect();

    try {
      // Get column information
      const columnsResult = await client.query(
        `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
          kcu2.table_name as referenced_table,
          kcu2.column_name as referenced_column,
          col_description(pgc.oid, c.ordinal_position) as description
        FROM information_schema.columns c
        LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON fk.table_name = c.table_name AND fk.column_name = c.column_name
        LEFT JOIN information_schema.referential_constraints rc ON rc.constraint_name = fk.column_name
        LEFT JOIN information_schema.key_column_usage kcu2 ON kcu2.constraint_name = rc.unique_constraint_name
        WHERE c.table_schema = $1 AND c.table_name = $2
        ORDER BY c.ordinal_position
      `,
        [effectiveSchema, table],
      );

      // Get constraints
      const constraintsResult = await client.query(
        `
        SELECT constraint_name, constraint_type
        FROM information_schema.table_constraints
        WHERE table_schema = $1 AND table_name = $2
      `,
        [effectiveSchema, table],
      );

      // Get indexes
      const indexesResult = await client.query(
        `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = $1 AND tablename = $2
      `,
        [effectiveSchema, table],
      );

      const columns: ColumnInfo[] = columnsResult.rows.map((row) => ({
        name: row.column_name,
        type: this.formatDataType(
          row.data_type,
          row.character_maximum_length,
          row.numeric_precision,
          row.numeric_scale,
        ),
        nullable: row.is_nullable === "YES",
        defaultValue: row.column_default,
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
        referencedTable: row.referenced_table,
        referencedColumn: row.referenced_column,
        description: row.description,
      }));

      return {
        name: table,
        schema: effectiveSchema,
        columns,
        constraints: constraintsResult.rows.map(
          (row) => `${row.constraint_type}: ${row.constraint_name}`,
        ),
        indexes: indexesResult.rows.map((row) => row.indexname),
      };
    } finally {
      client.release();
    }
  }

  async getSampleData(
    tableName: string,
    limit: number = 5,
  ): Promise<Record<string, any>[]> {
    if (!this.pool) {
      await this.connect();
    }

    const { schema, table } = this.parseTableName(tableName);
    const fullTableName = schema ? `"${schema}"."${table}"` : `"${table}"`;

    console.log(
      `🔍 PostgreSQL: Getting sample data for ${fullTableName} (limit: ${limit})`,
    );

    const client = await this.pool!.connect();

    try {
      // First try with RANDOM() for better data distribution
      const result = await client.query(
        `
        SELECT * FROM ${fullTableName} 
        ORDER BY RANDOM() 
        LIMIT $1
      `,
        [limit],
      );

      console.log(
        `✅ PostgreSQL: Retrieved ${result.rows.length} sample rows using RANDOM()`,
      );
      return result.rows || [];
    } catch (error) {
      console.warn(
        `⚠️  PostgreSQL: RANDOM() sampling failed for ${fullTableName}:`,
        error,
      );

      // If random sampling fails, try sequential sampling
      try {
        const result = await client.query(
          `
          SELECT * FROM ${fullTableName} LIMIT $1
        `,
          [limit],
        );

        console.log(
          `✅ PostgreSQL: Retrieved ${result.rows.length} sample rows using sequential sampling`,
        );
        return result.rows || [];
      } catch (fallbackError) {
        console.error(
          `💥 PostgreSQL: Both sampling methods failed for ${tableName}:`,
          fallbackError,
        );

        // Instead of returning empty array, let's throw the error so the API can handle it properly
        throw new Error(
          `Failed to get sample data for table ${tableName}: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
        );
      }
    } finally {
      client.release();
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    if (!this.pool) {
      await this.connect();
    }

    const safeQuery = this.addQuerySafeguards(query);
    const startTime = Date.now();

    const client = await this.pool!.connect();

    try {
      // Set statement timeout
      await client.query("SET statement_timeout = '30s'");

      const result: PgQueryResult = await client.query(safeQuery);
      const executionTime = Date.now() - startTime;

      return this.formatQueryResult(
        result.rows,
        result.fields?.map((field) => ({
          name: field.name,
          type: this.getFieldTypeName(field.dataTypeID),
          nullable: true, // PostgreSQL doesn't provide this info in query results
        })) || [],
        executionTime,
      );
    } finally {
      client.release();
    }
  }

  async validateQuery(
    query: string,
  ): Promise<{ valid: boolean; error?: string }> {
    if (!this.pool) {
      await this.connect();
    }

    try {
      this.sanitizeQuery(query);

      const client = await this.pool!.connect();

      try {
        // Use EXPLAIN to validate without executing
        await client.query(`EXPLAIN ${query}`);
        return { valid: true };
      } finally {
        client.release();
      }
    } catch (error) {
      return {
        valid: false,
        error:
          error instanceof Error ? error.message : "Unknown validation error",
      };
    }
  }

  /**
   * Format PostgreSQL data type with size/precision information
   */
  private formatDataType(
    dataType: string,
    maxLength?: number,
    precision?: number,
    scale?: number,
  ): string {
    let formatted = dataType;

    if (
      maxLength &&
      ["character varying", "varchar", "char", "character"].includes(dataType)
    ) {
      formatted += `(${maxLength})`;
    } else if (precision && ["numeric", "decimal"].includes(dataType)) {
      formatted += scale ? `(${precision},${scale})` : `(${precision})`;
    }

    return formatted;
  }

  /**
   * Map PostgreSQL field type ID to readable name
   */
  private getFieldTypeName(typeId: number): string {
    const typeMap: Record<number, string> = {
      16: "boolean",
      20: "bigint",
      21: "smallint",
      23: "integer",
      25: "text",
      700: "real",
      701: "double precision",
      1043: "varchar",
      1082: "date",
      1114: "timestamp",
      1184: "timestamptz",
      2950: "uuid",
    };

    return typeMap[typeId] || "unknown";
  }
}
