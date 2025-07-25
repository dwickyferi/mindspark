import { DatabaseEngine } from "./BaseEngine";
import { PostgreSQLEngine } from "./PostgreSQLEngine";
import type { DatabaseConfig, PostgreSQLConfig } from "@/types/database";

/**
 * Factory class for creating database engine instances
 * Supports multiple database types with extensible architecture
 */
export class DatabaseEngineFactory {
  private static engines = new Map<string, typeof DatabaseEngine>([
    ["postgresql", PostgreSQLEngine],
    // Future engines can be added here:
    // ["mysql", MySQLEngine],
    // ["sqlite", SQLiteEngine],
    // ["mongodb", MongoDBEngine],
  ]);

  /**
   * Create a database engine instance based on configuration
   */
  static createEngine(config: DatabaseConfig): DatabaseEngine {
    const EngineClass = this.engines.get(config.type);

    if (!EngineClass) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    switch (config.type) {
      case "postgresql":
        return new PostgreSQLEngine(config as PostgreSQLConfig);
      // Future cases:
      // case "mysql":
      //   return new MySQLEngine(config as MySQLConfig);
      // case "sqlite":
      //   return new SQLiteEngine(config as SQLiteConfig);
      // case "mongodb":
      //   return new MongoDBEngine(config as MongoDBConfig);
      default:
        throw new Error(
          `Database engine for type '${config.type}' is not implemented yet`,
        );
    }
  }

  /**
   * Get list of supported database types
   */
  static getSupportedTypes(): string[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Check if a database type is supported
   */
  static isTypeSupported(type: string): boolean {
    return this.engines.has(type);
  }

  /**
   * Register a new database engine
   */
  static registerEngine(
    type: string,
    engineClass: typeof DatabaseEngine,
  ): void {
    this.engines.set(type, engineClass);
  }

  /**
   * Validate database configuration
   */
  static validateConfig(config: DatabaseConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.type) {
      errors.push("Database type is required");
    } else if (!this.isTypeSupported(config.type)) {
      errors.push(`Unsupported database type: ${config.type}`);
    }

    if (!config.database) {
      errors.push("Database name is required");
    }

    // Type-specific validation
    switch (config.type) {
      case "postgresql":
        const pgConfig = config as PostgreSQLConfig;
        if (!pgConfig.host) errors.push("Host is required for PostgreSQL");
        if (!pgConfig.port) errors.push("Port is required for PostgreSQL");
        if (!pgConfig.username)
          errors.push("Username is required for PostgreSQL");
        if (!pgConfig.password)
          errors.push("Password is required for PostgreSQL");
        break;

      // Add validation for other database types as they are implemented
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a test connection configuration (without actually connecting)
   */
  static createTestConfig(config: DatabaseConfig): DatabaseConfig {
    // Return a copy of the config for testing purposes
    return { ...config };
  }
}
