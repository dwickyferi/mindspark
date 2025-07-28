import { DatabaseEngineFactory } from "@/lib/database/engines/DatabaseEngineFactory";
import { SchemaProcessor } from "./schema-processor";
import { SQLGenerator } from "./sql-generator";
import { SQLErrorRecovery } from "./error-recovery";
import { ChartCacheService } from "@/lib/services/chart-cache";
import type { DatabaseConfig } from "@/types/database";
import type {
  ChartGenerationRequest,
  ChartGenerationResponse,
} from "@/types/charts";

export interface TextToSQLRequest extends ChartGenerationRequest {
  datasourceConfig: DatabaseConfig;
  chartId?: string; // Optional chart ID for caching
  useCache?: boolean; // Whether to use caching (default: true)
}

export interface TextToSQLResponse extends ChartGenerationResponse {
  data?: any[]; // Query result rows
  queryComplexity?: {
    complexity: "low" | "medium" | "high";
    factors: string[];
  };
  optimizationHints?: string[];
  tableSchemas?: any[];
  relationships?: string[];
  fromCache?: boolean; // Indicates if data was served from cache
}

/**
 * Text-to-SQL Service
 * Main service that orchestrates the entire text-to-SQL pipeline
 */
export class TextToSQLService {
  private schemaProcessor: SchemaProcessor;
  private sqlGenerator: SQLGenerator;
  private errorRecovery: SQLErrorRecovery;

  constructor() {
    this.schemaProcessor = new SchemaProcessor();
    this.sqlGenerator = new SQLGenerator();
    this.errorRecovery = new SQLErrorRecovery();
  }

  /**
   * Main method to convert natural language to SQL and execute query
   */
  async generateAndExecuteSQL(
    request: TextToSQLRequest,
  ): Promise<TextToSQLResponse> {
    const startTime = Date.now();
    const useCache = request.useCache !== false; // Default to true

    try {
      // Step 1: Create database engine
      const engine = DatabaseEngineFactory.createEngine(
        request.datasourceConfig,
      );
      await engine.connect();

      // Step 2: Extract table schemas with sample data
      const tableSchemas = await this.schemaProcessor.extractTableSchemas(
        request.datasourceId,
        engine,
        request.selectedTables,
      );

      if (tableSchemas.length === 0) {
        return {
          success: false,
          error: "No valid tables found or selected",
          retryCount: 0,
          executionTime: Date.now() - startTime,
        };
      }

      // Step 3: Analyze table relationships
      const relationships =
        this.schemaProcessor.analyzeTableRelationships(tableSchemas);

      // Step 4: Generate SQL with retries
      const sqlResult = await this.sqlGenerator.generateSQLWithRetry({
        userQuery: request.query,
        tableSchemas,
        aiProvider: request.aiProvider,
        aiModel: request.aiModel,
        maxRetries: request.maxRetries || 3,
      });

      if (!sqlResult.success) {
        await engine.disconnect();
        return {
          success: false,
          error: sqlResult.error,
          retryCount: sqlResult.retryCount,
          executionTime: Date.now() - startTime,
        };
      }

      // Step 5: Add safety constraints
      const safeSql = this.sqlGenerator.addSafetyConstraints(sqlResult.sql);

      // Step 6: Check cache first if enabled
      let queryResult;

      if (useCache) {
        const cachedData = await ChartCacheService.getCachedChartData(
          safeSql,
          request.datasourceId,
          request.selectedTables,
        );

        if (cachedData) {
          await engine.disconnect();
          console.log("Serving chart data from cache");

          return {
            success: true,
            data: cachedData.data,
            sql: cachedData.sql,
            explanation: `${sqlResult.explanation}\n\nQuery returned ${cachedData.rowCount} rows from cache.`,
            retryCount: sqlResult.retryCount,
            executionTime: cachedData.executionTime,
            queryComplexity: this.sqlGenerator.estimateQueryComplexity(safeSql),
            optimizationHints:
              this.errorRecovery.generateOptimizationHints(safeSql),
            tableSchemas: tableSchemas.map((schema) => ({
              name: schema.tableName,
              schema: schema.schemaName,
              columns: schema.columns.length,
              sampleRows: schema.sampleData.length,
            })),
            relationships,
            fromCache: true,
          };
        }
      }

      // Step 7: Validate SQL syntax
      const syntaxValidation = this.sqlGenerator.validateSQLSyntax(safeSql);
      if (!syntaxValidation.valid) {
        await engine.disconnect();
        return {
          success: false,
          error: `SQL validation failed: ${syntaxValidation.error}`,
          sql: safeSql,
          retryCount: sqlResult.retryCount,
          executionTime: Date.now() - startTime,
        };
      }

      // Step 8: Execute query with error recovery
      let executionAttempt = 0;
      const maxExecutionAttempts = 2;

      while (executionAttempt < maxExecutionAttempts) {
        try {
          queryResult = await engine.executeQuery(safeSql);
          break; // Success, exit retry loop
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown database error";

          // Try to recover from the error
          const recovery = this.errorRecovery.analyzeAndRecover(
            errorMessage,
            executionAttempt,
          );

          if (
            recovery.canRecover &&
            executionAttempt < maxExecutionAttempts - 1
          ) {
            // Attempt to regenerate SQL with error context
            const retryResult = await this.sqlGenerator.generateSQLWithRetry({
              userQuery: request.query,
              tableSchemas,
              aiProvider: request.aiProvider,
              aiModel: request.aiModel,
              maxRetries: 1,
              previousError: `${errorMessage}\n\nRecovery guidance: ${recovery.recoveryPrompt}`,
            });

            if (retryResult.success) {
              const retrySafeSql = this.sqlGenerator.addSafetyConstraints(
                retryResult.sql,
              );
              try {
                queryResult = await engine.executeQuery(retrySafeSql);
                break; // Success with retry
              } catch (retryError) {
                executionAttempt++;
                if (executionAttempt >= maxExecutionAttempts) {
                  await engine.disconnect();
                  return {
                    success: false,
                    error: `Query execution failed after ${maxExecutionAttempts} attempts: ${retryError instanceof Error ? retryError.message : "Unknown error"}`,
                    sql: retrySafeSql,
                    retryCount: sqlResult.retryCount + executionAttempt,
                    executionTime: Date.now() - startTime,
                  };
                }
              }
            } else {
              executionAttempt++;
            }
          } else {
            await engine.disconnect();
            return {
              success: false,
              error: `Query execution failed: ${errorMessage}${recovery.suggestion ? `\n\nSuggestion: ${recovery.suggestion}` : ""}`,
              sql: safeSql,
              retryCount: sqlResult.retryCount + executionAttempt,
              executionTime: Date.now() - startTime,
            };
          }
        }
      }

      await engine.disconnect();

      // Step 9: Cache the results if enabled and chartId is provided
      if (useCache && queryResult && request.chartId) {
        await ChartCacheService.cacheChartData(
          request.chartId,
          safeSql,
          request.datasourceId,
          request.selectedTables,
          queryResult?.rows || queryResult || [],
          queryResult?.executionTime || 0,
          request.query,
        );
      }

      // Step 10: Analyze query complexity and generate optimization hints
      const complexity = this.sqlGenerator.estimateQueryComplexity(safeSql);
      const optimizationHints =
        this.errorRecovery.generateOptimizationHints(safeSql);

      // Step 11: Return successful result
      return {
        success: true,
        data: queryResult?.rows || queryResult || [], // Include the actual query results
        sql: safeSql,
        explanation: `${sqlResult.explanation}\n\nQuery returned ${queryResult?.rowCount || 0} rows in ${queryResult?.executionTime || 0}ms.`,
        retryCount: sqlResult.retryCount + executionAttempt,
        executionTime: Date.now() - startTime,
        queryComplexity: complexity,
        optimizationHints,
        tableSchemas: tableSchemas.map((schema) => ({
          name: schema.tableName,
          schema: schema.schemaName,
          columns: schema.columns.length,
          sampleRows: schema.sampleData.length,
        })),
        relationships,
        fromCache: false,
      };
    } catch (error) {
      return {
        success: false,
        error: `Text-to-SQL service error: ${error instanceof Error ? error.message : "Unknown error"}`,
        retryCount: 0,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test database connection
   */
  async testConnection(datasourceConfig: DatabaseConfig): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    metadata?: any;
  }> {
    try {
      const engine = DatabaseEngineFactory.createEngine(datasourceConfig);
      const result = await engine.testConnection();

      return {
        success: result.success,
        message: result.message,
        error: result.error,
        metadata: result.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  /**
   * Get database schema information
   */
  async getDatabaseSchema(datasourceConfig: DatabaseConfig): Promise<{
    success: boolean;
    schema?: any;
    error?: string;
  }> {
    try {
      const engine = DatabaseEngineFactory.createEngine(datasourceConfig);
      await engine.connect();

      const schema = await engine.getSchema();
      await engine.disconnect();

      return {
        success: true,
        schema: {
          schemas: schema.schemas,
          tables: schema.tables.map((table) => ({
            name: table.name,
            schema: table.schema,
            rowCount: table.rowCount,
            columnCount: table.columnCount,
            description: table.description,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get database schema",
      };
    }
  }

  /**
   * Get detailed table information with sample data
   */
  async getTableDetails(
    datasourceConfig: DatabaseConfig,
    tableName: string,
  ): Promise<{
    success: boolean;
    table?: any;
    error?: string;
  }> {
    try {
      const engine = DatabaseEngineFactory.createEngine(datasourceConfig);
      await engine.connect();

      const tableInfo = await engine.getTableSchema(tableName);
      const sampleData = await engine.getSampleData(tableName, 10);

      await engine.disconnect();

      return {
        success: true,
        table: {
          ...tableInfo,
          sampleData,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get table details",
      };
    }
  }

  /**
   * Validate SQL query without executing it
   */
  async validateSQL(
    datasourceConfig: DatabaseConfig,
    sqlQuery: string,
  ): Promise<{
    success: boolean;
    valid?: boolean;
    error?: string;
    hints?: string[];
  }> {
    try {
      // First check basic syntax
      const syntaxValidation = this.sqlGenerator.validateSQLSyntax(sqlQuery);
      if (!syntaxValidation.valid) {
        return {
          success: true,
          valid: false,
          error: syntaxValidation.error,
        };
      }

      // Then validate against database
      const engine = DatabaseEngineFactory.createEngine(datasourceConfig);
      await engine.connect();

      const dbValidation = await engine.validateQuery(sqlQuery);
      await engine.disconnect();

      const hints = this.errorRecovery.generateOptimizationHints(sqlQuery);

      return {
        success: true,
        valid: dbValidation.valid,
        error: dbValidation.error,
        hints,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to validate SQL",
      };
    }
  }
}
