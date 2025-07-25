/**
 * SQL Error Recovery System
 * Analyzes SQL execution errors and provides recovery strategies
 */

export interface SQLError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  hint?: string;
  detail?: string;
}

export interface ErrorRecoveryStrategy {
  errorPattern: RegExp;
  recoveryPrompt: string;
  maxAttempts: number;
  category: "syntax" | "schema" | "logic" | "permission";
}

export interface RecoveryResult {
  canRecover: boolean;
  recoveryPrompt?: string;
  category?: string;
  suggestion?: string;
}

/**
 * PostgreSQL Error Recovery Strategies
 */
const ERROR_RECOVERY_STRATEGIES: ErrorRecoveryStrategy[] = [
  // Column-related errors
  {
    errorPattern: /column "([^"]+)" does not exist/i,
    recoveryPrompt: `The column mentioned does not exist in the specified table. Please:
1. Check the exact column names from the provided schema
2. Verify you're referencing the correct table
3. Use table aliases if joining multiple tables
4. Check for typos in column names`,
    maxAttempts: 2,
    category: "schema",
  },

  // Table-related errors
  {
    errorPattern: /relation "([^"]+)" does not exist/i,
    recoveryPrompt: `The table/relation mentioned does not exist. Please:
1. Use only the tables provided in the schema information
2. Check the exact table names (case-sensitive)
3. Include schema prefix if needed (e.g., schema.table_name)
4. Verify table aliases are defined before use`,
    maxAttempts: 2,
    category: "schema",
  },

  // Syntax errors
  {
    errorPattern: /syntax error at or near "([^"]+)"/i,
    recoveryPrompt: `There is a SQL syntax error. Please:
1. Check PostgreSQL syntax rules
2. Ensure proper use of keywords, operators, and punctuation
3. Verify parentheses are balanced
4. Check for missing commas in SELECT lists
5. Ensure proper JOIN syntax`,
    maxAttempts: 3,
    category: "syntax",
  },

  // JOIN-related errors
  {
    errorPattern: /(cannot join|join condition|ambiguous column)/i,
    recoveryPrompt: `There is an issue with the JOIN operation. Please:
1. Ensure JOIN conditions use compatible data types
2. Use proper table aliases to avoid ambiguous column references
3. Verify foreign key relationships exist between tables
4. Use explicit column references (table.column)`,
    maxAttempts: 2,
    category: "logic",
  },

  // Aggregate function errors
  {
    errorPattern: /(aggregate function|GROUP BY|must appear in)/i,
    recoveryPrompt: `There is an issue with aggregate functions. Please:
1. Include all non-aggregate columns in GROUP BY clause
2. Use aggregate functions (COUNT, SUM, AVG) properly
3. Cannot mix aggregate and non-aggregate columns without GROUP BY
4. Use HAVING for aggregate filtering, WHERE for row filtering`,
    maxAttempts: 2,
    category: "logic",
  },

  // Data type errors
  {
    errorPattern:
      /(operator does not exist|cannot be applied|invalid input syntax)/i,
    recoveryPrompt: `There is a data type or operator error. Please:
1. Use appropriate operators for data types
2. Use proper type casting when needed (::text, ::integer)
3. Check date/time format requirements
4. Use LIKE for text pattern matching, = for exact matches`,
    maxAttempts: 2,
    category: "logic",
  },

  // Permission errors
  {
    errorPattern: /(permission denied|access denied|not allowed)/i,
    recoveryPrompt: `There is a permission issue. Please:
1. Use only SELECT operations (no INSERT, UPDATE, DELETE)
2. Access only the tables provided in the schema
3. Avoid system tables or restricted schemas`,
    maxAttempts: 1,
    category: "permission",
  },

  // Timeout errors
  {
    errorPattern: /(timeout|query cancelled|statement timeout)/i,
    recoveryPrompt: `The query timed out. Please:
1. Simplify the query by reducing JOINs or complexity
2. Add appropriate WHERE clauses to filter data
3. Use LIMIT to restrict result size
4. Consider using indexed columns in WHERE clauses`,
    maxAttempts: 2,
    category: "logic",
  },
];

/**
 * Error Recovery Manager
 */
export class SQLErrorRecovery {
  /**
   * Analyze error and provide recovery strategy
   */
  analyzeAndRecover(error: string, attempt: number): RecoveryResult {
    for (const strategy of ERROR_RECOVERY_STRATEGIES) {
      const match = strategy.errorPattern.exec(error);

      if (match && attempt < strategy.maxAttempts) {
        return {
          canRecover: true,
          recoveryPrompt: strategy.recoveryPrompt,
          category: strategy.category,
          suggestion: this.generateSpecificSuggestion(error, match),
        };
      }
    }

    return {
      canRecover: false,
      suggestion:
        "Unable to automatically recover from this error. Please check the query manually.",
    };
  }

  /**
   * Generate specific suggestions based on error details
   */
  private generateSpecificSuggestion(
    error: string,
    match: RegExpExecArray,
  ): string {
    const errorText = error.toLowerCase();
    const matchedText = match[1]?.toLowerCase() || "";

    // Column not found suggestions
    if (errorText.includes("column") && errorText.includes("does not exist")) {
      return `The column "${matchedText}" was not found. Check the schema for correct column names.`;
    }

    // Table not found suggestions
    if (
      errorText.includes("relation") &&
      errorText.includes("does not exist")
    ) {
      return `The table "${matchedText}" was not found. Use only tables from the provided schema.`;
    }

    // Syntax error suggestions
    if (errorText.includes("syntax error")) {
      return `Syntax error near "${matchedText}". Check PostgreSQL syntax rules.`;
    }

    return "Please review the error message and adjust the query accordingly.";
  }

  /**
   * Extract structured error information from PostgreSQL error
   */
  parsePostgreSQLError(errorMessage: string): SQLError {
    // Extract error code if present
    const codeMatch = errorMessage.match(/ERROR:\s*([A-Z0-9]+):/);
    const code = codeMatch ? codeMatch[1] : "UNKNOWN";

    // Extract main error message
    const messageMatch = errorMessage.match(/ERROR:.*?([^\n\r]+)/);
    const message = messageMatch ? messageMatch[1].trim() : errorMessage;

    // Extract hint if present
    const hintMatch = errorMessage.match(/HINT:\s*([^\n\r]+)/);
    const hint = hintMatch ? hintMatch[1].trim() : undefined;

    // Extract detail if present
    const detailMatch = errorMessage.match(/DETAIL:\s*([^\n\r]+)/);
    const detail = detailMatch ? detailMatch[1].trim() : undefined;

    // Extract line/column position if present
    const positionMatch = errorMessage.match(/at character (\d+)/);
    const column = positionMatch ? parseInt(positionMatch[1]) : undefined;

    return {
      code,
      message,
      hint,
      detail,
      column,
    };
  }

  /**
   * Generate query optimization hints
   */
  generateOptimizationHints(query: string): string[] {
    const hints: string[] = [];
    const upperQuery = query.toUpperCase();

    // Check for SELECT *
    if (upperQuery.includes("SELECT *")) {
      hints.push(
        "Consider selecting only the columns you need instead of using SELECT * for better performance.",
      );
    }

    // Check for missing LIMIT
    if (!upperQuery.includes("LIMIT")) {
      hints.push(
        "Consider adding a LIMIT clause to prevent accidentally returning too many rows.",
      );
    }

    // Check for complex JOINs
    const joinCount = (query.match(/\bJOIN\b/gi) || []).length;
    if (joinCount > 3) {
      hints.push(
        "Query has many JOINs. Consider if all are necessary and ensure proper indexes exist on join columns.",
      );
    }

    // Check for LIKE patterns starting with %
    if (query.match(/LIKE\s+['"][%]/i)) {
      hints.push(
        "LIKE patterns starting with % can be slow. Consider using full-text search if available.",
      );
    }

    // Check for OR conditions
    const orCount = (query.match(/\bOR\b/gi) || []).length;
    if (orCount > 2) {
      hints.push(
        "Multiple OR conditions can be slow. Consider using IN() or UNION if appropriate.",
      );
    }

    // Check for subqueries
    const subqueryCount = (query.match(/\bSELECT\b/gi) || []).length - 1;
    if (subqueryCount > 2) {
      hints.push(
        "Query has multiple subqueries. Consider if JOINs or CTEs would be more efficient.",
      );
    }

    return hints;
  }

  /**
   * Suggest query improvements based on common patterns
   */
  suggestQueryImprovements(query: string): string[] {
    const suggestions: string[] = [];
    const upperQuery = query.toUpperCase();

    // Suggest using explicit JOINs instead of WHERE clause joins
    if (
      upperQuery.includes("WHERE") &&
      !upperQuery.includes("JOIN") &&
      query.includes(",")
    ) {
      suggestions.push(
        "Consider using explicit JOIN syntax instead of comma-separated tables with WHERE conditions.",
      );
    }

    // Suggest using aliases for readability
    if (
      upperQuery.includes("FROM") &&
      query.split(" ").length > 10 &&
      !query.includes(" AS ")
    ) {
      suggestions.push(
        "Consider using table aliases for better readability in complex queries.",
      );
    }

    // Suggest using EXISTS instead of IN with subqueries
    if (upperQuery.includes("IN (SELECT")) {
      suggestions.push(
        "Consider using EXISTS instead of IN with subqueries for better performance.",
      );
    }

    // Suggest using CASE statements for conditional logic
    if (query.includes("UNION") && query.match(/UNION/gi)?.length === 1) {
      suggestions.push(
        "Consider using CASE statements instead of UNION for simple conditional logic.",
      );
    }

    return suggestions;
  }

  /**
   * Check if error is recoverable based on attempt count and error type
   */
  isRecoverable(
    error: string,
    attemptCount: number,
    maxAttempts: number,
  ): boolean {
    // Some errors are not worth retrying
    const nonRecoverablePatterns = [
      /permission denied/i,
      /access denied/i,
      /authentication failed/i,
      /connection refused/i,
      /database .* does not exist/i,
    ];

    for (const pattern of nonRecoverablePatterns) {
      if (pattern.test(error)) {
        return false;
      }
    }

    return attemptCount < maxAttempts;
  }
}
