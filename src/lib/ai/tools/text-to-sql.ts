import { z } from "zod";
import { tool } from "ai";
import { TextToSQLService } from "@/lib/text-to-sql/service";
import { DatasourceService } from "@/lib/services/datasource";
import {
  DynamicChartConfig,
  SupportedChartType,
  createDefaultConfig,
  CHART_COLORS,
  ChartComponent,
} from "@/types/chart-config";

/**
 * Generate an intelligent chart configuration based on data analysis
 */
function generateChartConfig(
  data: any[],
  query: string,
  title: string,
  suggestedChartType?: string,
): DynamicChartConfig {
  if (!data || data.length === 0) {
    return createDefaultConfig("BarChart", []);
  }

  const keys = Object.keys(data[0] || {});

  // Determine the best chart type if not provided
  let chartType: SupportedChartType = "BarChart";

  if (suggestedChartType) {
    const chartTypeMap: Record<string, SupportedChartType> = {
      bar: "BarChart",
      line: "LineChart",
      pie: "PieChart",
      area: "AreaChart",
      scatter: "ScatterChart",
    };
    chartType = chartTypeMap[suggestedChartType] || "BarChart";
  } else {
    chartType = determineChartTypeFromData(data, query);
  }

  // Create base config
  const config = createDefaultConfig(chartType, data);

  // Enhance config based on chart type and data analysis
  config.metadata = {
    ...config.metadata,
    title,
    description: `${chartType} generated from: ${query}`,
    updatedAt: new Date().toISOString(),
  };

  // Intelligent component configuration based on data structure
  if (chartType === "PieChart") {
    config.components = generatePieChartComponents(data, keys);
  } else if (chartType === "LineChart" || chartType === "AreaChart") {
    config.components = generateTimeSeriesComponents(data, keys);
  } else if (chartType === "BarChart") {
    config.components = generateBarChartComponents(data, keys);
  } else if (chartType === "ScatterChart") {
    config.components = generateScatterChartComponents(data, keys);
  }

  return config;
}

/**
 * Determine chart type from data analysis
 */
function determineChartTypeFromData(
  data: any[],
  query: string,
): SupportedChartType {
  const lowerQuery = query.toLowerCase();
  const keys = Object.keys(data[0] || {});

  // Time series detection
  const hasTimeColumn = keys.some(
    (key) =>
      key.toLowerCase().includes("date") ||
      key.toLowerCase().includes("time") ||
      key.toLowerCase().includes("month") ||
      key.toLowerCase().includes("year") ||
      key.toLowerCase().includes("day"),
  );

  if (hasTimeColumn) return "LineChart";

  // Pie chart for small categorical data
  if (data.length <= 10 && keys.length === 2) return "PieChart";

  // Query intent analysis
  if (
    lowerQuery.includes("distribution") ||
    lowerQuery.includes("share") ||
    lowerQuery.includes("percentage")
  ) {
    return "PieChart";
  }

  if (
    lowerQuery.includes("trend") ||
    lowerQuery.includes("over time") ||
    lowerQuery.includes("growth")
  ) {
    return "LineChart";
  }

  if (
    lowerQuery.includes("correlation") ||
    lowerQuery.includes("relationship")
  ) {
    return "ScatterChart";
  }

  // Default to bar chart
  return "BarChart";
}

/**
 * Generate components for pie charts
 */
function generatePieChartComponents(
  data: any[],
  keys: string[],
): ChartComponent[] {
  const valueKey = findNumericKey(keys) || keys[1] || "value";
  const nameKey = keys[0] || "name";

  return [
    { type: "ResponsiveContainer", props: { width: "100%", height: 400 } },
    {
      type: "Pie",
      props: {
        data,
        cx: "50%",
        cy: "50%",
        outerRadius: 120,
        dataKey: valueKey,
        nameKey: nameKey,
        fill: CHART_COLORS[0],
      },
    },
    { type: "Tooltip" },
    { type: "Legend" },
  ];
}

/**
 * Generate components for time series charts (Line/Area)
 */
function generateTimeSeriesComponents(
  data: any[],
  keys: string[],
): ChartComponent[] {
  const timeKey = findTimeKey(keys) || keys[0];
  const valueKeys = findNumericKeys(keys);

  const components: ChartComponent[] = [
    { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
    { type: "XAxis", props: { dataKey: timeKey } },
    { type: "YAxis" },
    { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
    { type: "Tooltip" },
    { type: "Legend" },
  ];

  // Add lines/areas for each numeric column
  valueKeys.forEach((key, index) => {
    components.push({
      type: "Line",
      props: {
        type: "monotone",
        dataKey: key,
        stroke: CHART_COLORS[index % CHART_COLORS.length],
        strokeWidth: 2,
      },
    });
  });

  return components;
}

/**
 * Generate components for bar charts
 */
function generateBarChartComponents(
  data: any[],
  keys: string[],
): ChartComponent[] {
  const categoryKey = findCategoryKey(keys) || keys[0];
  const valueKeys = findNumericKeys(keys);

  const components: ChartComponent[] = [
    { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
    { type: "XAxis", props: { dataKey: categoryKey } },
    { type: "YAxis" },
    { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
    { type: "Tooltip" },
    { type: "Legend" },
  ];

  // Add bars for each numeric column
  valueKeys.forEach((key, index) => {
    components.push({
      type: "Bar",
      props: {
        dataKey: key,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      },
    });
  });

  return components;
}

/**
 * Generate components for scatter charts
 */
function generateScatterChartComponents(
  data: any[],
  keys: string[],
): ChartComponent[] {
  const numericKeys = findNumericKeys(keys);
  const xKey = numericKeys[0] || keys[0];
  const yKey = numericKeys[1] || keys[1];

  return [
    { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
    { type: "XAxis", props: { dataKey: xKey, type: "number" } },
    { type: "YAxis", props: { dataKey: yKey, type: "number" } },
    { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
    { type: "Tooltip" },
    { type: "Legend" },
    {
      type: "Scatter",
      props: {
        data,
        fill: CHART_COLORS[0],
      },
    },
  ];
}

/**
 * Helper functions to analyze data structure
 */
function findTimeKey(keys: string[]): string | null {
  return (
    keys.find(
      (key) =>
        key.toLowerCase().includes("date") ||
        key.toLowerCase().includes("time") ||
        key.toLowerCase().includes("month") ||
        key.toLowerCase().includes("year") ||
        key.toLowerCase().includes("day"),
    ) || null
  );
}

function findNumericKey(keys: string[]): string | null {
  return (
    keys.find(
      (key) =>
        key.toLowerCase().includes("count") ||
        key.toLowerCase().includes("total") ||
        key.toLowerCase().includes("sum") ||
        key.toLowerCase().includes("amount") ||
        key.toLowerCase().includes("value") ||
        key.toLowerCase().includes("price") ||
        key.toLowerCase().includes("revenue"),
    ) ||
    keys.find((key) => key !== keys[0]) ||
    null
  );
}

function findNumericKeys(keys: string[]): string[] {
  return keys.filter(
    (key) =>
      key.toLowerCase().includes("count") ||
      key.toLowerCase().includes("total") ||
      key.toLowerCase().includes("sum") ||
      key.toLowerCase().includes("amount") ||
      key.toLowerCase().includes("value") ||
      key.toLowerCase().includes("price") ||
      key.toLowerCase().includes("revenue") ||
      key.toLowerCase().includes("score") ||
      key.toLowerCase().includes("rate"),
  );
}

function findCategoryKey(keys: string[]): string | null {
  return (
    keys.find(
      (key) =>
        key.toLowerCase().includes("name") ||
        key.toLowerCase().includes("category") ||
        key.toLowerCase().includes("type") ||
        key.toLowerCase().includes("status") ||
        key.toLowerCase().includes("group"),
    ) ||
    keys[0] ||
    null
  );
}

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
  currentSql: z
    .string()
    .optional()
    .describe("Current SQL query for context when modifying existing charts"),
  currentChartConfig: z
    .any()
    .optional()
    .describe(
      "Current chart configuration to preserve for visual-only modifications",
    ),
  isVisualOnlyChange: z
    .boolean()
    .optional()
    .describe(
      "True if this is only a visual styling change (colors, chart type) without SQL modification",
    ),
});

export const textToSqlTool = tool({
  description: `
    Convert natural language queries to SQL, execute them against a database, and return a complete chart configuration for visualization.
    
    This tool intelligently analyzes the query and resulting data to generate:
    - Appropriate chart type (LineChart, BarChart, PieChart, AreaChart, ScatterChart)  
    - Complete chart configuration with proper components (axes, legends, tooltips, etc.)
    - Smart color schemes and styling
    - Responsive sizing and margins
    
    The tool returns a DynamicChartConfig object that can be directly rendered without manual configuration.
    
    VISUAL-ONLY CHANGES:
    For color changes, chart type changes, or other visual styling modifications WITHOUT data changes:
    - Set isVisualOnlyChange: true
    - Pass currentChartConfig with the existing configuration
    - Pass currentSql to preserve the existing SQL query
    - The tool will update only the visual properties and return immediately without executing SQL
    
    DATA CHANGES:
    For queries that modify data (filtering, aggregation, new columns):
    - Set isVisualOnlyChange: false or omit it
    - Pass currentSql for context when modifying existing charts
    - The tool will execute SQL and generate new chart configuration
    
    Chart type selection logic:
    - Time series data (dates/times) → LineChart
    - Small categorical data (≤10 items) → PieChart  
    - Distribution/percentage queries → PieChart
    - Trend/growth queries → LineChart
    - Correlation/relationship queries → ScatterChart
    - Default → BarChart
  `,
  parameters: textToSqlSchema,
  execute: async ({
    query,
    selectedTables,
    datasourceId,
    chartType = "auto",
    chartTitle,
    currentSql,
    currentChartConfig,
    isVisualOnlyChange = false,
  }) => {
    try {
      console.log("textToSql tool called with:", {
        query,
        isVisualOnlyChange,
        hasCurrentChartConfig: !!currentChartConfig,
        hasCurrentSql: !!currentSql,
        datasourceId,
      });

      // Handle visual-only changes (like color modifications) without SQL execution
      if (isVisualOnlyChange && currentChartConfig && currentSql) {
        console.log("Processing visual-only change:", query);

        // Determine if this is a color change request
        const lowerQuery = query.toLowerCase();
        const isColorChange =
          lowerQuery.includes("color") ||
          lowerQuery.includes("red") ||
          lowerQuery.includes("blue") ||
          lowerQuery.includes("green") ||
          lowerQuery.includes("yellow") ||
          lowerQuery.includes("orange") ||
          lowerQuery.includes("purple") ||
          lowerQuery.includes("pink");

        if (isColorChange) {
          console.log("Detected color change request in query:", query);

          // Parse the color from the query
          const colorMapping: Record<string, string> = {
            red: "#dc2626",
            blue: "#2563eb",
            green: "#16a34a",
            yellow: "#ca8a04",
            orange: "#ea580c",
            purple: "#9333ea",
            pink: "#db2777",
            black: "#000000",
            white: "#ffffff",
            gray: "#6b7280",
            grey: "#6b7280",
          };

          let newColor = "#dc2626"; // default red
          for (const [colorName, hexColor] of Object.entries(colorMapping)) {
            if (lowerQuery.includes(colorName)) {
              newColor = hexColor;
              console.log(`Setting color to ${colorName}: ${hexColor}`);
              break;
            }
          }

          // Create updated chart config with new color
          const updatedConfig = JSON.parse(JSON.stringify(currentChartConfig));

          // Update the color in the components
          if (updatedConfig.components) {
            updatedConfig.components = updatedConfig.components.map(
              (component: any) => {
                if (component.type === "Bar" && component.props) {
                  console.log(
                    `Updating Bar component color from ${component.props.fill} to ${newColor}`,
                  );
                  return {
                    ...component,
                    props: {
                      ...component.props,
                      fill: newColor,
                    },
                  };
                } else if (component.type === "Line" && component.props) {
                  console.log(
                    `Updating Line component color from ${component.props.stroke} to ${newColor}`,
                  );
                  return {
                    ...component,
                    props: {
                      ...component.props,
                      stroke: newColor,
                    },
                  };
                } else if (component.type === "Pie" && component.props) {
                  console.log(
                    `Updating Pie component color from ${component.props.fill} to ${newColor}`,
                  );
                  return {
                    ...component,
                    props: {
                      ...component.props,
                      fill: newColor,
                    },
                  };
                } else if (component.type === "Area" && component.props) {
                  console.log(
                    `Updating Area component color from ${component.props.fill} to ${newColor}`,
                  );
                  return {
                    ...component,
                    props: {
                      ...component.props,
                      fill: newColor,
                    },
                  };
                }
                return component;
              },
            );
          }

          // Update metadata
          if (updatedConfig.metadata) {
            updatedConfig.metadata.updatedAt = new Date().toISOString();
            updatedConfig.metadata.description = `${updatedConfig.metadata.description} (Updated: ${query})`;
          }

          console.log("Returning visual-only update result");

          // Return the visual-only update without executing SQL
          return {
            success: true,
            sql: currentSql, // Keep the same SQL
            data: currentChartConfig.data || [], // Keep the same data
            chartConfig: updatedConfig,
            executionTime: 0,
            rowCount: currentChartConfig.data?.length || 0,
            query: query,
          };
        }
      }

      console.log("Processing regular SQL execution flow");

      // Regular SQL execution flow for data changes
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

      // If we have current SQL context, enhance the query with it
      const enhancedQuery = currentSql
        ? `${query}\n\nCONTEXT: The current SQL query is: ${currentSql}\nPlease modify this query to accommodate the new request while preserving important elements like LIMIT, WHERE conditions, and column selections unless specifically asked to change them.`
        : query;

      // Generate a chartId for caching
      const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await textToSQLService.generateAndExecuteSQL({
        query: enhancedQuery,
        selectedTables,
        datasourceId,
        datasourceConfig: datasourceResponse.data.connectionConfig,
        aiProvider: "openai", // This will be configurable
        aiModel: "gpt-4", // This will be configurable
        maxRetries: 3,
        chartId, // Pass chartId for caching
        useCache: true, // Enable caching
      });

      // Pre-validate the SQL to catch common issues
      if (response.sql) {
        const preValidationErrors = validateSQLSyntax(response.sql);
        if (preValidationErrors.length > 0) {
          console.warn("SQL pre-validation warnings:", preValidationErrors);
          // Don't throw here, but log for debugging
        }
      }

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
          } else if (
            errorMessage.includes("relation") &&
            errorMessage.includes("does not exist")
          ) {
            errorMessage +=
              "\n\nSuggestion: Check if the table names are correct and exist in the selected schema.";
          } else {
            errorMessage +=
              "\n\nSuggestion: Check PostgreSQL syntax rules and ensure the query follows standard SQL format.";
          }
        }

        throw new Error(errorMessage);
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

      // Generate complete chart configuration
      const chartConfig = generateChartConfig(
        response.data || [],
        query,
        generatedTitle,
        analyzedChartType,
      );

      return {
        success: true,
        sql: response.sql,
        data: response.data || [],
        chartConfig,
        executionTime: response.executionTime,
        rowCount: response.data?.length || 0,
        query: query,
      };
    } catch (error) {
      console.error("Text-to-SQL tool error:", error);

      // Generate error chart config
      const errorConfig = createDefaultConfig("BarChart", []);
      errorConfig.metadata = {
        title: "Error",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        createdAt: new Date().toISOString(),
      };

      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        data: [],
        chartConfig: errorConfig,
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
): string {
  if (preferredType && preferredType !== "auto") {
    return preferredType;
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

  // Use the new intelligent chart type detection
  const chartType = determineChartTypeFromData(data, query);

  // Convert to old format for compatibility
  const chartTypeMap: Record<SupportedChartType, string> = {
    LineChart: "line",
    BarChart: "bar",
    PieChart: "pie",
    AreaChart: "area",
    ScatterChart: "scatter",
    ComposedChart: "bar", // fallback to bar
  };

  return chartTypeMap[chartType] || "bar";
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

/**
 * Pre-validate SQL syntax to catch common issues
 */
function validateSQLSyntax(sql: string): string[] {
  const warnings: string[] = [];

  // Check for brackets that don't belong in SQL
  if (sql.includes("[") || sql.includes("]")) {
    warnings.push(
      "SQL contains bracket characters '[' or ']' which are not valid PostgreSQL syntax",
    );
  }

  // Check for JSON-like structure
  if (sql.trim().startsWith("{") || sql.trim().startsWith("[")) {
    warnings.push(
      "SQL appears to be formatted as JSON or array, should be plain SQL",
    );
  }

  // Check for markdown formatting
  if (sql.includes("```")) {
    warnings.push("SQL contains markdown code block formatting");
  }

  // Check if it starts with SELECT
  if (!sql.trim().toUpperCase().startsWith("SELECT")) {
    warnings.push("SQL should start with SELECT statement");
  }

  return warnings;
}
