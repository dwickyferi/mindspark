"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { DatasourceAPI, type DatasourceListItem } from "@/lib/api/datasources";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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

export default function AnalyticsStudioPage() {
  // State management
  const [datasources, setDatasources] = useState<DatasourceListItem[]>([]);
  const [selectedDatasource, setSelectedDatasource] =
    useState<DatasourceListItem | null>(null);
  const [availableTables, setAvailableTables] = useState<DatabaseTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartCards, setChartCards] = useState<ChartCard[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [expandedSidebar, setExpandedSidebar] = useState(true);

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

  // Load tables when datasource is selected
  useEffect(() => {
    if (selectedDatasource) {
      loadTables();
    }
  }, [selectedDatasource]);

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

  const loadTables = async () => {
    if (!selectedDatasource) return;

    setIsLoadingTables(true);
    try {
      // Use API route to get database schema
      const response = await fetch(
        `/api/analytics/schema?datasourceId=${selectedDatasource.id}`,
      );
      const result = await response.json();

      if (result.success && result.schema) {
        setAvailableTables(result.schema.tables || []);
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
          aiProvider: "openai",
          aiModel: "gpt-4",
          maxRetries: 3,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Determine chart type based on data structure
        const chartType = determineChartType(result.data);

        const newChart: ChartCard = {
          id: Date.now().toString(),
          query: naturalLanguageQuery,
          title: naturalLanguageQuery,
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
            aiProvider: "openai",
            aiModel: "gpt-4",
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

    const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"];

    switch (chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
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
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey={yKey} fill={colors[0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        );

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={300}>
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
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  const ChartCard = ({ chart }: { chart: ChartCard }) => (
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
                      onChange={(e) =>
                        setAiInputQuery((prev) => ({
                          ...prev,
                          [chart.id]: e.target.value,
                        }))
                      }
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
                      onValueChange={(value: "line" | "bar" | "pie") =>
                        setAiChartType((prev) => ({
                          ...prev,
                          [chart.id]: value,
                        }))
                      }
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

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Dataset Selection */}
      <div
        className={`border-r bg-muted/20 transition-all duration-300 ${expandedSidebar ? "w-80" : "w-16"}`}
      >
        <div className="p-4">
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
            <>
              {/* Datasource Selection */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-2 block">
                  Database
                </label>
                <Select
                  value={selectedDatasource?.id}
                  onValueChange={(value) => {
                    const datasource = datasources.find(
                      (ds) => ds.id === value,
                    );
                    setSelectedDatasource(datasource || null);
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

              {/* Table Selection */}
              {selectedDatasource && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Tables
                  </label>
                  {isLoadingTables ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-auto">
                      {availableTables.map((table) => (
                        <div
                          key={table.name}
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
                            <TableIcon className="h-4 w-4" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {table.schema && table.schema !== "public"
                                  ? `${table.schema}.${table.name}`
                                  : table.name}
                              </div>
                              <div className="text-xs text-muted-foreground flex gap-2">
                                {table.schema && (
                                  <span>Schema: {table.schema}</span>
                                )}
                                {table.rowCount && (
                                  <span>
                                    {table.rowCount.toLocaleString()} rows
                                  </span>
                                )}
                              </div>
                            </div>
                            {selectedTables.includes(
                              table.schema
                                ? `${table.schema}.${table.name}`
                                : table.name,
                            ) && (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
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
              <Button
                onClick={generateChart}
                disabled={
                  !naturalLanguageQuery.trim() ||
                  selectedTables.length === 0 ||
                  isGenerating
                }
                className="px-8"
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

        {/* Charts Area */}
        <div className="flex-1 p-6 overflow-auto">
          {chartCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No charts yet</h3>
              <p className="text-muted-foreground max-w-md">
                Select tables from the sidebar and ask a question to generate
                your first chart
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
