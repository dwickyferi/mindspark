import { z } from "zod";
import { tool } from "ai";
import { TextToSQLService } from "@/lib/text-to-sql/service";
import { DatasourceService } from "@/lib/services/datasource";

const textToSqlSchema = z.object({
  query: z
    .string()
    .describe("The natural language query to convert to SQL and execute"),
  selectedTables: z
    .array(z.string())
    .describe("List of selected table names in schema.table format"),
  datasourceId: z.string().describe("The ID of the datasource to query"),
  chartType: z
    .enum(["bar", "line", "pie", "table", "auto"])
    .optional()
    .describe(
      "Preferred chart type for visualization, or 'auto' to determine automatically",
    ),
  chartTitle: z.string().optional().describe("Custom title for the chart"),
});

export const textToSqlTool = tool({
  description:
    "Convert natural language queries to SQL, execute them against a database, and return structured data with chart recommendations",
  parameters: textToSqlSchema,
  execute: async ({
    query,
    selectedTables,
    datasourceId,
    chartType = "auto",
    chartTitle,
  }) => {
    try {
      // Get datasource configuration
      const datasourceResponse =
        await DatasourceService.getDatasource(datasourceId);

      if (
        !datasourceResponse.success ||
        !datasourceResponse.data?.connectionConfig
      ) {
        throw new Error("Failed to get datasource configuration");
      }

      // Generate and execute SQL
      const textToSQLService = new TextToSQLService();
      const response = await textToSQLService.generateAndExecuteSQL({
        query,
        selectedTables,
        datasourceId,
        datasourceConfig: datasourceResponse.data.connectionConfig,
        aiProvider: "openai", // This will be configurable
        aiModel: "gpt-4", // This will be configurable
        maxRetries: 3,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to execute SQL query");
      }

      // Analyze the query and data to determine the best chart type
      const analyzedChartType = analyzeChartTypeFromQuery(
        query,
        response.data || [],
        chartType,
      );

      // Generate a meaningful title if not provided
      const generatedTitle =
        chartTitle || generateChartTitle(query, analyzedChartType);

      return {
        success: true,
        sql: response.sql,
        data: response.data || [],
        chartType: analyzedChartType,
        chartTitle: generatedTitle,
        executionTime: response.executionTime,
        rowCount: response.data?.length || 0,
        query: query,
      };
    } catch (error) {
      console.error("Text-to-SQL tool error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
        chartType: "table" as "bar" | "line" | "pie" | "table",
        chartTitle: "Error",
        rowCount: 0,
      };
    }
  },
});

/**
 * Analyze the user query and data to determine the most appropriate chart type
 */
function analyzeChartTypeFromQuery(
  query: string,
  data: any[],
  preferredType?: string,
): "bar" | "line" | "pie" | "table" {
  if (preferredType && preferredType !== "auto") {
    return preferredType as "bar" | "line" | "pie" | "table";
  }

  const lowerQuery = query.toLowerCase();

  // Explicit chart type mentions for table
  if (
    lowerQuery.includes("table") ||
    lowerQuery.includes("raw data") ||
    lowerQuery.includes("show me the data") ||
    lowerQuery.includes("all columns") ||
    lowerQuery.includes("detailed data") ||
    lowerQuery.includes("inspect data")
  ) {
    return "table";
  }

  // Explicit chart type mentions
  if (
    lowerQuery.includes("line chart") ||
    lowerQuery.includes("trend") ||
    lowerQuery.includes("over time")
  ) {
    return "line";
  }
  if (
    lowerQuery.includes("pie chart") ||
    lowerQuery.includes("distribution") ||
    lowerQuery.includes("proportion")
  ) {
    return "pie";
  }
  if (
    lowerQuery.includes("bar chart") ||
    lowerQuery.includes("compare") ||
    lowerQuery.includes("comparison")
  ) {
    return "bar";
  }

  // Analyze based on data structure if available
  if (data && data.length > 0) {
    const keys = Object.keys(data[0]);

    // Time-based data suggests line chart
    const hasTimeColumn = keys.some(
      (key) =>
        key.toLowerCase().includes("date") ||
        key.toLowerCase().includes("time") ||
        key.toLowerCase().includes("month") ||
        key.toLowerCase().includes("year") ||
        key.toLowerCase().includes("day"),
    );

    if (hasTimeColumn) return "line";

    // Small dataset with 2 columns suggests pie chart
    if (data.length <= 10 && keys.length === 2) return "pie";

    // Keywords in column names
    const columnString = keys.join(" ").toLowerCase();
    if (
      columnString.includes("category") ||
      columnString.includes("type") ||
      columnString.includes("status")
    ) {
      return data.length <= 8 ? "pie" : "bar";
    }
  }

  // Query intent analysis
  if (
    lowerQuery.includes("total") ||
    lowerQuery.includes("sum") ||
    lowerQuery.includes("count")
  ) {
    return data && data.length <= 8 ? "pie" : "bar";
  }

  if (
    lowerQuery.includes("growth") ||
    lowerQuery.includes("change") ||
    lowerQuery.includes("progress")
  ) {
    return "line";
  }

  // Default to bar chart
  return "bar";
}

/**
 * Generate a meaningful chart title based on the query and chart type
 */
function generateChartTitle(query: string, chartType: string): string {
  // Remove common SQL/query words and clean up
  const cleanQuery = query
    .replace(
      /\b(show|display|get|fetch|select|from|where|group by|order by)\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize first letter
  const title = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);

  // Add chart type context if it's not already implied
  if (
    !title.toLowerCase().includes("chart") &&
    !title.toLowerCase().includes(chartType)
  ) {
    const chartTypeMap = {
      bar: "Bar Chart",
      line: "Trend",
      pie: "Distribution",
      table: "Data Table",
    };
    return `${title} - ${chartTypeMap[chartType as keyof typeof chartTypeMap] || "Chart"}`;
  }

  return title;
}
