"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label as FormLabel } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronRight,
  Database,
  BarChart3,
  Table as TableIcon,
  Loader2,
  CheckCircle,
  RefreshCw,
  Brain,
  Sparkle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { DatasourceAPI, type DatasourceListItem } from "@/lib/api/datasources";
import { SelectModel } from "@/components/select-model";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { useChat } from "@ai-sdk/react";
import { generateUUID } from "@/lib/utils";

// Import Recharts components
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Bar,
  Line,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Label,
} from "recharts";

// Import chart UI components
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Import types for the tool-invocation charts
import type { PieChartProps } from "@/components/tool-invocation/pie-chart";
import type { BarChartProps } from "@/components/tool-invocation/bar-chart";
import type { LineChartProps } from "@/components/tool-invocation/line-chart";

type ChartType = "line" | "bar" | "pie";

// Union type for chart props
type ChartProps = PieChartProps | BarChartProps | LineChartProps;

interface ChartCard {
  id: string;
  query: string;
  sql: string;
  data: any[];
  chartType: ChartType;
  chartProps: ChartProps;
  isExpanded: boolean;
  executionTime?: number;
  rowCount?: number;
  chartTitle?: string;
}

interface DatabaseTable {
  name: string;
  schema: string;
  rowCount?: number;
  description?: string;
}

interface DatabaseSchema {
  name: string;
  tableCount?: number;
}

// Optimized ChartContent component with React.memo
const ChartContent = React.memo(({ chart }: { chart: ChartCard }) => {
  const { chartType, chartProps, data } = chart;

  // Calculate all possible chart configurations at the top level
  const pieConfig = useMemo(() => {
    if (chartType !== "pie" || !chartProps || !data || data.length === 0)
      return null;
    const pieProps = chartProps as PieChartProps;
    const config: any = {};
    if (pieProps.unit) {
      config.value = { label: pieProps.unit };
    }
    pieProps.data.forEach((item, index) => {
      const colorIndex = index % 5;
      const colors = [
        "var(--chart-1)",
        "var(--chart-2)",
        "var(--chart-3)",
        "var(--chart-4)",
        "var(--chart-5)",
      ];
      config[item.label.replace(/[^a-zA-Z0-9]/g, "_")] = {
        label: item.label,
        color: colors[colorIndex],
      };
    });
    return config;
  }, [chartType, chartProps, data]);

  const pieChartData = useMemo(() => {
    if (chartType !== "pie" || !chartProps || !data || data.length === 0)
      return null;
    const pieProps = chartProps as PieChartProps;
    return pieProps.data.map((item) => ({
      name: item.label,
      label: item.label,
      value: item.value,
      fill: `var(--color-${item.label.replace(/[^a-zA-Z0-9]/g, "_")})`,
    }));
  }, [chartType, chartProps, data]);

  const pieTotal = useMemo(() => {
    if (chartType !== "pie" || !chartProps || !data || data.length === 0)
      return 0;
    const pieProps = chartProps as PieChartProps;
    return pieProps.data.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartType, chartProps, data]);

  const barConfig = useMemo(() => {
    if (chartType !== "bar" || !chartProps || !data || data.length === 0)
      return null;
    const barProps = chartProps as BarChartProps;
    const seriesNames =
      barProps.data[0]?.series.map((item) => item.seriesName) || [];
    const config: any = {};
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    seriesNames.forEach((seriesName, index) => {
      const colorIndex = index % colors.length;
      config[seriesName.replace(/[^a-zA-Z0-9]/g, "_")] = {
        label: seriesName,
        color: colors[colorIndex],
      };
    });
    return { config, seriesNames };
  }, [chartType, chartProps, data]);

  const barChartData = useMemo(() => {
    if (chartType !== "bar" || !chartProps || !data || data.length === 0)
      return null;
    const barProps = chartProps as BarChartProps;
    return barProps.data.map((item) => {
      const result: any = { name: item.xAxisLabel };
      item.series.forEach(({ seriesName, value }) => {
        result[seriesName.replace(/[^a-zA-Z0-9]/g, "_")] = value;
      });
      return result;
    });
  }, [chartType, chartProps, data]);

  const lineConfig = useMemo(() => {
    if (chartType !== "line" || !chartProps || !data || data.length === 0)
      return null;
    const lineProps = chartProps as LineChartProps;
    const seriesNames =
      lineProps.data[0]?.series.map((item) => item.seriesName) || [];
    const config: any = {};
    const colors = [
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ];
    seriesNames.forEach((seriesName, index) => {
      const colorIndex = index % colors.length;
      config[seriesName.replace(/[^a-zA-Z0-9]/g, "_")] = {
        label: seriesName,
        color: colors[colorIndex],
      };
    });
    return { config, seriesNames };
  }, [chartType, chartProps, data]);

  const lineChartData = useMemo(() => {
    if (chartType !== "line" || !chartProps || !data || data.length === 0)
      return null;
    const lineProps = chartProps as LineChartProps;
    return lineProps.data.map((item) => {
      const result: any = { name: item.xAxisLabel };
      item.series.forEach(({ seriesName, value }) => {
        result[seriesName.replace(/[^a-zA-Z0-9]/g, "_")] = value;
      });
      return result;
    });
  }, [chartType, chartProps, data]);

  if (!chartProps || !data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  // Render based on chart type
  if (chartType === "pie" && pieConfig && pieChartData) {
    const pieProps = chartProps as PieChartProps;
    return (
      <div className="flex-1 pb-0">
        <ChartContainer
          config={pieConfig}
          className="mx-auto aspect-square max-h-[280px] w-full"
        >
          <RechartsPieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={pieChartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {pieTotal.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          {pieProps.unit || "Total"}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </RechartsPieChart>
        </ChartContainer>
      </div>
    );
  }

  if (chartType === "bar" && barConfig && barChartData) {
    const barProps = chartProps as BarChartProps;
    return (
      <div className="w-full h-full">
        <ChartContainer config={barConfig.config} className="w-full h-full">
          <ResponsiveContainer width="100%" height={280}>
            <RechartsBarChart
              data={barChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                label={
                  barProps.yAxisLabel
                    ? {
                        value: barProps.yAxisLabel,
                        angle: -90,
                        position: "insideLeft",
                      }
                    : undefined
                }
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dashed" />}
              />
              {barConfig.seriesNames.map((seriesName, index) => (
                <Bar
                  key={index}
                  dataKey={seriesName.replace(/[^a-zA-Z0-9]/g, "_")}
                  fill={`var(--color-${seriesName.replace(/[^a-zA-Z0-9]/g, "_")})`}
                  radius={4}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }

  if (chartType === "line" && lineConfig && lineChartData) {
    const lineProps = chartProps as LineChartProps;
    return (
      <div className="w-full h-full">
        <ChartContainer config={lineConfig.config} className="w-full h-full">
          <ResponsiveContainer width="100%" height={280}>
            <RechartsLineChart
              data={lineChartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                label={
                  lineProps.yAxisLabel
                    ? {
                        value: lineProps.yAxisLabel,
                        angle: -90,
                        position: "insideLeft",
                      }
                    : undefined
                }
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Legend />
              {lineConfig.seriesNames.map((seriesName, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={seriesName.replace(/[^a-zA-Z0-9]/g, "_")}
                  stroke={`var(--color-${seriesName.replace(/[^a-zA-Z0-9]/g, "_")})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Unsupported chart type
    </div>
  );
});

ChartContent.displayName = "ChartContent";

// Optimized ChartCardComponent with React.memo
interface ChartCardProps {
  chart: ChartCard;
  aiInputOpen: { [key: string]: boolean };
  aiInputQuery: { [key: string]: string };
  isModifyLoading: boolean;
  onAiInputOpenChange: (chartId: string, open: boolean) => void;
  onAiInputQueryChange: (chartId: string, value: string) => void;
  onAiInputSubmit: (chartId: string) => void;
  onToggleExpansion: (chartId: string) => void;
}

const ChartCardComponent = React.memo(
  ({
    chart,
    aiInputOpen,
    aiInputQuery,
    isModifyLoading,
    onAiInputOpenChange,
    onAiInputQueryChange,
    onAiInputSubmit,
    onToggleExpansion,
  }: ChartCardProps) => {
    // Memoized handlers to prevent unnecessary re-renders and focus loss
    const handleQueryChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onAiInputQueryChange(chart.id, e.target.value);
      },
      [chart.id, onAiInputQueryChange],
    );

    const handleCancelClick = useCallback(() => {
      onAiInputOpenChange(chart.id, false);
      onAiInputQueryChange(chart.id, "");
    }, [chart.id, onAiInputOpenChange, onAiInputQueryChange]);

    const handleUpdateClick = useCallback(() => {
      onAiInputSubmit(chart.id);
    }, [chart.id, onAiInputSubmit]);

    const handleToggleClick = useCallback(() => {
      onToggleExpansion(chart.id);
    }, [chart.id, onToggleExpansion]);

    const handlePopoverOpenChange = useCallback(
      (open: boolean) => {
        onAiInputOpenChange(chart.id, open);
      },
      [chart.id, onAiInputOpenChange],
    );

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{chart.chartProps.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {chart.rowCount} rows
              </Badge>
              <Badge variant="outline" className="text-xs">
                {chart.executionTime}ms
              </Badge>
              <Popover
                open={aiInputOpen[chart.id] || false}
                onOpenChange={handlePopoverOpenChange}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shadow text-purple-700"
                  >
                    <Sparkle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4">
                  <div className="space-y-4">
                    <div>
                      <FormLabel
                        htmlFor={`ai-query-${chart.id}`}
                        className="text-sm font-medium"
                      >
                        Modify Query
                      </FormLabel>
                      <Textarea
                        id={`ai-query-${chart.id}`}
                        placeholder="Enter a new query or modifications to the current query..."
                        value={aiInputQuery[chart.id] || ""}
                        onChange={handleQueryChange}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelClick}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdateClick}
                        disabled={isModifyLoading}
                      >
                        {isModifyLoading ? "Updating..." : "Update Chart"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                className="shadow text-purple-800"
                onClick={handleToggleClick}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!chart.isExpanded ? (
            <div className="h-[300px] w-full overflow-hidden">
              <ChartContent chart={chart} />
            </div>
          ) : (
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="sql">SQL Query</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="mt-4">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {chart.data.length > 0 &&
                          Object.keys(chart.data[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chart.data.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {value?.toString() || ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="sql" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                      <code>{chart.sql}</code>
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    );
  },
);

ChartCardComponent.displayName = "ChartCardComponent";

export default function AnalyticsStudioPage() {
  // State management
  const [datasources, setDatasources] = useState<DatasourceListItem[]>([]);
  const [selectedDatasource, setSelectedDatasource] =
    useState<DatasourceListItem | null>(null);
  const [availableSchemas, setAvailableSchemas] = useState<DatabaseSchema[]>(
    [],
  );
  const [selectedSchema, setSelectedSchema] = useState<string>("");
  const [availableTables, setAvailableTables] = useState<DatabaseTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [chartCards, setChartCards] = useState<ChartCard[]>([]);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [expandedSidebar, setExpandedSidebar] = useState(true);

  // Get model from app store (same as chat page)
  const selectedModel = appStore(useShallow((state) => state.chatModel));

  // State to track processed tool invocations to prevent infinite loops
  const [processedInvocations, setProcessedInvocations] = useState<Set<string>>(
    new Set(),
  );
  const [processedModifyInvocations, setProcessedModifyInvocations] = useState<
    Set<string>
  >(new Set());

  // State to track which chart is currently being modified
  const [modifyingChartId, setModifyingChartId] = useState<string | null>(null);

  // AI Input state - simplified to only handle query modification
  const [aiInputOpen, setAiInputOpen] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [aiInputQuery, setAiInputQuery] = useState<{ [key: string]: string }>(
    {},
  );

  // Use AI SDK's useChat for main query generation
  const {
    messages,
    input,
    setInput,
    append,
    isLoading: isChatLoading,
  } = useChat({
    api: "/api/chat",
    generateId: generateUUID,
    experimental_prepareRequestBody: ({ messages, requestBody }) => {
      const lastMessage = messages.at(-1)!;
      return {
        id: generateUUID(),
        chatModel: selectedModel || { provider: "openai", model: "gpt-4" },
        toolChoice: "auto" as const,
        allowedAppDefaultToolkit: ["analytics"],
        allowedMcpServers: {},
        mentions: [],
        message: lastMessage,
      };
    },
  });

  // Use AI SDK's useChat for chart modifications
  const {
    messages: modifyMessages,
    append: modifyAppend,
    isLoading: isModifyLoading,
  } = useChat({
    api: "/api/chat",
    generateId: generateUUID,
    experimental_prepareRequestBody: ({ messages, requestBody }) => {
      const lastMessage = messages.at(-1)!;
      return {
        id: generateUUID(),
        chatModel: selectedModel || { provider: "openai", model: "gpt-4" },
        toolChoice: "auto" as const,
        allowedAppDefaultToolkit: ["analytics"],
        allowedMcpServers: {},
        mentions: [],
        message: lastMessage,
      };
    },
  });

  // Watch for new tool results in the main chat messages
  useEffect(() => {
    const lastMessage = messages.at(-1);
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      for (const invocation of lastMessage.toolInvocations) {
        if (
          invocation.toolName === "textToSql" &&
          invocation.state === "result"
        ) {
          const result = (invocation as any).result;

          // Create a unique key for this invocation to prevent duplicate processing
          const invocationKey = `${lastMessage.id}-${invocation.toolCallId}-${result.query || ""}-${result.chartType || ""}`;

          // Skip if we've already processed this invocation
          if (processedInvocations.has(invocationKey)) {
            continue;
          }

          if (result?.success) {
            const processResult = async () => {
              try {
                const chartProps = await generateChartProps(
                  result.query,
                  result.data,
                  result.chartType,
                  result.chartTitle,
                );

                const newChart: ChartCard = {
                  id: generateUUID(),
                  query: result.query,
                  chartType: result.chartType,
                  chartProps: chartProps,
                  sql: result.sql || "",
                  data: result.data,
                  isExpanded: false,
                  executionTime: result.executionTime,
                  rowCount: result.rowCount,
                  chartTitle: result.chartTitle,
                };

                // Use functional update to prevent duplicate charts
                setChartCards((prev) => {
                  // Check if chart with same query, chartType, and similar data already exists
                  const exists = prev.some(
                    (chart) =>
                      chart.query === result.query &&
                      chart.chartType === result.chartType &&
                      JSON.stringify(chart.data) ===
                        JSON.stringify(result.data),
                  );
                  if (exists) {
                    console.log("Duplicate chart prevented:", {
                      query: result.query,
                      chartType: result.chartType,
                      existingCharts: prev.length,
                    });
                    return prev;
                  }
                  console.log("Adding new chart:", {
                    query: result.query,
                    chartType: result.chartType,
                    totalCharts: prev.length + 1,
                  });
                  return [...prev, newChart];
                });

                // Mark this invocation as processed immediately
                setProcessedInvocations(
                  (prev) => new Set([...prev, invocationKey]),
                );

                toast.success("Chart generated successfully!");
              } catch (error) {
                console.error("Error processing chart result:", error);
                toast.error("Failed to process chart data");
                // Still mark as processed to prevent retry loops
                setProcessedInvocations(
                  (prev) => new Set([...prev, invocationKey]),
                );
              }
            };
            processResult();
          } else {
            toast.error(result?.error || "Failed to generate chart");
            // Mark failed invocations as processed too
            setProcessedInvocations(
              (prev) => new Set([...prev, invocationKey]),
            );
          }
        }
      }
    }
  }, [messages]); // Remove processedInvocations from dependency array

  // Watch for modification results
  useEffect(() => {
    const lastMessage = modifyMessages.at(-1);
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      for (const invocation of lastMessage.toolInvocations) {
        if (
          invocation.toolName === "textToSql" &&
          invocation.state === "result"
        ) {
          const result = (invocation as any).result;

          // Create a unique key for this modification invocation
          const invocationKey = `modify-${lastMessage.id}-${invocation.toolCallId}-${result.query || ""}-${modifyingChartId || ""}`;

          // Skip if we've already processed this invocation
          if (processedModifyInvocations.has(invocationKey)) {
            continue;
          }

          if (result?.success) {
            const processResult = async () => {
              try {
                const chartProps = await generateChartProps(
                  result.query,
                  result.data,
                  result.chartType,
                  result.chartTitle,
                );

                // Update the specific chart that was being modified
                setChartCards((prev) => {
                  if (prev.length === 0 || !modifyingChartId) {
                    console.warn(
                      "No charts to modify or no modifyingChartId set",
                    );
                    return prev;
                  }

                  const chartIndex = prev.findIndex(
                    (chart) => chart.id === modifyingChartId,
                  );
                  if (chartIndex === -1) {
                    console.warn(
                      `Chart with ID ${modifyingChartId} not found for modification`,
                    );
                    return prev;
                  }

                  console.log(
                    `Updating chart ${modifyingChartId} at index ${chartIndex}`,
                  );

                  return prev.map((chart) =>
                    chart.id === modifyingChartId
                      ? {
                          ...chart,
                          query: result.query,
                          chartType: result.chartType,
                          chartProps: chartProps,
                          sql: result.sql || "",
                          data: result.data || [],
                          executionTime: result.executionTime,
                          rowCount: result.rowCount,
                          chartTitle: result.chartTitle,
                        }
                      : chart,
                  );
                });

                // Clear the modifying chart ID
                setModifyingChartId(null);

                // Mark this invocation as processed immediately
                setProcessedModifyInvocations(
                  (prev) => new Set([...prev, invocationKey]),
                );

                toast.success("Chart updated successfully!");
              } catch (error) {
                console.error("Error processing chart modification:", error);
                toast.error("Failed to process chart update");
                // Clear the modifying chart ID on error
                setModifyingChartId(null);
                // Still mark as processed to prevent retry loops
                setProcessedModifyInvocations(
                  (prev) => new Set([...prev, invocationKey]),
                );
              }
            };
            processResult();
          } else {
            toast.error(result?.error || "Failed to update chart");
            // Clear the modifying chart ID on error
            setModifyingChartId(null);
            // Mark failed invocations as processed too
            setProcessedModifyInvocations(
              (prev) => new Set([...prev, invocationKey]),
            );
          }
        }
      }
    }
  }, [modifyMessages, modifyingChartId]); // Include modifyingChartId for proper updates

  // Load datasources on mount
  useEffect(() => {
    loadDatasources();
  }, []);

  // Load schemas when datasource is selected
  useEffect(() => {
    if (selectedDatasource) {
      loadSchemas();
    } else {
      setAvailableSchemas([]);
      setSelectedSchema("");
      setAvailableTables([]);
      setSelectedTables([]);
      // Clear any ongoing modifications when datasource changes
      setModifyingChartId(null);
      setProcessedInvocations(new Set());
      setProcessedModifyInvocations(new Set());
    }
  }, [selectedDatasource]);

  // Load tables when schema is selected
  useEffect(() => {
    if (selectedDatasource && selectedSchema) {
      loadTables();
    } else {
      setAvailableTables([]);
      setSelectedTables([]);
    }
  }, [selectedDatasource, selectedSchema]);

  const loadDatasources = async () => {
    try {
      const response = await DatasourceAPI.listDatasources();
      if (response.success && response.data) {
        setDatasources(response.data.filter((ds) => ds.status === "connected"));
      }
    } catch (error) {
      console.error("Error loading datasources:", error);
      toast.error("Failed to load datasources");
    }
  };

  const loadSchemas = async () => {
    if (!selectedDatasource) return;

    setIsLoadingSchemas(true);
    try {
      // Use API route to get database schema
      const response = await fetch(
        `/api/analytics/schema?datasourceId=${selectedDatasource.id}`,
      );
      const result = await response.json();

      if (result.success && result.schema) {
        // Extract unique schemas from the schema response
        const schemas = result.schema.schemas || [];
        const schemaList = schemas.map((schema: string) => ({
          name: schema,
          tableCount:
            result.schema.tables?.filter(
              (table: any) => table.schema === schema,
            )?.length || 0,
        }));
        setAvailableSchemas(schemaList);

        // Auto-select first schema if available
        if (schemaList.length > 0) {
          setSelectedSchema(schemaList[0].name);
        }
      } else {
        toast.error("Failed to load database schemas");
      }
    } catch (error) {
      console.error("Error loading schemas:", error);
      toast.error("Failed to load database schemas");
    } finally {
      setIsLoadingSchemas(false);
    }
  };

  const loadTables = async () => {
    if (!selectedDatasource || !selectedSchema) return;

    setIsLoadingTables(true);
    try {
      // Use API route to get database schema
      const response = await fetch(
        `/api/analytics/schema?datasourceId=${selectedDatasource.id}`,
      );
      const result = await response.json();

      if (result.success && result.schema) {
        // Filter tables by selected schema
        const filteredTables =
          result.schema.tables?.filter(
            (table: any) => table.schema === selectedSchema,
          ) || [];
        setAvailableTables(filteredTables);
      } else {
        toast.error("Failed to load database tables");
      }
    } catch (error) {
      console.error("Error loading tables:", error);
      toast.error("Failed to load database tables");
    } finally {
      setIsLoadingTables(false);
    }
  };

  const refreshData = async () => {
    if (selectedDatasource && selectedSchema) {
      await loadTables();
    } else if (selectedDatasource) {
      await loadSchemas();
    } else {
      await loadDatasources();
    }
  };

  const handleTableSelection = (table: DatabaseTable) => {
    const fullTableName = table.schema
      ? `${table.schema}.${table.name}`
      : table.name;
    setSelectedTables((prev) => {
      if (prev.includes(fullTableName)) {
        return prev.filter((t) => t !== fullTableName);
      } else {
        return [...prev, fullTableName];
      }
    });
  };

  // Helper functions to convert data to chart props
  const convertToBarChartProps = (
    data: any[],
    query: string,
    title?: string,
  ): BarChartProps => {
    if (!data || data.length === 0) {
      return {
        title: title || "Bar Chart",
        data: [],
      };
    }

    const keys = Object.keys(data[0]);
    const xAxisKey = keys[0];
    const valueKeys = keys.slice(1);

    return {
      title: title || `Bar Chart - ${query}`,
      data: data.map((item) => ({
        xAxisLabel: String(item[xAxisKey]),
        series: valueKeys.map((key) => ({
          seriesName: key,
          value: Number(item[key]) || 0,
        })),
      })),
      description: `Generated from query: ${query}`,
    };
  };

  const convertToLineChartProps = (
    data: any[],
    query: string,
    title?: string,
  ): LineChartProps => {
    if (!data || data.length === 0) {
      return {
        title: title || "Line Chart",
        data: [],
      };
    }

    const keys = Object.keys(data[0]);
    const xAxisKey = keys[0];
    const valueKeys = keys.slice(1);

    return {
      title: title || `Line Chart - ${query}`,
      data: data.map((item) => ({
        xAxisLabel: String(item[xAxisKey]),
        series: valueKeys.map((key) => ({
          seriesName: key,
          value: Number(item[key]) || 0,
        })),
      })),
      description: `Generated from query: ${query}`,
    };
  };

  const convertToPieChartProps = (
    data: any[],
    query: string,
    title?: string,
  ): PieChartProps => {
    if (!data || data.length === 0) {
      return {
        title: title || "Pie Chart",
        data: [],
      };
    }

    const keys = Object.keys(data[0]);
    const labelKey = keys[0];
    const valueKey = keys[1] || keys[0];

    return {
      title: title || `Pie Chart - ${query}`,
      data: data.map((item) => ({
        label: String(item[labelKey]),
        value: Number(item[valueKey]) || 0,
      })),
      description: `Generated from query: ${query}`,
    };
  };

  const generateChart = async () => {
    if (!input.trim() || selectedTables.length === 0 || !selectedDatasource) {
      toast.error("Please select tables and enter a query");
      return;
    }

    // Reset processed invocations for new query session
    setProcessedInvocations(new Set());
    setProcessedModifyInvocations(new Set());

    // Create a comprehensive prompt for the AI to understand the context
    const contextPrompt = `
Generate and execute a SQL query for the following request:

Query: "${input}"
Selected Tables: ${selectedTables.join(", ")}
Datasource ID: ${selectedDatasource.id}

Please analyze the user's request and determine the most appropriate chart type (bar, line, or pie) based on:
1. Explicit chart type mentions in the query
2. The nature of the data being requested
3. Time-based patterns (use line charts)
4. Categorical distributions (use pie charts for ≤10 items)
5. Comparisons and counts (use bar charts)

Use the textToSql tool to execute this request.
    `;

    await append({
      role: "user",
      content: contextPrompt,
    });

    setInput("");
  };

  const handleAiInputSubmit = useCallback(
    async (chartId: string) => {
      const query = aiInputQuery[chartId];

      if (!query.trim()) {
        toast.error("Please provide a query modification");
        return;
      }

      if (!selectedDatasource) {
        toast.error("No datasource selected");
        return;
      }

      // Set the chart being modified
      console.log("Starting chart modification for chart ID:", chartId);
      setModifyingChartId(chartId);

      // Reset processed modification invocations for new modification session
      setProcessedModifyInvocations(new Set());

      // Create a modification prompt
      const modificationPrompt = `
Modify the existing chart with the following request:

Original Chart ID: ${chartId}
Modification Request: "${query}"
Selected Tables: ${selectedTables.join(", ")}
Datasource ID: ${selectedDatasource.id}

Please generate a new SQL query and determine the appropriate chart type based on the modification request.
Use the textToSql tool to execute this updated request.
    `;

      await modifyAppend({
        role: "user",
        content: modificationPrompt,
      });

      // Close the AI Input popover and clear the input
      setAiInputOpen((prev) => ({ ...prev, [chartId]: false }));
      setAiInputQuery((prev) => ({ ...prev, [chartId]: "" }));
    },
    [
      aiInputQuery,
      selectedDatasource,
      selectedTables,
      modifyAppend,
      setModifyingChartId,
    ],
  );

  const toggleChartExpansion = useCallback((chartId: string) => {
    setChartCards((prev) =>
      prev.map((chart) =>
        chart.id === chartId
          ? { ...chart, isExpanded: !chart.isExpanded }
          : chart,
      ),
    );
  }, []);

  // New optimized callback handlers for the ChartCardComponent
  const handleAiInputOpenChange = useCallback(
    (chartId: string, open: boolean) => {
      setAiInputOpen((prev) => ({ ...prev, [chartId]: open }));
    },
    [],
  );

  const handleAiInputQueryChange = useCallback(
    (chartId: string, value: string) => {
      setAiInputQuery((prev) => ({ ...prev, [chartId]: value }));
    },
    [],
  );

  const generateChartProps = async (
    query: string,
    data: any[],
    chartType: ChartType,
    title?: string,
  ): Promise<ChartProps> => {
    const finalTitle = title || query;

    // Convert data to appropriate format based on chart type
    switch (chartType) {
      case "bar":
        return convertToBarChartProps(data, query, finalTitle);
      case "line":
        return convertToLineChartProps(data, query, finalTitle);
      case "pie":
        return convertToPieChartProps(data, query, finalTitle);
      default:
        return convertToBarChartProps(data, query, finalTitle);
    }
  };

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar - Dataset Selection */}
      <div
        className={`border-r bg-muted/20 transition-all duration-300 flex flex-col ${expandedSidebar ? "w-80" : "w-16"}`}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            {expandedSidebar && (
              <h2 className="text-lg font-semibold">
                Select datasets and tables
              </h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSidebar(!expandedSidebar)}
            >
              {expandedSidebar ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {expandedSidebar && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Datasource Selection */}
              <div className="mb-6 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Database</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshData}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
                <Select
                  value={selectedDatasource?.id}
                  onValueChange={(value) => {
                    const datasource = datasources.find(
                      (ds) => ds.id === value,
                    );
                    setSelectedDatasource(datasource || null);
                    setSelectedSchema("");
                    setSelectedTables([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select database" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasources.map((datasource) => (
                      <SelectItem key={datasource.id} value={datasource.id}>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          {datasource.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Schema Selection */}
              {selectedDatasource && (
                <div className="mb-6 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Schema</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshData}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  {isLoadingSchemas ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <Select
                      value={selectedSchema}
                      onValueChange={(value) => {
                        setSelectedSchema(value);
                        setSelectedTables([]);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select schema" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSchemas.map((schema) => (
                          <SelectItem key={schema.name} value={schema.name}>
                            <div className="flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              <span>{schema.name}</span>
                              {schema.tableCount && (
                                <span className="text-xs text-muted-foreground">
                                  ({schema.tableCount} tables)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Table Selection */}
              {selectedDatasource && selectedSchema && (
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <label className="text-sm font-medium">Tables</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshData}
                      className="h-6 w-6 p-0"
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                  {isLoadingTables ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0">
                      <div className="h-full overflow-y-auto">
                        <div className="space-y-2 pr-2">
                          <TooltipProvider>
                            {availableTables.map((table) => (
                              <Tooltip key={table.name}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                      selectedTables.includes(
                                        table.schema
                                          ? `${table.schema}.${table.name}`
                                          : table.name,
                                      )
                                        ? "bg-primary/10 border-primary"
                                        : "bg-background hover:bg-muted"
                                    }`}
                                    onClick={() => handleTableSelection(table)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <TableIcon className="h-4 w-4 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm truncate">
                                          {table.name}
                                        </div>
                                      </div>
                                      {selectedTables.includes(
                                        table.schema
                                          ? `${table.schema}.${table.name}`
                                          : table.name,
                                      ) && (
                                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                      )}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{table.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </TooltipProvider>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Analytics Studio</h1>
              <p className="text-muted-foreground mt-1">
                Generate insights from your data using natural language
              </p>
            </div>
            {selectedTables.length > 0 && (
              <Badge variant="secondary">
                {selectedTables.length} table
                {selectedTables.length !== 1 ? "s" : ""} selected
              </Badge>
            )}
          </div>
        </div>

        {/* Query Input */}
        <div className="p-6 border-b bg-muted/20">
          <div className="max-w-4xl">
            <label className="text-sm font-medium mb-2 block">
              Ask a question about your data
            </label>
            <div className="flex gap-3">
              <Textarea
                placeholder="Get me a line chart of monthly revenue, for premium and enterprise in EMEA - bar chart of monthly user signups, clustered by plan. Also in EMEA, all tiers except free for the last 6 months"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 min-h-[60px] resize-none"
                disabled={isChatLoading}
              />
              <div className="flex gap-2">
                <SelectModel
                  onSelect={(model) => {
                    appStore.setState({ chatModel: model });
                  }}
                  defaultModel={selectedModel}
                  align="end"
                >
                  <Button variant="outline" className="px-3 min-w-[120px] h-10">
                    <Brain className="h-4 w-4 mr-2" />
                    {selectedModel?.model || "Select Model"}
                  </Button>
                </SelectModel>
                <Button
                  onClick={generateChart}
                  disabled={
                    !input.trim() ||
                    selectedTables.length === 0 ||
                    isChatLoading
                  }
                  className="px-8 h-10"
                >
                  {isChatLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <BarChart3 className="h-4 w-4 mr-2" />
                  )}
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Area */}
        <div className="flex-1 p-6 overflow-auto">
          {chartCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No charts yet</h3>
              <p className="text-muted-foreground max-w-md">
                Select a database, schema, and tables from the sidebar and ask a
                question to generate your first chart
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {chartCards.map((chart) => (
                <ChartCardComponent
                  key={chart.id}
                  chart={chart}
                  aiInputOpen={aiInputOpen}
                  aiInputQuery={aiInputQuery}
                  isModifyLoading={isModifyLoading}
                  onAiInputOpenChange={handleAiInputOpenChange}
                  onAiInputQueryChange={handleAiInputQueryChange}
                  onAiInputSubmit={handleAiInputSubmit}
                  onToggleExpansion={toggleChartExpansion}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
