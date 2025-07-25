import type { DatabaseEngine } from "@/lib/database/engines/BaseEngine";
import type { ColumnInfo } from "@/types/database";

export interface TableSchema {
  tableName: string;
  schemaName: string;
  columns: ColumnInfo[];
  sampleData: Record<string, any>[];
  constraints: string[];
  indexes: string[];
}

/**
 * Schema Processor for Text-to-SQL
 * Extracts and formats database schema information for AI context
 */
export class SchemaProcessor {
  /**
   * Extract detailed schema information for selected tables
   */
  async extractTableSchemas(
    datasourceId: string,
    engine: DatabaseEngine,
    selectedTables: string[] = [],
  ): Promise<TableSchema[]> {
    const schemas: TableSchema[] = [];

    try {
      // If no tables selected, get all tables (limited for performance)
      let tablesToProcess = selectedTables;
      if (tablesToProcess.length === 0) {
        const dbSchema = await engine.getSchema();
        tablesToProcess = dbSchema.tables.slice(0, 10).map((t) => t.name); // Limit to 10 tables
      }

      for (const tableName of tablesToProcess) {
        try {
          const tableInfo = await engine.getTableSchema(tableName);
          const sampleData = await engine.getSampleData(tableName, 5);

          schemas.push({
            tableName: tableInfo.name,
            schemaName: tableInfo.schema || "public",
            columns: tableInfo.columns,
            sampleData,
            constraints: tableInfo.constraints || [],
            indexes: tableInfo.indexes || [],
          });
        } catch (error) {
          console.warn(`Failed to get schema for table ${tableName}:`, error);
          // Continue with other tables even if one fails
        }
      }

      return schemas;
    } catch (error) {
      throw new Error(
        `Failed to extract table schemas: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate formatted schema context for AI prompt
   */
  generateSchemaContext(tableSchemas: TableSchema[]): string {
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
            if (col.defaultValue) colInfo += `, DEFAULT: ${col.defaultValue}`;
            colInfo += ")";
            if (col.description) colInfo += ` -- ${col.description}`;
            return colInfo;
          })
          .join("\n");

        let schemaText = `Table: ${schema.schemaName}.${schema.tableName}\n`;
        schemaText += `Columns:\n${columnsInfo}\n`;

        // Add sample data if available
        if (schema.sampleData.length > 0) {
          schemaText += "\nSample Data:\n";
          const sampleRows = schema.sampleData
            .slice(0, 3) // Limit to 3 sample rows
            .map((row) => {
              const values = Object.entries(row)
                .map(
                  ([key, value]) => `${key}: ${this.formatSampleValue(value)}`,
                )
                .join(", ");
              return `  {${values}}`;
            })
            .join("\n");
          schemaText += sampleRows + "\n";
        }

        // Add constraints if available
        if (schema.constraints.length > 0) {
          schemaText += `\nConstraints: ${schema.constraints.join(", ")}\n`;
        }

        // Add indexes if available
        if (schema.indexes.length > 0) {
          schemaText += `Indexes: ${schema.indexes.join(", ")}\n`;
        }

        return schemaText;
      })
      .join("\n---\n");
  }

  /**
   * Generate table selection summary for prompt
   */
  generateTableSummary(tableSchemas: TableSchema[]): string {
    return tableSchemas
      .map((schema) => {
        const columnCount = schema.columns.length;
        const sampleCount = schema.sampleData.length;
        return `- ${schema.schemaName}.${schema.tableName} (${columnCount} columns, ${sampleCount} sample rows)`;
      })
      .join("\n");
  }

  /**
   * Analyze relationships between selected tables
   */
  analyzeTableRelationships(tableSchemas: TableSchema[]): string[] {
    const relationships: string[] = [];
    const tableNames = new Set(tableSchemas.map((s) => s.tableName));

    for (const schema of tableSchemas) {
      for (const column of schema.columns) {
        if (column.isForeignKey && column.referencedTable) {
          // Check if the referenced table is also in our selection
          if (tableNames.has(column.referencedTable)) {
            relationships.push(
              `${schema.tableName}.${column.name} -> ${column.referencedTable}.${column.referencedColumn}`,
            );
          }
        }
      }
    }

    return relationships;
  }

  /**
   * Format sample values for display in AI context
   */
  private formatSampleValue(value: any): string {
    if (value === null || value === undefined) return "NULL";
    if (typeof value === "string")
      return `"${value.substring(0, 50)}${value.length > 50 ? "..." : ""}"`;
    if (typeof value === "number") return value.toString();
    if (typeof value === "boolean") return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object")
      return JSON.stringify(value).substring(0, 100);
    return String(value).substring(0, 50);
  }

  /**
   * Generate column suggestions based on common patterns
   */
  generateColumnSuggestions(
    tableSchemas: TableSchema[],
  ): Record<string, string[]> {
    const suggestions: Record<string, string[]> = {};

    for (const schema of tableSchemas) {
      const tableName = schema.tableName;
      suggestions[tableName] = [];

      // Suggest key columns
      const keyColumns = schema.columns.filter(
        (col) =>
          col.isPrimaryKey ||
          col.isForeignKey ||
          col.name.toLowerCase().includes("id"),
      );

      // Suggest commonly queried columns
      const commonColumns = schema.columns.filter((col) =>
        [
          "name",
          "title",
          "email",
          "status",
          "created_at",
          "updated_at",
          "amount",
          "price",
          "count",
        ].some((pattern) => col.name.toLowerCase().includes(pattern)),
      );

      suggestions[tableName] = [
        ...keyColumns.map((col) => col.name),
        ...commonColumns.map((col) => col.name),
      ].slice(0, 5); // Limit suggestions
    }

    return suggestions;
  }
}
