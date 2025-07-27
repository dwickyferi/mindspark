"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Sparkles,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { DatasourceAPI, type DatasourceListItem } from "@/lib/api/datasources";
import { StudioAPI } from "@/lib/api/studio";
import { ConfirmationModal } from "@/components/confirmation-modal";
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

type ChartType = "line" | "bar" | "pie" | "table";

// Table chart props interface
interface TableProps {
  title: string;
  data: any[];
  description?: string;
  columns?: string[];
}

// Union type for chart props
type ChartProps = PieChartProps | BarChartProps | LineChartProps | TableProps;

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
  lastUpdated?: number; // Add timestamp to force re-renders
  toolCallId?: string; // Track the originating tool call for deduplication
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

// Custom comparison function for ChartContent memo
const chartContentPropsAreEqual = (
  prevProps: { chart: ChartCard },
  nextProps: { chart: ChartCard },
) => {
  const prev = prevProps.chart;
  const next = nextProps.chart;

  // If lastUpdated timestamp changed, force re-render (chart was modified)
  if (prev.lastUpdated !== next.lastUpdated) {
    return false;
  }

  // Compare all relevant properties that affect rendering
  return (
    prev.id === next.id &&
    prev.chartType === next.chartType &&
    prev.chartTitle === next.chartTitle &&
    prev.query === next.query &&
    prev.sql === next.sql &&
    prev.rowCount === next.rowCount &&
    prev.executionTime === next.executionTime &&
    prev.isExpanded === next.isExpanded &&
    JSON.stringify(prev.data) === JSON.stringify(next.data) &&
    JSON.stringify(prev.chartProps) === JSON.stringify(next.chartProps)
  );
};

// Optimized ChartContent component with React.memo and custom comparison
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
  }, [chartType, chartProps, data, chart.id, chart.lastUpdated]); // Add lastUpdated to dependencies

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
  }, [chartType, chartProps, data, chart.id, chart.lastUpdated]); // Add lastUpdated to dependencies

  const pieTotal = useMemo(() => {
    if (chartType !== "pie" || !chartProps || !data || data.length === 0)
      return 0;
    const pieProps = chartProps as PieChartProps;
    return pieProps.data.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartType, chartProps, data, chart.id, chart.lastUpdated]); // Add lastUpdated to dependencies

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
  }, [chartType, chartProps, data, chart.id, chart.lastUpdated]); // Add lastUpdated to dependencies

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
  }, [chartType, chartProps, data, chart.id, chart.lastUpdated]); // Add lastUpdated to dependencies

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
  }, [chartType, chartProps, data, chart.id, chart.lastUpdated]); // Add lastUpdated to dependencies

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
  }, [chartType, chartProps, data, chart.id, chart.lastUpdated]); // Add lastUpdated to dependencies

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

  if (chartType === "table") {
    const tableProps = chartProps as TableProps;
    return (
      <div className="w-full h-full">
        <div className="max-h-[280px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {tableProps.data.length > 0 &&
                  Object.keys(tableProps.data[0]).map((key) => (
                    <TableHead key={key}>{key}</TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.data.map((row, index) => (
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
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-muted-foreground">
      Unsupported chart type
    </div>
  );
}, chartContentPropsAreEqual);

ChartContent.displayName = "ChartContent";

// Custom comparison function for ChartCardComponent memo
const chartCardPropsAreEqual = (
  prevProps: ChartCardProps,
  nextProps: ChartCardProps,
) => {
  // Compare chart properties that affect rendering
  const chartEqual = chartContentPropsAreEqual(
    { chart: prevProps.chart },
    { chart: nextProps.chart },
  );

  // Compare other props
  return (
    chartEqual &&
    prevProps.isModifyLoading === nextProps.isModifyLoading &&
    prevProps.editingTitleId === nextProps.editingTitleId &&
    prevProps.editingTitleValue === nextProps.editingTitleValue &&
    prevProps.isSavingTitle === nextProps.isSavingTitle &&
    prevProps.aiInputOpen[prevProps.chart.id] ===
      nextProps.aiInputOpen[nextProps.chart.id] &&
    prevProps.aiInputQuery[prevProps.chart.id] ===
      nextProps.aiInputQuery[nextProps.chart.id] &&
    prevProps.onAiInputOpenChange === nextProps.onAiInputOpenChange &&
    prevProps.onAiInputQueryChange === nextProps.onAiInputQueryChange &&
    prevProps.onAiInputSubmit === nextProps.onAiInputSubmit &&
    prevProps.onToggleExpansion === nextProps.onToggleExpansion &&
    prevProps.onDeleteChart === nextProps.onDeleteChart &&
    prevProps.onStartTitleEdit === nextProps.onStartTitleEdit &&
    prevProps.onCancelTitleEdit === nextProps.onCancelTitleEdit &&
    prevProps.onSaveTitle === nextProps.onSaveTitle &&
    prevProps.onTitleValueChange === nextProps.onTitleValueChange
  );
};

// Optimized ChartCardComponent with React.memo
interface ChartCardProps {
  chart: ChartCard;
  aiInputOpen: { [key: string]: boolean };
  aiInputQuery: { [key: string]: string };
  isModifyLoading: boolean;
  editingTitleId: string | null;
  editingTitleValue: string;
  isSavingTitle: string | null;
  onAiInputOpenChange: (chartId: string, open: boolean) => void;
  onAiInputQueryChange: (chartId: string, value: string) => void;
  onAiInputSubmit: (chartId: string) => void;
  onToggleExpansion: (chartId: string) => void;
  onDeleteChart: (chartId: string, chartTitle: string) => void;
  onStartTitleEdit: (chartId: string, currentTitle: string) => void;
  onCancelTitleEdit: () => void;
  onSaveTitle: (chartId: string) => void;
  onTitleValueChange: (value: string) => void;
}

const ChartCardComponent = React.memo(
  ({
    chart,
    aiInputOpen,
    aiInputQuery,
    isModifyLoading,
    editingTitleId,
    editingTitleValue,
    isSavingTitle,
    onAiInputOpenChange,
    onAiInputQueryChange,
    onAiInputSubmit,
    onToggleExpansion,
    onDeleteChart,
    onStartTitleEdit,
    onCancelTitleEdit,
    onSaveTitle,
    onTitleValueChange,
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

    const handleDeleteClick = useCallback(() => {
      onDeleteChart(chart.id, chart.chartTitle || chart.chartProps.title);
    }, [chart.id, chart.chartTitle, chart.chartProps.title, onDeleteChart]);

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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {editingTitleId === chart.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={editingTitleValue}
                    onChange={(e) => onTitleValueChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSaveTitle(chart.id);
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        onCancelTitleEdit();
                      }
                    }}
                    className="text-lg font-semibold"
                    autoFocus
                    disabled={isSavingTitle === chart.id}
                  />
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onSaveTitle(chart.id)}
                      disabled={
                        isSavingTitle === chart.id || !editingTitleValue.trim()
                      }
                      className="h-6 w-6 p-0"
                    >
                      {isSavingTitle === chart.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3 text-green-600" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onCancelTitleEdit}
                      disabled={isSavingTitle === chart.id}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">
                    {chart.chartTitle || chart.chartProps.title}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onStartTitleEdit(
                        chart.id,
                        chart.chartTitle || chart.chartProps.title,
                      )
                    }
                    className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
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
                    <Sparkles className="h-4 w-4" />
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
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (
                              !aiInputQuery[chart.id]?.trim() ||
                              isModifyLoading
                            )
                              return;
                            handleUpdateClick();
                          }
                        }}
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shadow text-purple-800"
                    onClick={handleToggleClick}
                  >
                    {chart.isExpanded ? (
                      <BarChart3 className="h-4 w-4" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{chart.isExpanded ? "View Chart" : "Inspect Data"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shadow text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={handleDeleteClick}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete Chart</p>
                </TooltipContent>
              </Tooltip>
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
  chartCardPropsAreEqual,
);

ChartCardComponent.displayName = "ChartCardComponent";

export default function AnalyticsStudioPage() {
  // State management
  const [datasources, setDatasources] = useState<DatasourceListItem[]>([]);
  const [selectedDatasource, setSelectedDatasource] =
    useState<DatasourceListItem | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
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

  // Persistent storage state
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [_, setIsLoadingCharts] = useState(true);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    chartId: string | null;
    chartTitle: string;
    isDeleting: boolean;
  }>({
    isOpen: false,
    chartId: null,
    chartTitle: "",
    isDeleting: false,
  });

  // Get model from app store (same as chat page)
  const selectedModel = appStore(useShallow((state) => state.chatModel));

  // Use refs to track processed invocations to prevent stale closures
  const processedInvocationsRef = useRef<Set<string>>(new Set());
  const processedModifyInvocationsRef = useRef<Set<string>>(new Set());

  // Add ref to track last generation time for debouncing
  const lastGenerationTimeRef = useRef<number>(0);

  // State to track which chart is currently being modified (for UI feedback)
  const [modifyingChartId, setModifyingChartId] = useState<string | null>(null);

  // AI Input state - simplified to only handle query modification
  const [aiInputOpen, setAiInputOpen] = useState<{ [key: string]: boolean }>(
    {},
  );
  const [aiInputQuery, setAiInputQuery] = useState<{ [key: string]: string }>(
    {},
  );

  // Title editing state
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>("");
  const [isSavingTitle, setIsSavingTitle] = useState<string | null>(null);

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

  // Memoized chart props generation to prevent recreation on every render
  const generateChartProps = useCallback(
    async (
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
        case "table":
          return convertToTableProps(data, query, finalTitle);
        default:
          return convertToBarChartProps(data, query, finalTitle);
      }
    },
    [], // No dependencies as helper functions are stable
  );

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

          // Create a stable, deterministic key for this invocation - NO Date.now()!
          const invocationKey = `${lastMessage.id}-${invocation.toolCallId}-${result.query || ""}-${result.chartType || ""}`;

          // Skip if we've already processed this invocation
          if (processedInvocationsRef.current.has(invocationKey)) {
            console.log(
              "Skipping already processed invocation:",
              invocationKey,
            );
            continue;
          }

          // Additional safety check: also check by toolCallId alone (should be globally unique)
          const toolCallId = invocation.toolCallId;
          if (processedInvocationsRef.current.has(`toolCall-${toolCallId}`)) {
            console.log("Skipping already processed toolCall:", toolCallId);
            continue;
          }

          // Mark as processed immediately to prevent duplicates
          processedInvocationsRef.current.add(invocationKey);
          processedInvocationsRef.current.add(`toolCall-${toolCallId}`);

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
                  lastUpdated: Date.now(), // Add timestamp for re-render tracking
                  toolCallId: invocation.toolCallId, // Track the originating tool call
                };

                // Save chart to database
                if (selectedDatasource) {
                  try {
                    const saveResponse = await StudioAPI.createChart({
                      title: result.chartTitle || result.query,
                      description: `Generated from query: ${result.query}`,
                      datasourceId: selectedDatasource.id,
                      sqlQuery: result.sql || "",
                      chartType: result.chartType,
                      chartConfig: chartProps,
                      dataCache: result.data,
                      dataMode: "static",
                      tags: [],
                    });

                    if (saveResponse.success && saveResponse.data) {
                      // Update the chart ID with the database ID
                      newChart.id = saveResponse.data.id;
                    }
                  } catch (saveError) {
                    console.error(
                      "Failed to save chart to database:",
                      saveError,
                    );
                    // Continue with local chart even if save fails
                    toast.error("Chart created but failed to save to database");
                  }
                }

                // Use functional update to prevent duplicate charts with improved deduplication
                setChartCards((prev) => {
                  // Primary deduplication: Check if we already have a chart from this exact toolCall
                  const toolCallDuplicate = prev.some(
                    (chart) => chart.toolCallId === invocation.toolCallId,
                  );

                  if (toolCallDuplicate) {
                    console.log(
                      "Duplicate chart prevented - same toolCallId:",
                      {
                        toolCallId: invocation.toolCallId,
                        query: result.query,
                        chartType: result.chartType,
                      },
                    );
                    return prev;
                  }

                  // Secondary deduplication: Content-based duplicate detection
                  const contentDuplicate = prev.some((chart) => {
                    const queryMatch = chart.query === result.query;
                    const typeMatch = chart.chartType === result.chartType;
                    const sqlMatch = chart.sql === (result.sql || "");
                    const dataMatch = chart.rowCount === result.rowCount;

                    // Consider it a duplicate if query, type, SQL, and row count all match
                    return queryMatch && typeMatch && sqlMatch && dataMatch;
                  });

                  if (contentDuplicate) {
                    console.log("Duplicate chart prevented - content match:", {
                      query: result.query,
                      chartType: result.chartType,
                      existingCharts: prev.length,
                    });
                    return prev;
                  }

                  console.log("Adding new chart:", {
                    toolCallId: invocation.toolCallId,
                    query: result.query,
                    chartType: result.chartType,
                    totalCharts: prev.length + 1,
                  });
                  return [...prev, newChart];
                });

                toast.success("Chart generated successfully!");
              } catch (error) {
                console.error("Error processing chart result:", error);
                toast.error("Failed to process chart data");
              }
            };
            processResult();
          } else {
            toast.error(result?.error || "Failed to generate chart");
          }
        }
      }
    }
  }, [messages, selectedDatasource, generateChartProps]); // Add generateChartProps to dependencies

  // Watch for modification results
  useEffect(() => {
    const lastMessage = modifyMessages.at(-1);
    if (lastMessage?.role === "assistant" && lastMessage.toolInvocations) {
      // Find the corresponding user message to extract the chart ID
      const userMessage = modifyMessages
        .slice()
        .reverse()
        .find((msg) => msg.role === "user");

      for (const invocation of lastMessage.toolInvocations) {
        if (
          invocation.toolName === "textToSql" &&
          invocation.state === "result"
        ) {
          const result = (invocation as any).result;

          // Create a stable key for this modification invocation - NO Date.now()!
          const invocationKey = `modify-${lastMessage.id}-${invocation.toolCallId}-${result.query || ""}`;

          // Skip if we've already processed this invocation
          if (processedModifyInvocationsRef.current.has(invocationKey)) {
            console.log(
              "Skipping already processed modification invocation:",
              invocationKey,
            );
            continue;
          }

          // Additional safety check: also check by toolCallId alone for modifications
          const modifyToolCallKey = `modify-toolCall-${invocation.toolCallId}`;
          if (processedModifyInvocationsRef.current.has(modifyToolCallKey)) {
            console.log(
              "Skipping already processed modify toolCall:",
              invocation.toolCallId,
            );
            continue;
          }

          // Mark as processed immediately
          processedModifyInvocationsRef.current.add(invocationKey);
          processedModifyInvocationsRef.current.add(modifyToolCallKey);

          if (result?.success) {
            // Extract the target chart ID from the user message content
            let targetChartId: string | null = null;
            if (userMessage && userMessage.content) {
              const chartIdMatch = userMessage.content.match(
                /\[CHART_ID:([^\]]+)\]/,
              );
              if (chartIdMatch) {
                targetChartId = chartIdMatch[1];
              }
            }

            if (!targetChartId) {
              console.warn(
                `No target chart ID found in user message for tool invocation ${invocation.toolCallId}. Skipping modification.`,
              );
              continue;
            }

            console.log(
              `Processing modification for chart ${targetChartId} from tool invocation ${invocation.toolCallId}`,
            );

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
                  if (prev.length === 0) {
                    console.warn("No charts to modify");
                    return prev;
                  }

                  const chartIndex = prev.findIndex(
                    (chart) => chart.id === targetChartId,
                  );
                  if (chartIndex === -1) {
                    console.warn(
                      `Chart with ID ${targetChartId} not found for modification`,
                    );
                    return prev;
                  }

                  console.log(
                    `Updating chart ${targetChartId} at index ${chartIndex}. ToolCall: ${invocation.toolCallId}`,
                  );

                  const originalChart = prev[chartIndex];

                  // PRESERVE ORIGINAL TITLE - This is the fix for Issue #2
                  const preservedTitle =
                    originalChart.chartTitle || originalChart.chartProps.title;

                  const updatedChart = {
                    ...originalChart,
                    query: result.query,
                    chartType: result.chartType,
                    chartProps: {
                      ...chartProps,
                      title: preservedTitle, // Always preserve the original title
                    },
                    sql: result.sql || "",
                    data: result.data || [],
                    executionTime: result.executionTime,
                    rowCount: result.rowCount,
                    chartTitle: preservedTitle, // Preserve original title
                    lastUpdated: Date.now(), // Add timestamp to force re-render
                    toolCallId: invocation.toolCallId, // Update with new modification toolCallId
                  };

                  return prev.map((chart) =>
                    chart.id === targetChartId ? updatedChart : chart,
                  );
                });

                // Save the modified chart to database with preserved title
                if (selectedDatasource && targetChartId) {
                  try {
                    // Use functional state update to get the most current chart state
                    setChartCards((currentCharts) => {
                      const currentChart = currentCharts.find(
                        (chart) => chart.id === targetChartId,
                      );

                      if (currentChart) {
                        const preservedTitle =
                          currentChart.chartTitle ||
                          currentChart.chartProps.title;

                        // Save to database with preserved title
                        StudioAPI.updateChart(targetChartId, {
                          title: preservedTitle, // Always preserve the original title
                          description: `Modified from query: ${result.query}`,
                          datasourceId: selectedDatasource.id,
                          sqlQuery: result.sql || "",
                          chartType: result.chartType,
                          chartConfig: {
                            ...chartProps,
                            title: preservedTitle,
                          },
                          dataCache: result.data,
                          dataMode: "static",
                          tags: [],
                        })
                          .then((updateResponse) => {
                            if (!updateResponse.success) {
                              console.error(
                                "Failed to update chart in database:",
                                updateResponse.error,
                              );
                              toast.error(
                                "Chart updated locally but failed to save to database",
                              );
                            }
                          })
                          .catch((saveError) => {
                            console.error(
                              "Failed to save modified chart to database:",
                              saveError,
                            );
                            toast.error(
                              "Chart updated locally but failed to save to database",
                            );
                          });
                      }

                      return currentCharts; // Return unchanged array since this is just for database sync
                    });
                  } catch (error) {
                    console.error("Error in database update process:", error);
                  }
                }

                // Clear the modifying chart ID if this was the current one
                if (modifyingChartId === targetChartId) {
                  setModifyingChartId(null);
                }

                toast.success("Chart updated successfully!");
              } catch (error) {
                console.error("Error processing chart modification:", error);
                toast.error("Failed to process chart update");
                // Clear the modifying chart ID if this was the current one
                if (modifyingChartId === targetChartId) {
                  setModifyingChartId(null);
                }
              }
            };
            processResult();
          } else {
            // Extract the target chart ID from the user message content for error handling
            let targetChartId: string | null = null;
            if (userMessage && userMessage.content) {
              const chartIdMatch = userMessage.content.match(
                /\[CHART_ID:([^\]]+)\]/,
              );
              if (chartIdMatch) {
                targetChartId = chartIdMatch[1];
              }
            }

            toast.error(result?.error || "Failed to update chart");
            // Clear the modifying chart ID if this was the current one
            if (targetChartId && modifyingChartId === targetChartId) {
              setModifyingChartId(null);
            }
          }
        }
      }
    }
  }, [
    modifyMessages,
    modifyingChartId,
    selectedDatasource,
    generateChartProps,
  ]); // Add all dependencies to fix stale closures

  // Cleanup effect to prevent memory leaks and stale data
  useEffect(() => {
    return () => {
      // Clear processed invocations when component unmounts
      processedInvocationsRef.current.clear();
      processedModifyInvocationsRef.current.clear();
      console.log("Cleaned up processed invocations on component unmount");
    };
  }, []);

  // Load datasources on mount and restore session
  useEffect(() => {
    const initializeStudio = async () => {
      try {
        // Load datasources first
        await loadDatasources();

        // Load session state
        setIsLoadingSession(true);
        const sessionResponse = await StudioAPI.getSession();
        if (sessionResponse.success && sessionResponse.data) {
          const session = sessionResponse.data;

          // Find and set the selected datasource
          if (session.selectedDatasourceId) {
            const response = await DatasourceAPI.listDatasources();
            if (response.success && response.data) {
              const datasource = response.data.find(
                (ds) => ds.id === session.selectedDatasourceId,
              );
              if (datasource) {
                // Set restoration flag to prevent useEffect conflicts
                setIsRestoringSession(true);

                // Show toast notification that session is being restored
                toast.success("Restoring your previous session...", {
                  duration: 2000,
                });

                // Step 1: Set datasource and wait
                setSelectedDatasource(datasource);
                setSelectedDatabase(session.selectedDatabase || "");
                setExpandedSidebar(session.expandedSidebar);

                // Step 2: Load schemas and wait
                setIsLoadingSchemas(true);
                try {
                  const response = await fetch(
                    `/api/analytics/schema?datasourceId=${datasource.id}`,
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

                    // Step 3: Set saved schema if it exists, then load tables
                    if (
                      session.selectedSchema &&
                      schemaList.find((s) => s.name === session.selectedSchema)
                    ) {
                      setSelectedSchema(session.selectedSchema);

                      // Step 4: Load tables for the selected schema and wait
                      setIsLoadingTables(true);
                      try {
                        // Filter tables by selected schema
                        const filteredTables =
                          result.schema.tables?.filter(
                            (table: any) =>
                              table.schema === session.selectedSchema,
                          ) || [];
                        setAvailableTables(filteredTables);

                        // Step 5: Set saved tables if they exist
                        if (
                          session.selectedTables &&
                          session.selectedTables.length > 0
                        ) {
                          const validTables = session.selectedTables.filter(
                            (tableName) =>
                              filteredTables.some((table: any) => {
                                const fullTableName = table.schema
                                  ? `${table.schema}.${table.name}`
                                  : table.name;
                                return fullTableName === tableName;
                              }),
                          );
                          setSelectedTables(validTables);
                        }
                      } catch (error) {
                        console.error(
                          "Failed to load tables during session restore:",
                          error,
                        );
                      } finally {
                        setIsLoadingTables(false);
                      }
                    } else if (session.selectedSchema) {
                      // Schema from session no longer exists, clear it and save updated session
                      console.warn(
                        `Saved schema "${session.selectedSchema}" no longer exists, clearing selection`,
                      );
                      setSelectedSchema("");
                      setSelectedTables([]);
                      // Update the session to clear the invalid schema
                      StudioAPI.saveSession({
                        selectedDatasourceId: datasource.id,
                        selectedDatabase: session.selectedDatabase || "",
                        selectedSchema: "",
                        selectedTables: [],
                        expandedSidebar: session.expandedSidebar,
                        sessionMetadata: {},
                      }).catch(console.error);
                    }
                  }
                } catch (error) {
                  console.error(
                    "Failed to load schemas during session restore:",
                    error,
                  );
                } finally {
                  setIsLoadingSchemas(false);
                  // Clear restoration flag after all steps are complete
                  setIsRestoringSession(false);
                }
              }
            }
          } else {
            // No saved datasource, clear restoration flag
            setIsRestoringSession(false);
          }
        } else {
          // No saved session, clear restoration flag
          setIsRestoringSession(false);
        }

        // Load existing charts
        setIsLoadingCharts(true);
        const chartsResponse = await StudioAPI.getCharts();
        if (chartsResponse.success && chartsResponse.data) {
          // Convert database charts to ChartCard format
          const loadedCharts: ChartCard[] = chartsResponse.data.map((chart) => {
            // Ensure chartProps.title matches the database title
            const chartConfig = chart.chartConfig as any;
            const updatedChartProps = {
              ...chartConfig,
              title: chart.title, // Always use the database title as the source of truth
            };

            return {
              id: chart.id,
              query: chart.title, // Use title as query for display
              sql: chart.sqlQuery,
              data: chart.dataCache || [],
              chartType: chart.chartType as ChartType,
              chartProps: updatedChartProps,
              isExpanded: false,
              executionTime: undefined,
              rowCount: chart.dataCache?.length || 0,
              chartTitle: chart.title,
              lastUpdated: Date.now(),
            };
          });
          setChartCards(loadedCharts);
        }
      } catch (error) {
        console.error("Error initializing studio:", error);
        toast.error("Failed to load studio session");
        // Make sure to clear restoration flag on error
        setIsRestoringSession(false);
      } finally {
        setIsLoadingSession(false);
        setIsLoadingCharts(false);
      }
    };

    initializeStudio();
  }, []);

  // Auto-save session state when key values change
  useEffect(() => {
    if (!isLoadingSession) {
      const saveSession = async () => {
        try {
          await StudioAPI.saveSession({
            selectedDatasourceId: selectedDatasource?.id || null,
            selectedDatabase: selectedDatabase,
            selectedSchema: selectedSchema,
            selectedTables: selectedTables,
            expandedSidebar: expandedSidebar,
            sessionMetadata: {},
          });
        } catch (error) {
          console.error("Failed to save session:", error);
        }
      };

      saveSession();
    }
  }, [
    selectedDatasource,
    selectedDatabase,
    selectedSchema,
    selectedTables,
    expandedSidebar,
    isLoadingSession,
  ]);

  // Load schemas when datasource is selected (but not during session restoration)
  useEffect(() => {
    if (selectedDatasource && !isRestoringSession) {
      loadSchemas();
    } else if (!selectedDatasource) {
      setAvailableSchemas([]);
      setSelectedSchema("");
      setAvailableTables([]);
      setSelectedTables([]);
      // Clear any ongoing modifications when datasource changes
      setModifyingChartId(null);
      processedInvocationsRef.current.clear();
      processedModifyInvocationsRef.current.clear();
    }
  }, [selectedDatasource, isRestoringSession]);

  // Load tables when schema is selected (but not during session restoration)
  useEffect(() => {
    if (selectedDatasource && selectedSchema && !isRestoringSession) {
      loadTables();
    } else if (!selectedSchema) {
      setAvailableTables([]);
      setSelectedTables([]);
    }
  }, [selectedDatasource, selectedSchema, isRestoringSession]);

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

        // Remove auto-selection logic - let user manually select or session restoration handle it
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

  const convertToTableProps = (
    data: any[],
    query: string,
    title?: string,
  ): TableProps => {
    if (!data || data.length === 0) {
      return {
        title: title || "Data Table",
        data: [],
      };
    }

    const columns = Object.keys(data[0]);

    return {
      title: title || `Data Table - ${query}`,
      data: data,
      columns: columns,
      description: `Generated from query: ${query}`,
    };
  };

  const generateChart = async () => {
    if (!input.trim() || selectedTables.length === 0 || !selectedDatasource) {
      toast.error("Please select tables and enter a query");
      return;
    }

    // Debouncing: prevent rapid successive generations
    const now = Date.now();
    if (now - lastGenerationTimeRef.current < 1000) {
      // 1 second debounce
      console.log("Chart generation request debounced");
      return;
    }
    lastGenerationTimeRef.current = now;

    // Store the input value before clearing it
    const queryInput = input;

    // Clear the input immediately when user submits
    setInput("");

    // Reset processed invocations for new query session with logging
    console.log(
      "Starting new chart generation - clearing processed invocations",
    );
    processedInvocationsRef.current.clear();
    processedModifyInvocationsRef.current.clear();

    // Also clear any ongoing chart modifications
    setModifyingChartId(null);

    // Create a comprehensive prompt for the AI to understand the context
    const contextPrompt = `
Generate and execute a SQL query for the following request:

Query: "${queryInput}"
Selected Tables: ${selectedTables.join(", ")}
Datasource ID: ${selectedDatasource.id}

Please analyze the user's request and determine the most appropriate chart type (bar, line, pie, or table) based on:
1. Explicit chart type mentions in the query
2. The nature of the data being requested
3. Time-based patterns (use line charts)
4. Categorical distributions (use pie charts for ≤10 items)
5. Comparisons and counts (use bar charts)
6. Raw data analysis or detailed data inspection (use table format)
7. When user asks for "table", "raw data", "show me the data", or wants to see all columns

Use the textToSql tool to execute this request.
    `;

    await append({
      role: "user",
      content: contextPrompt,
    });
  };

  // Title editing handlers
  const handleStartTitleEdit = useCallback(
    (chartId: string, currentTitle: string) => {
      setEditingTitleId(chartId);
      setEditingTitleValue(currentTitle);
    },
    [],
  );

  const handleCancelTitleEdit = useCallback(() => {
    setEditingTitleId(null);
    setEditingTitleValue("");
  }, []);

  const handleSaveTitle = useCallback(
    async (chartId: string) => {
      const newTitle = editingTitleValue.trim();

      if (!newTitle) {
        toast.error("Title cannot be empty");
        return;
      }

      if (newTitle.length > 255) {
        toast.error("Title cannot exceed 255 characters");
        return;
      }

      setIsSavingTitle(chartId);

      try {
        // Update chart title in database
        const response = await StudioAPI.updateChartTitle(chartId, newTitle);

        if (response.success) {
          // Update local state
          setChartCards((prev) =>
            prev.map((chart) =>
              chart.id === chartId
                ? {
                    ...chart,
                    chartTitle: newTitle,
                    chartProps: {
                      ...chart.chartProps,
                      title: newTitle,
                    },
                  }
                : chart,
            ),
          );

          // Clear editing state
          setEditingTitleId(null);
          setEditingTitleValue("");

          toast.success("Chart title updated successfully!");
        } else {
          toast.error(response.error || "Failed to update chart title");
        }
      } catch (error) {
        console.error("Error updating chart title:", error);
        toast.error("Failed to update chart title");
      } finally {
        setIsSavingTitle(null);
      }
    },
    [editingTitleValue],
  );

  const handleTitleValueChange = useCallback((value: string) => {
    setEditingTitleValue(value);
  }, []);

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

      // Prevent concurrent modifications on the same chart
      if (modifyingChartId === chartId) {
        toast.error(
          "This chart is already being modified. Please wait for completion.",
        );
        return;
      }

      // Find the current chart to get its context - use functional state access to avoid stale closures
      let currentChart: ChartCard | undefined;
      setChartCards((prev) => {
        currentChart = prev.find((chart) => chart.id === chartId);
        return prev; // Don't modify state, just capture current chart
      });

      if (!currentChart) {
        toast.error("Chart not found");
        return;
      }

      // Set the chart being modified (for UI feedback)
      console.log("Starting chart modification for chart ID:", chartId);
      setModifyingChartId(chartId);

      // Create a modification prompt with current SQL context and embedded chart ID
      const modificationPrompt = `[CHART_ID:${chartId}]

Modify the existing chart with the following request:

CURRENT CONTEXT:
- Original Chart ID: ${chartId}
- Original Chart Title: "${currentChart.chartTitle || currentChart.chartProps.title}"
- Original Query: "${currentChart.query}"
- Current SQL Query: 
\`\`\`sql
${currentChart.sql}
\`\`\`
- Current Chart Type: ${currentChart.chartType}
- Current Data Rows: ${currentChart.rowCount}

MODIFICATION REQUEST: "${query}"

AVAILABLE DATA:
- Selected Tables: ${selectedTables.join(", ")}
- Datasource ID: ${selectedDatasource.id}

INSTRUCTIONS:
Please modify the existing SQL query to accommodate the new request while preserving important elements from the original query such as:
- LIMIT clauses (unless specifically asked to change)
- WHERE conditions (unless modification requires different filtering)
- Column selections (unless new columns are specifically requested)
- ORDER BY clauses (unless new sorting is requested)

IMPORTANT: Keep the original chart title "${currentChart.chartTitle || currentChart.chartProps.title}" unless the user explicitly requests a title change.

When calling the textToSql tool, pass the currentSql parameter with the existing SQL query: "${currentChart.sql}" so the AI can better understand the context and modify accordingly.

Generate an updated SQL query that builds upon the existing one rather than creating a completely new query from scratch.
Determine the appropriate chart type (bar, line, pie, or table) based on the modification request.

Use the textToSql tool to execute this updated request.
    `;

      // Send the modification request
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
      modifyingChartId,
      // Remove chartCards dependency to avoid stale closures - we use functional state access instead
    ],
  );

  const toggleChartExpansion = useCallback((chartId: string) => {
    setChartCards((prev) =>
      prev.map((chart) =>
        chart.id === chartId
          ? { ...chart, isExpanded: !chart.isExpanded, lastUpdated: Date.now() }
          : chart,
      ),
    );
  }, []);

  // Delete chart functionality
  const handleDeleteChart = useCallback(
    (chartId: string, chartTitle: string) => {
      setDeleteModal({
        isOpen: true,
        chartId,
        chartTitle,
        isDeleting: false,
      });
    },
    [],
  );

  const confirmDeleteChart = useCallback(async () => {
    if (!deleteModal.chartId) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      // Delete from database
      const deleteResponse = await StudioAPI.deleteChart(deleteModal.chartId);

      if (deleteResponse.success) {
        // Remove from local state
        setChartCards((prev) =>
          prev.filter((chart) => chart.id !== deleteModal.chartId),
        );
        toast.success("Chart deleted successfully!");
      } else {
        toast.error(deleteResponse.error || "Failed to delete chart");
      }
    } catch (error) {
      console.error("Error deleting chart:", error);
      toast.error("Failed to delete chart");
    } finally {
      setDeleteModal({
        isOpen: false,
        chartId: null,
        chartTitle: "",
        isDeleting: false,
      });
    }
  }, [deleteModal.chartId]);

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
                    setSelectedDatabase(datasource?.name || "");
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
            <div className="flex flex-col items-end gap-2">
              {selectedTables.length > 0 && (
                <Badge variant="secondary">
                  {selectedTables.length} table
                  {selectedTables.length !== 1 ? "s" : ""} selected
                </Badge>
              )}
              <SelectModel
                onSelect={(model) => {
                  appStore.setState({ chatModel: model });
                }}
                defaultModel={selectedModel}
                align="end"
              >
                <Button variant="outline" className="px-3 min-w-[120px] h-8">
                  <Brain className="h-4 w-4 mr-2" />
                  {selectedModel?.model || "Select Model"}
                </Button>
              </SelectModel>
            </div>
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
                placeholder="Get me a line chart of monthly revenue, for premium and enterprise in EMEA - bar chart of monthly user signups, clustered by plan. Also in EMEA, all tiers except free for the last 6 months. Or show me raw data in a table format."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (
                      !input.trim() ||
                      selectedTables.length === 0 ||
                      isChatLoading
                    )
                      return;
                    generateChart();
                  }
                }}
                className="flex-1 min-h-[60px] resize-none"
                disabled={isChatLoading}
              />
              <div className="flex gap-2">
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
            <TooltipProvider>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartCards.map((chart) => (
                  <ChartCardComponent
                    key={`${chart.id}-${chart.lastUpdated || 0}`}
                    chart={chart}
                    aiInputOpen={aiInputOpen}
                    aiInputQuery={aiInputQuery}
                    isModifyLoading={isModifyLoading}
                    editingTitleId={editingTitleId}
                    editingTitleValue={editingTitleValue}
                    isSavingTitle={isSavingTitle}
                    onAiInputOpenChange={handleAiInputOpenChange}
                    onAiInputQueryChange={handleAiInputQueryChange}
                    onAiInputSubmit={handleAiInputSubmit}
                    onToggleExpansion={toggleChartExpansion}
                    onDeleteChart={handleDeleteChart}
                    onStartTitleEdit={handleStartTitleEdit}
                    onCancelTitleEdit={handleCancelTitleEdit}
                    onSaveTitle={handleSaveTitle}
                    onTitleValueChange={handleTitleValueChange}
                  />
                ))}
              </div>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            chartId: null,
            chartTitle: "",
            isDeleting: false,
          })
        }
        onConfirm={confirmDeleteChart}
        title="Delete Chart"
        description={`Are you sure you want to delete "${deleteModal.chartTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleteModal.isDeleting}
      />
    </div>
  );
}
