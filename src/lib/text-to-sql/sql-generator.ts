import { generateText } from "ai";
import { customModelProvider } from "../ai/models";
import type { TableSchema } from "./schema-processor";
import type { ChatModel } from "app-types/chat";

export interface SQLGenerationResult {
  sql: string;
  explanation: string;
  success: boolean;
  error?: string;
  retryCount: number;
  executionTime: number;
}

export interface SQLGenerationOptions {
  userQuery: string;
  tableSchemas: TableSchema[];
  aiProvider: string;
  aiModel: string;
  maxRetries: number;
  previousError?: string;
}

/**
 * SQL Generator using AI SDK
 * Converts natural language to SQL with error recovery
 */
export class SQLGenerator {
  /**
   * Generate SQL with automatic retries and error recovery
   */
  async generateSQLWithRetry(
    options: SQLGenerationOptions,
  ): Promise<SQLGenerationResult> {
    const startTime = Date.now();
    let lastError = "";
    let attempt = 0;

    while (attempt < options.maxRetries) {
      try {
        const sql = await this.generateSQL({
          ...options,
          previousError: attempt > 0 ? lastError : undefined,
        });

        return {
          sql,
          explanation: `SQL query generated successfully after ${attempt + 1} attempt(s)`,
          success: true,
          retryCount: attempt,
          executionTime: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        attempt++;

        if (attempt >= options.maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }

    return {
      sql: "",
      explanation: "",
      success: false,
      error: `Failed to generate valid SQL after ${options.maxRetries} attempts: ${lastError}`,
      retryCount: attempt,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Generate SQL query using AI model
   */
  private async generateSQL(options: SQLGenerationOptions): Promise<string> {
    const { userQuery, tableSchemas, aiProvider, aiModel, previousError } =
      options;

    const schemaContext = this.buildSchemaContext(tableSchemas);
    const systemPrompt = this.buildSystemPrompt(schemaContext, previousError);

    // Use the custom model provider to get the appropriate model
    const model = customModelProvider.getModel({
      provider: aiProvider,
      model: aiModel,
    } as ChatModel);

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Generate a SQL query for: "${userQuery}"`,
      temperature: 0.1, // Low temperature for consistent, accurate results
      maxTokens: 1000,
    });

    // Clean up the generated SQL
    return this.cleanupSQL(text);
  }

  /**
   * Build comprehensive schema context for AI prompt
   */
  private buildSchemaContext(tableSchemas: TableSchema[]): string {
    return tableSchemas
      .map((schema) => {
        const columnsInfo = schema.columns
          .map((col) => {
            let colInfo = `  ${col.name} (${col.type}`;
            if (!col.nullable) colInfo += ", NOT NULL";
            if (col.isPrimaryKey) colInfo += ", PRIMARY KEY";
            if (col.isForeignKey && col.referencedTable) {
              colInfo += `, FOREIGN KEY -> ${col.referencedTable}(${col.referencedColumn})`;
            }
            colInfo += ")";
            return colInfo;
          })
          .join("\n");

        // Format sample data for better AI understanding
        const sampleDataStr =
          schema.sampleData.length > 0
            ? `\nSample Data (${schema.sampleData.length} rows):\n` +
              schema.sampleData
                .slice(0, 3)
                .map((row) => {
                  const values = Object.entries(row)
                    .map(([key, value]) => `${key}: ${this.formatValue(value)}`)
                    .join(", ");
                  return `  {${values}}`;
                })
                .join("\n")
            : "";

        return `Table: ${schema.schemaName}.${schema.tableName}
Columns:
${columnsInfo}
${sampleDataStr}

Constraints: ${schema.constraints.join(", ")}
Indexes: ${schema.indexes.join(", ")}`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Build system prompt with SQL generation rules
   */
  private buildSystemPrompt(
    schemaContext: string,
    previousError?: string,
  ): string {
    let prompt = `You are an expert SQL query generator. Given a natural language query and database schema information with sample data, generate a precise PostgreSQL query.

Database Schema:
${schemaContext}

CRITICAL REQUIREMENTS:
1. Generate ONLY valid PostgreSQL syntax - no brackets [], parentheses that don't belong, or special characters
2. Return ONLY the SQL query - no explanations, markdown, code blocks, or formatting
3. Start with SELECT keyword - no other statement types allowed
4. Use proper table and column names exactly as shown in the schema
5. Use double quotes for identifiers only when necessary (spaces, special chars)
6. Do NOT include any JSON arrays, brackets [], or non-SQL syntax

SQL GENERATION RULES:
1. Use proper JOINs when accessing multiple tables
2. Include appropriate WHERE clauses for filtering
3. Use aggregate functions (COUNT, SUM, AVG, etc.) when needed for summaries
4. Handle NULL values appropriately with COALESCE or IS NULL checks
5. Use table aliases for readability when joining multiple tables
6. Optimize for performance - avoid SELECT * when possible
7. Include LIMIT clauses for potentially large result sets (default: LIMIT 1000)

Query Guidelines:
- For "show me" or "list" queries: Use SELECT with appropriate columns
- For "count" or "how many": Use COUNT() aggregate function
- For "total" or "sum": Use SUM() aggregate function
- For "average": Use AVG() aggregate function
- For "latest" or "recent": Use ORDER BY with date/time columns DESC
- For "top" or "highest": Use ORDER BY DESC with LIMIT
- For comparisons: Use appropriate WHERE conditions with =, >, <, LIKE, etc.

Date/Time Handling:
- Use proper date functions like DATE_TRUNC, NOW(), INTERVAL
- For "last week/month/year": Use date arithmetic
- Format dates as needed with TO_CHAR()

EXAMPLE GOOD OUTPUT:
SELECT column1, column2 FROM schema.table WHERE condition LIMIT 100

EXAMPLE BAD OUTPUT:
[SELECT column1, column2 FROM schema.table]
{"query": "SELECT..."}
\`\`\`sql SELECT...`;

    if (previousError) {
      prompt += `\n\nPREVIOUS ERROR TO FIX:
The previous query failed with: ${previousError}
Please generate a corrected query that addresses this specific error.
Make sure to avoid any syntax that could cause PostgreSQL parsing errors.`;
    }

    return prompt;
  }

  /**
   * Clean up generated SQL text
   */
  private cleanupSQL(sqlText: string): string {
    let cleaned = sqlText;

    // Remove markdown code blocks and SQL prefixes
    cleaned = cleaned
      .replace(/```sql\n?/g, "")
      .replace(/```\n?/g, "")
      .replace(/^\s*sql\s*/i, "")
      .trim();

    // Remove any potential problematic characters that might cause syntax errors
    // Remove any stray brackets that don't belong in SQL
    cleaned = cleaned.replace(/^\[|\]$/g, ""); // Remove leading/trailing brackets

    // Remove multiple consecutive whitespace
    cleaned = cleaned.replace(/\s+/g, " ");

    // Remove trailing semicolons (we'll let the database handle statement termination)
    cleaned = cleaned.replace(/;+$/, "");

    // Ensure the query starts with SELECT (security check)
    const trimmedUpper = cleaned.trim().toUpperCase();
    if (!trimmedUpper.startsWith("SELECT")) {
      throw new Error("Generated query must start with SELECT statement");
    }

    return cleaned.trim();
  }

  /**
   * Format values for sample data display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "string")
      return `"${value.substring(0, 30)}${value.length > 30 ? "..." : ""}"`;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value.toString();
    if (value instanceof Date) return `"${value.toISOString()}"`;
    return `"${String(value).substring(0, 30)}"`;
  }

  /**
   * Validate generated SQL basic syntax
   */
  validateSQLSyntax(sql: string): { valid: boolean; error?: string } {
    // Basic SQL validation
    const trimmedSQL = sql.trim().toUpperCase();

    if (!trimmedSQL.startsWith("SELECT")) {
      return { valid: false, error: "Query must start with SELECT" };
    }

    // Check for dangerous operations
    const dangerousPatterns = [
      /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|REPLACE)\s+/gi,
      /\bINTO\s+OUTFILE\b/gi,
      /\bLOAD_FILE\b/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sql)) {
        return {
          valid: false,
          error:
            "Query contains dangerous operations. Only SELECT queries are allowed.",
        };
      }
    }

    // Basic structure validation
    if (!sql.includes("FROM")) {
      return { valid: false, error: "Query must include FROM clause" };
    }

    return { valid: true };
  }

  /**
   * Add safety constraints to SQL query
   */
  addSafetyConstraints(sql: string, maxRows: number = 1000): string {
    let safeSql = sql.trim();

    // Add LIMIT if not present
    if (!safeSql.toUpperCase().includes("LIMIT")) {
      safeSql += ` LIMIT ${maxRows}`;
    }

    return safeSql;
  }

  /**
   * Estimate query complexity for performance monitoring
   */
  estimateQueryComplexity(sql: string): {
    complexity: "low" | "medium" | "high";
    factors: string[];
  } {
    const factors: string[] = [];
    let score = 0;

    // Count JOINs
    const joinCount = (sql.match(/\bJOIN\b/gi) || []).length;
    if (joinCount > 0) {
      factors.push(`${joinCount} JOIN(s)`);
      score += joinCount * 2;
    }

    // Check for subqueries
    const subqueryCount = (sql.match(/\bSELECT\b/gi) || []).length - 1;
    if (subqueryCount > 0) {
      factors.push(`${subqueryCount} subquery(ies)`);
      score += subqueryCount * 3;
    }

    // Check for aggregations
    const aggregations =
      sql.match(/\b(COUNT|SUM|AVG|MIN|MAX|GROUP BY)\b/gi) || [];
    if (aggregations.length > 0) {
      factors.push(`${aggregations.length} aggregation(s)`);
      score += aggregations.length;
    }

    // Check for LIKE patterns
    const likeCount = (sql.match(/\bLIKE\b/gi) || []).length;
    if (likeCount > 0) {
      factors.push(`${likeCount} LIKE pattern(s)`);
      score += likeCount;
    }

    let complexity: "low" | "medium" | "high";
    if (score <= 2) complexity = "low";
    else if (score <= 6) complexity = "medium";
    else complexity = "high";

    return { complexity, factors };
  }
}
