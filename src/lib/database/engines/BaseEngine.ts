import type {
  DatabaseConfig,
  DatabaseEngine as IDataBaseEngine,
  QueryResult,
  DatabaseSchema,
  TableInfo,
  ConnectionTestResult,
} from "@/types/database";

/**
 * Abstract base class for database engines
 * Provides common functionality and interface for all database types
 */
export abstract class DatabaseEngine implements IDataBaseEngine {
  protected config: DatabaseConfig;
  protected isConnected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract getSchema(): Promise<DatabaseSchema>;
  abstract getTableSchema(tableName: string): Promise<TableInfo>;
  abstract getSampleData(
    tableName: string,
    limit?: number,
  ): Promise<Record<string, any>[]>;
  abstract executeQuery(query: string): Promise<QueryResult>;
  abstract validateQuery(
    query: string,
  ): Promise<{ valid: boolean; error?: string }>;

  /**
   * Get database configuration (without sensitive data)
   */
  getConfig(): Omit<DatabaseConfig, "password" | "connectionString"> {
    const { password, connectionString, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Check if engine is connected
   */
  isEngineConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Sanitize SQL query for security
   */
  protected sanitizeQuery(query: string): string {
    // Remove dangerous SQL commands
    const dangerousPatterns = [
      /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|REPLACE)\s+/gi,
      /\bINTO\s+OUTFILE\b/gi,
      /\bLOAD_FILE\b/gi,
      /\bINTO\s+DUMPFILE\b/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        throw new Error(
          "Query contains potentially dangerous operations. Only SELECT queries are allowed.",
        );
      }
    }

    return query.trim();
  }

  /**
   * Add query timeout and row limit for safety
   */
  protected addQuerySafeguards(
    query: string,
    timeout: number = 30,
    limit: number = 1000,
  ): string {
    let safeQuery = this.sanitizeQuery(query);

    // Add LIMIT if not already present
    if (!safeQuery.toUpperCase().includes("LIMIT")) {
      safeQuery += ` LIMIT ${limit}`;
    }

    return safeQuery;
  }

  /**
   * Generate query hash for caching
   */
  protected generateQueryHash(query: string): string {
    // Simple hash function for caching purposes
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Format query result for consistent structure
   */
  protected formatQueryResult(
    rows: any[],
    fields: any[],
    executionTime?: number,
  ): QueryResult {
    return {
      rows: rows || [],
      fields: fields || [],
      rowCount: rows?.length || 0,
      executionTime,
    };
  }

  /**
   * Extract table name from schema.table format
   */
  protected parseTableName(tableName: string): {
    schema?: string;
    table: string;
  } {
    const parts = tableName.split(".");
    if (parts.length === 2) {
      return { schema: parts[0], table: parts[1] };
    }
    return { table: tableName };
  }

  /**
   * Build connection string from config (for logging/debugging)
   */
  protected buildConnectionString(): string {
    const { host, port, database, username } = this.config;
    return `${this.config.type}://${username}@${host}:${port}/${database}`;
  }
}
