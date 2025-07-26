"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Label } from "@/components/ui/label";
import {
  ChevronDown,
  ChevronRight,
  Database,
  Play,
  Eye,
  BarChart3,
  Table as TableIcon,
  Loader2,
  CheckCircle,
  RefreshCw,
  Brain,
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart as RechartsBarChart,
  PieChart as RechartsPieChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Pie,
  Cell,
} from "recharts";
import { generateText } from "ai";
import { customModelProvider } from "@/lib/ai/models";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";

interface ChartCard {
  id: string;
  query: string;
  sql: string;
  data: any[];
  chartType: "line" | "bar" | "pie";
  title: string;
  isExpanded: boolean;
  executionTime?: number;
  rowCount?: number;
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
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartCards, setChartCards] = useState<ChartCard[]>([]);
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [expandedSidebar, setExpandedSidebar] = useState(true);

  // Get model from app store (same as chat page)
  const selectedModel = appStore(useShallow((state) => state.chatModel));

  // AI Input state
  const [aiInputOpen, setAiInputOpen] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [aiInputQuery, setAiInputQuery] = useState<{ [key: string]: string }>(
    {},
  );
  const [aiChartType, setAiChartType] = useState<{
    [key: string]: "line" | "bar" | "pie";
  }>({});

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

  const generateChartTitle = async (
    query: string,
    data: any[],
    chartType: string,
  ): Promise<string> => {
    try {
      // Analyze the data structure
      const dataKeys = data.length > 0 ? Object.keys(data[0]) : [];
      const dataSample = data.slice(0, 3);

      const prompt = `
        Based on the user query, data structure, and chart type, generate a concise, descriptive title for the chart.
        
        User Query: "${query}"
        Chart Type: ${chartType}
        Data Columns: ${dataKeys.join(", ")}
        Sample Data: ${JSON.stringify(dataSample, null, 2)}
        
        Generate a clear, professional chart title that describes what the chart shows.
        Keep it under 10 words and make it specific to the data being visualized.
        
        Respond with ONLY the title text, no quotes or additional formatting.
      `;

      // Use AI SDK instead of direct API call
      const model = customModelProvider.getModel(selectedModel);

      const { text } = await generateText({
        model,
        system:
          "You are a data visualization expert. Generate concise, professional chart titles. Respond only with the title text.",
        prompt,
        temperature: 0.3,
        maxTokens: 100,
      });

      return text.trim() || query;
    } catch (error) {
      console.error("Error generating chart title:", error);
      return query; // Fallback to original query
    }
  };

  const generateChart = async () => {
    if (
      !naturalLanguageQuery.trim() ||
      selectedTables.length === 0 ||
      !selectedDatasource
    ) {
      toast.error("Please select tables and enter a query");
      return;
    }

    setIsGenerating(true);
    try {
      // Use API route to generate and execute SQL
      const response = await fetch("/api/analytics/text-to-sql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: naturalLanguageQuery,
          selectedTables,
          datasourceId: selectedDatasource.id,
          aiProvider: selectedModel?.provider || "openai",
          aiModel: selectedModel?.model || "gpt-4",
          maxRetries: 3,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Determine chart type based on data structure
        const chartType = determineChartType(result.data);

        // Generate AI-powered title for the chart
        const aiTitle = await generateChartTitle(
          naturalLanguageQuery,
          result.data,
          chartType,
        );

        const newChart: ChartCard = {
          id: Date.now().toString(),
          query: naturalLanguageQuery,
          title: aiTitle,
          chartType: chartType,
          sql: result.sql || "",
          data: result.data,
          isExpanded: false,
          executionTime: result.executionTime,
          rowCount: result.data.length,
        };

        setChartCards((prev) => [...prev, newChart]);
        setNaturalLanguageQuery("");
        toast.success("Chart generated successfully!");
      } else {
        toast.error(result.error || "Failed to generate chart");
      }
    } catch (error) {
      console.error("Error generating chart:", error);
      toast.error("Failed to generate chart");
    } finally {
      setIsGenerating(false);
    }
  };

  const determineChartType = (data: any[]): "line" | "bar" | "pie" => {
    if (data.length === 0) return "bar";

    const keys = Object.keys(data[0]);
    const hasDateColumn = keys.some(
      (key) =>
        key.toLowerCase().includes("date") ||
        key.toLowerCase().includes("time") ||
        key.toLowerCase().includes("month") ||
        key.toLowerCase().includes("year"),
    );

    if (hasDateColumn) return "line";
    if (data.length <= 10 && keys.length === 2) return "pie";
    return "bar";
  };

  const toggleChartExpansion = (chartId: string) => {
    setChartCards((prev) =>
      prev.map((chart) =>
        chart.id === chartId
          ? { ...chart, isExpanded: !chart.isExpanded }
          : chart,
      ),
    );
  };

  const handleAiInputSubmit = async (chartId: string) => {
    const query = aiInputQuery[chartId];
    const chartType = aiChartType[chartId];

    if (!query && !chartType) {
      toast.error("Please provide a query modification or select a chart type");
      return;
    }

    setIsGenerating(true);
    try {
      // If user provided a new query, regenerate with the modified query
      if (query) {
        if (!selectedDatasource) {
          toast.error("No datasource selected");
          return;
        }

        // Use API route to generate and execute SQL
        const response = await fetch("/api/analytics/text-to-sql", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query,
            selectedTables,
            datasourceId: selectedDatasource.id,
            aiProvider: selectedModel?.provider || "openai",
            aiModel: selectedModel?.model || "gpt-4",
            maxRetries: 3,
          }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          const newChartType = chartType || determineChartType(result.data);

          setChartCards((prev) =>
            prev.map((chart) =>
              chart.id === chartId
                ? {
                    ...chart,
                    query: query,
                    title: query,
                    sql: result.sql || "",
                    data: result.data || [],
                    chartType: newChartType,
                    executionTime: result.executionTime,
                    rowCount: result.data?.length || 0,
                  }
                : chart,
            ),
          );

          toast.success("Chart updated successfully!");
        } else {
          toast.error(result.error || "Failed to update chart");
        }
      } else if (chartType) {
        // Just update the chart type without regenerating data
        setChartCards((prev) =>
          prev.map((chart) =>
            chart.id === chartId ? { ...chart, chartType: chartType } : chart,
          ),
        );
        toast.success("Chart type updated!");
      }

      // Close the AI Input popover and clear the input
      setAiInputOpen((prev) => ({ ...prev, [chartId]: false }));
      setAiInputQuery((prev) => ({ ...prev, [chartId]: "" }));
      setAiChartType((prev) => ({ ...prev, [chartId]: "bar" }));
    } catch (error) {
      console.error("Error updating chart:", error);
      toast.error("Failed to update chart");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderChart = (chart: ChartCard) => {
    const { data, chartType } = chart;

    if (!data || data.length === 0) return <div>No data available</div>;

    const keys = Object.keys(data[0]);
    const xKey = keys[0];
    const yKey = keys[1];

    // Use proper color values instead of CSS variables that might not exist
    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"];

    // Chart configuration for ChartContainer
    const chartConfig = {
      [yKey]: {
        label: yKey,
        color: colors[0],
      },
    };

    switch (chartType) {
      case "line":
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke={colors[0]}
                  strokeWidth={2}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "bar":
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={xKey} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey={yKey} fill={colors[0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "pie":
        return (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={data}
                  dataKey={yKey}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill={colors[0]}
                  label
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const ChartCard = ({ chart }: { chart: ChartCard }) => {
    // Memoized handlers to prevent unnecessary re-renders and focus loss
    const handleQueryChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setAiInputQuery((prev) => ({
          ...prev,
          [chart.id]: value,
        }));
      },
      [chart.id],
    );

    const handleChartTypeChange = useCallback(
      (value: "line" | "bar" | "pie") => {
        setAiChartType((prev) => ({
          ...prev,
          [chart.id]: value,
        }));
      },
      [chart.id],
    );

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{chart.title}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {chart.rowCount} rows
              </Badge>
              <Badge variant="outline" className="text-xs">
                {chart.executionTime}ms
              </Badge>
              <Popover
                open={aiInputOpen[chart.id] || false}
                onOpenChange={(open) =>
                  setAiInputOpen((prev) => ({ ...prev, [chart.id]: open }))
                }
              >
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-primary">
                    <Play className="h-4 w-4 mr-1" />
                    AI Input
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4">
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor={`ai-query-${chart.id}`}
                        className="text-sm font-medium"
                      >
                        Modify Query
                      </Label>
                      <Textarea
                        id={`ai-query-${chart.id}`}
                        placeholder="Enter a new query or modifications to the current query..."
                        value={aiInputQuery[chart.id] || ""}
                        onChange={handleQueryChange}
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor={`chart-type-${chart.id}`}
                        className="text-sm font-medium"
                      >
                        Chart Type
                      </Label>
                      <Select
                        value={aiChartType[chart.id] || chart.chartType}
                        onValueChange={handleChartTypeChange}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAiInputOpen((prev) => ({
                            ...prev,
                            [chart.id]: false,
                          }));
                          setAiInputQuery((prev) => ({
                            ...prev,
                            [chart.id]: "",
                          }));
                          setAiChartType((prev) => ({
                            ...prev,
                            [chart.id]: chart.chartType,
                          }));
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAiInputSubmit(chart.id)}
                        disabled={isGenerating}
                      >
                        {isGenerating ? "Updating..." : "Update Chart"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleChartExpansion(chart.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Inspect Chart
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!chart.isExpanded ? (
            <div className="h-[300px]">{renderChart(chart)}</div>
          ) : (
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="sql">SQL Query</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
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

              <TabsContent value="config" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium">Chart Type</label>
                      <Select value={chart.chartType}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <input
                        type="text"
                        value={chart.title}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        readOnly
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    );
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
                value={naturalLanguageQuery}
                onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                className="flex-1 min-h-[60px] resize-none"
                disabled={isGenerating}
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
                    !naturalLanguageQuery.trim() ||
                    selectedTables.length === 0 ||
                    isGenerating
                  }
                  className="px-8 h-10"
                >
                  {isGenerating ? (
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
                <ChartCard key={chart.id} chart={chart} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
