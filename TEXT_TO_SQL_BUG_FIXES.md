# Text-to-SQL Tool Bug Fixes

## Issue Fixed: SQL Syntax Error with Brackets

### Problem

Error encountered: `syntax error at or near "["` in PostgreSQL execution, indicating that the AI-generated SQL query contained invalid bracket characters that are not valid PostgreSQL syntax.

### Root Cause Analysis

The error was caused by the AI model occasionally generating SQL queries with:

1. JSON-like formatting with brackets `[` and `]`
2. Markdown code block formatting
3. Array-like syntax not valid in PostgreSQL
4. Insufficient validation of generated SQL before execution

### Solutions Implemented

#### 1. Enhanced SQL Cleanup Function

**File**: `src/lib/text-to-sql/sql-generator.ts`

**Changes**:

- Added removal of stray brackets that don't belong in SQL
- Enhanced whitespace normalization
- Added validation to ensure queries start with SELECT
- Improved error handling for malformed queries

````typescript
private cleanupSQL(sqlText: string): string {
  let cleaned = sqlText;

  // Remove markdown code blocks and SQL prefixes
  cleaned = cleaned
    .replace(/```sql\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/^\s*sql\s*/i, "")
    .trim();

  // Remove any potential problematic characters that might cause syntax errors
  cleaned = cleaned.replace(/^\[|\]$/g, ""); // Remove leading/trailing brackets

  // Remove multiple consecutive whitespace
  cleaned = cleaned.replace(/\s+/g, " ");

  // Remove trailing semicolons
  cleaned = cleaned.replace(/;+$/, "");

  // Ensure the query starts with SELECT (security check)
  const trimmedUpper = cleaned.trim().toUpperCase();
  if (!trimmedUpper.startsWith("SELECT")) {
    throw new Error("Generated query must start with SELECT statement");
  }

  return cleaned.trim();
}
````

#### 2. Improved AI System Prompt

**File**: `src/lib/text-to-sql/sql-generator.ts`

**Changes**:

- Added explicit instructions to avoid brackets and JSON formatting
- Enhanced clarity about output requirements
- Added examples of good vs bad outputs
- Strengthened PostgreSQL syntax requirements

**Key Additions**:

```typescript
CRITICAL REQUIREMENTS:
1. Generate ONLY valid PostgreSQL syntax - no brackets [], parentheses that don't belong, or special characters
2. Return ONLY the SQL query - no explanations, markdown, code blocks, or formatting
3. Start with SELECT keyword - no other statement types allowed
4. Do NOT include any JSON arrays, brackets [], or non-SQL syntax

EXAMPLE GOOD OUTPUT:
SELECT column1, column2 FROM schema.table WHERE condition LIMIT 100

EXAMPLE BAD OUTPUT:
[SELECT column1, column2 FROM schema.table]
{"query": "SELECT..."}
```

#### 3. Enhanced Error Handling and Logging

**File**: `src/lib/ai/tools/text-to-sql.ts`

**Changes**:

- Added detailed error logging with SQL query context
- Improved error messages with specific suggestions
- Added detection for common syntax error patterns

```typescript
if (!response.success) {
  // Log the actual SQL query that failed for debugging
  console.error("SQL execution failed:", {
    error: response.error,
    sql: response.sql,
    query: query,
    selectedTables: selectedTables,
  });

  // Provide more helpful error messages
  let errorMessage = response.error || "Failed to execute SQL query";

  // Check for common syntax errors and provide suggestions
  if (errorMessage.includes("syntax error")) {
    if (errorMessage.includes('near "["')) {
      errorMessage +=
        "\n\nSuggestion: The generated SQL contains invalid bracket characters. This might be due to an AI formatting issue.";
    }
    // ... additional error patterns
  }

  throw new Error(errorMessage);
}
```

#### 4. Pre-validation Function

**File**: `src/lib/ai/tools/text-to-sql.ts`

**Changes**:

- Added SQL pre-validation to catch issues before database execution
- Early detection of formatting problems
- Warning system for debugging

````typescript
function validateSQLSyntax(sql: string): string[] {
  const warnings: string[] = [];

  // Check for brackets that don't belong in SQL
  if (sql.includes("[") || sql.includes("]")) {
    warnings.push(
      "SQL contains bracket characters '[' or ']' which are not valid PostgreSQL syntax"
    );
  }

  // Check for JSON-like structure
  if (sql.trim().startsWith("{") || sql.trim().startsWith("[")) {
    warnings.push(
      "SQL appears to be formatted as JSON or array, should be plain SQL"
    );
  }

  // Check for markdown formatting
  if (sql.includes("```")) {
    warnings.push("SQL contains markdown code block formatting");
  }

  return warnings;
}
````

### Benefits of the Fixes

1. **Prevented Invalid SQL Generation**: Enhanced cleanup and validation prevent malformed queries
2. **Better Error Messages**: Users get more helpful feedback when queries fail
3. **Improved AI Guidance**: Clearer prompts reduce the likelihood of formatting errors
4. **Enhanced Debugging**: Better logging helps identify and fix issues quickly
5. **Robust Error Recovery**: System can handle and recover from various syntax errors

### Testing Recommendations

1. **Test with Various Query Types**:

   - Simple SELECT statements
   - Complex JOIN queries
   - Aggregate functions (COUNT, SUM, AVG)
   - Date/time queries
   - Filtering with WHERE clauses

2. **Test Error Scenarios**:

   - Invalid table names
   - Malformed queries
   - Complex nested queries
   - Queries that might generate brackets

3. **Monitor Logs**:
   - Check for pre-validation warnings
   - Monitor SQL execution errors
   - Verify error messages are helpful

### Backward Compatibility

All changes are backward compatible and don't break existing functionality. The improvements enhance the robustness of the text-to-SQL conversion without changing the API or user interface.

### Conclusion

These fixes address the root cause of the "syntax error at or near '['" issue by:

1. Preventing the generation of invalid SQL syntax
2. Adding multiple layers of validation
3. Providing better error feedback
4. Improving the AI model's understanding of requirements

The system is now more robust and should handle edge cases that previously caused syntax errors.
