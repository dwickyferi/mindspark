// MindSpark Studio - Database Engine Types
export interface DatabaseConfig {
  type: "postgresql" | "mysql" | "sqlite" | "mongodb";
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionString?: string;
  options?: Record<string, any>;
}

export interface PostgreSQLConfig extends DatabaseConfig {
  type: "postgresql";
  host: string;
  port: number;
  username: string;
  password: string;
  sslMode?: "disable" | "require" | "verify-ca" | "verify-full";
  schema?: string;
}

export interface MySQLConfig extends DatabaseConfig {
  type: "mysql";
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface SQLiteConfig extends DatabaseConfig {
  type: "sqlite";
  database: string; // File path
}

export interface MongoDBConfig extends DatabaseConfig {
  type: "mongodb";
  connectionString: string;
}

// Query Results and Schema Information
export interface QueryResult {
  rows: Record<string, any>[];
  fields: FieldInfo[];
  rowCount: number;
  executionTime?: number;
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface DatabaseSchema {
  schemas: string[];
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount?: number;
  columnCount?: number;
  description?: string;
  columns: ColumnInfo[];
  sampleData?: Record<string, any>[];
  constraints?: string[];
  indexes?: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  description?: string;
}

// Connection Testing
export interface ConnectionTestResult {
  success: boolean;
  message?: string;
  error?: string;
  responseTime?: number;
  metadata?: {
    serverVersion?: string;
    databaseSize?: string;
    tableCount?: number;
    schemas?: string[];
  };
}

// Database Engine Interface
export interface DatabaseEngine {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<ConnectionTestResult>;
  getSchema(): Promise<DatabaseSchema>;
  getTableSchema(tableName: string): Promise<TableInfo>;
  getSampleData(
    tableName: string,
    limit?: number,
  ): Promise<Record<string, any>[]>;
  executeQuery(query: string): Promise<QueryResult>;
  validateQuery(query: string): Promise<{ valid: boolean; error?: string }>;
}
