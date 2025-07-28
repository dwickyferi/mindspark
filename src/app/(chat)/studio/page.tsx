"use client";

import { appStore } from "@/app/store";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { SelectModel } from "@/components/select-model";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DatasourceAPI, type DatasourceListItem } from "@/lib/api/datasources";
import { type MultiStudioSession, StudioAPI } from "@/lib/api/studio";
import { generateUUID } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import {
  BarChart3,
  Brain,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Loader2,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Table as TableIcon,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import React from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/shallow";

// Import Recharts components
// Chart UI components
import { DynamicChartConfig } from "@/types/chart-config";
import DynamicChartRenderer from "@/components/dynamic-chart-renderer";

interface ChartCard {
  id: string;
  query: string;
  sql: string;
  chartConfig: Omit<DynamicChartConfig, "data">; // Config without data
  isExpanded: boolean;
  executionTime?: number;
  rowCount?: number;
  lastUpdated?: number; // Add timestamp to force re-renders
  toolCallId?: string; // Track the originating tool call for deduplication
  cacheKey?: string; // Redis cache key for data fetching
  datasourceId?: string; // Store datasource ID for refresh operations
  selectedTables?: string[]; // Store selected tables for refresh operations
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
  prevProps: { chart: ChartCard; data: any[] },
  nextProps: { chart: ChartCard; data: any[] },
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
    prev.query === next.query &&
    prev.sql === next.sql &&
    prev.rowCount === next.rowCount &&
    prev.executionTime === next.executionTime &&
    prev.isExpanded === next.isExpanded &&
    JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data) &&
    JSON.stringify(prev.chartConfig) === JSON.stringify(next.chartConfig)
  );
};

// Optimized ChartContent component with React.memo and custom comparison
const ChartContent = React.memo(
  ({ chart, data }: { chart: ChartCard; data: any[] }) => {
    const { chartConfig } = chart;

    // Always use the AI-generated configuration with the provided data
    if (!chartConfig || !data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No data available for visualization</p>
            <p className="text-sm mt-2">Try refreshing the chart data</p>
          </div>
        </div>
      );
    }

    // Create config with data for rendering
    const configWithData = {
      ...chartConfig,
      data,
    };

    return <DynamicChartRenderer config={configWithData} />;
  },
  chartContentPropsAreEqual,
);

ChartContent.displayName = "ChartContent";

// Custom comparison function for ChartCardComponent memo
const chartCardPropsAreEqual = (
  prevProps: ChartCardProps,
  nextProps: ChartCardProps,
) => {
  // Compare chart properties that affect rendering
  const chartEqual = chartContentPropsAreEqual(
    { chart: prevProps.chart, data: prevProps.data },
    { chart: nextProps.chart, data: nextProps.data },
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
    prevProps.onTitleValueChange === nextProps.onTitleValueChange &&
    prevProps.onRefreshData === nextProps.onRefreshData
  );
};

// Optimized ChartCardComponent with React.memo
interface ChartCardProps {
  chart: ChartCard;
  data: any[]; // Chart data fetched separately
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
  onRefreshData: (chartId: string) => void; // New refresh action
}

const ChartCardComponent = React.memo(
  ({
    chart,
    data,
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
    onRefreshData,
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
      onDeleteChart(
        chart.id,
        chart.chartConfig?.metadata?.title || "Untitled Chart",
      );
    }, [chart.id, chart.chartConfig?.metadata?.title, onDeleteChart]);

    const handleRefreshClick = useCallback(() => {
      onRefreshData(chart.id);
    }, [chart.id, onRefreshData]);

    const handlePopoverOpenChange = useCallback(
      (open: boolean) => {
        onAiInputOpenChange(chart.id, open);
      },
      [chart.id, onAiInputOpenChange],
    );

    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              {editingTitleId === chart.id ? (
                <div className="flex items-center gap-1 flex-1 max-w-[430px]">
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
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <CardTitle className="text-lg max-w-[400px] break-words leading-tight">
                    {chart.chartConfig?.metadata?.title || "Untitled Chart"}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onStartTitleEdit(
                        chart.id,
                        chart.chartConfig?.metadata?.title || "Untitled Chart",
                      )
                    }
                    className="h-6 w-6 p-0 opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 flex-shrink-0 pt-0.5">
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

              {/* Triple-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shadow text-gray-600 hover:text-gray-800 h-8 w-8 p-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={handleRefreshClick}
                    className="cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteClick}
                    className="cursor-pointer flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!chart.isExpanded ? (
            <div className="h-[300px] w-full overflow-hidden">
              <ChartContent chart={chart} data={data} />
            </div>
          ) : (
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="sql">SQL Query</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="mt-4">
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {data.length > 0 &&
                          Object.keys(data[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, index) => (
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
                  <CardContent className="p-4">
                    <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-[400px]">
                      <code>{JSON.stringify(chart.chartConfig, null, 2)}</code>
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
  const [chartData, setChartData] = useState<{ [chartId: string]: any[] }>({});
  const [isLoadingSchemas, setIsLoadingSchemas] = useState(false);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [expandedSidebar, setExpandedSidebar] = useState(true);

  // Persistent storage state
  const [_, setIsLoadingSession] = useState(true);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  // Multi-session state
  const [sessions, setSessions] = useState<MultiStudioSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [renameSessionModal, setRenameSessionModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    currentName: string;
    newName: string;
    isRenaming: boolean;
  }>({
    isOpen: false,
    sessionId: null,
    currentName: "",
    newName: "",
    isRenaming: false,
  });
  const [closeSessionModal, setCloseSessionModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionName: string;
    isClosing: boolean;
  }>({
    isOpen: false,
    sessionId: null,
    sessionName: "",
    isClosing: false,
  });

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

  // Reset confirmation modal state
  const [resetModal, setResetModal] = useState<{
    isOpen: boolean;
    isResetting: boolean;
  }>({
    isOpen: false,
    isResetting: false,
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

  // Generation tracking state
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(
    null,
  );
  const [lastGenerationDuration, setLastGenerationDuration] = useState<
    number | null
  >(null);
  const [currentGenerationTime, setCurrentGenerationTime] = useState<number>(0);

  // Table details state for hover cards
  const [tableDetails, setTableDetails] = useState<{
    [key: string]: {
      columns?: { name: string; type: string }[];
      sampleData?: any[];
      loading?: boolean;
      error?: string;
    };
  }>({});

  // Use AI SDK's useChat for main query generation (Studio-specific endpoint)
  // NOTE: This uses /api/studio/chat which is a separate endpoint that does NOT persist
  // conversations to the database, keeping Studio interactions isolated from chatbot history
  const {
    messages,
    input,
    setInput,
    append,
    isLoading: isChatLoading,
  } = useChat({
    api: "/api/studio/chat", // Studio-specific endpoint that doesn't persist to database
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
        messages: messages, // Include all messages for context
      };
    },
  });

  // Use AI SDK's useChat for chart modifications (Studio-specific endpoint)
  // NOTE: This uses /api/studio/chat which is a separate endpoint that does NOT persist
  // conversations to the database, keeping Studio interactions isolated from chatbot history
  const {
    messages: modifyMessages,
    append: modifyAppend,
    isLoading: isModifyLoading,
  } = useChat({
    api: "/api/studio/chat", // Studio-specific endpoint that doesn't persist to database
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
        messages: messages, // Include all messages for context
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
                // AI now generates complete chart configuration
                const chartId = generateUUID();
                const newChart: ChartCard = {
                  id: chartId,
                  query: result.query,
                  chartConfig: result.chartConfig, // Use AI-generated config without data
                  sql: result.sql || "",
                  isExpanded: false,
                  executionTime: result.executionTime,
                  rowCount: result.rowCount,
                  lastUpdated: Date.now(), // Add timestamp for re-render tracking
                  toolCallId: invocation.toolCallId, // Track the originating tool call
                  datasourceId: selectedDatasource?.id,
                  selectedTables: selectedTables,
                };

                // Update chartData first to ensure data is available when chart renders
                setChartData((prev) => ({
                  ...prev,
                  [chartId]: result.data || [],
                }));

                // Save chart to database
                if (selectedDatasource) {
                  try {
                    const saveResponse = await StudioAPI.createChart({
                      title:
                        result.chartConfig?.metadata?.title || result.query,
                      description: `Generated from query: ${result.query}`,
                      datasourceId: selectedDatasource.id,
                      sqlQuery: result.sql || "",
                      chartType: result.chartConfig?.chartType || "bar",
                      chartConfig: result.chartConfig,
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
                    const typeMatch =
                      chart.chartConfig?.chartType ===
                      result.chartConfig?.chartType;
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
                    hasData: result.data && result.data.length > 0,
                  });
                  const updatedCharts = [...prev, newChart];

                  // Immediate save after chart creation to prevent data loss
                  setTimeout(async () => {
                    console.log(
                      "[Session Debug] Immediate save after chart creation",
                    );
                    await saveCurrentSessionState();

                    // Auto-refresh chart data to ensure it's loaded immediately
                    console.log(
                      "[Chart Debug] Auto-refreshing chart data after creation",
                    );
                    if (
                      newChart.datasourceId &&
                      newChart.sql &&
                      selectedDatasource
                    ) {
                      try {
                        const refreshResponse = await fetch(
                          "/api/charts/refresh",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              chartId: newChart.id,
                              datasourceId: newChart.datasourceId,
                              sql: newChart.sql,
                              selectedTables: newChart.selectedTables || [],
                              query: newChart.query,
                            }),
                          },
                        );

                        if (refreshResponse.ok) {
                          const refreshResult = await refreshResponse.json();
                          if (refreshResult.success) {
                            // Update chart data with refreshed data
                            setChartData((prev) => ({
                              ...prev,
                              [newChart.id]: refreshResult.data || [],
                            }));
                            console.log(
                              "[Chart Debug] Auto-refresh completed successfully",
                            );
                          }
                        }
                      } catch (refreshError) {
                        console.warn(
                          "[Chart Debug] Auto-refresh failed:",
                          refreshError,
                        );
                        // Don't show error to user since the chart was still created successfully
                      }
                    }
                  }, 100);

                  return updatedCharts;
                });

                // Calculate and update generation duration
                const endTime = Date.now();
                if (generationStartTime) {
                  const duration = endTime - generationStartTime;
                  setLastGenerationDuration(duration);
                  setGenerationStartTime(null);
                  setCurrentGenerationTime(0);
                }

                toast.success("Chart generated successfully!");
              } catch (error) {
                console.error("Error processing chart result:", error);
                toast.error("Failed to process chart data");
                // Reset generation tracking on error
                setGenerationStartTime(null);
                setCurrentGenerationTime(0);
              }
            };
            processResult();
          } else {
            toast.error(result?.error || "Failed to generate chart");
            // Reset generation tracking on error
            setGenerationStartTime(null);
            setCurrentGenerationTime(0);
          }
        }
      }
    }
  }, [messages, selectedDatasource]); // Watch for new text-to-sql results

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
                    originalChart.chartConfig?.metadata?.title ||
                    "Untitled Chart";

                  const updatedChart = {
                    ...originalChart,
                    query: result.query,
                    chartConfig: {
                      ...result.chartConfig,
                      metadata: {
                        ...result.chartConfig.metadata,
                        title: preservedTitle, // Always preserve the original title
                      },
                    },
                    sql: result.sql || "",
                    executionTime: result.executionTime,
                    rowCount: result.rowCount,
                    lastUpdated: Date.now(), // Add timestamp to force re-render
                    toolCallId: invocation.toolCallId, // Update with new modification toolCallId
                  };

                  // Invalidate cache when SQL changes (chart modification detected)
                  if (originalChart.sql !== result.sql && result.sql) {
                    console.log(
                      `Chart ${targetChartId} SQL changed - invalidating cache via API`,
                    );
                    // Call API to invalidate cache on server-side (don't import Redis client in browser)
                    fetch("/api/charts/invalidate-cache", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        chartId: targetChartId,
                        newSql: result.sql,
                        datasourceId:
                          originalChart.datasourceId ||
                          selectedDatasource?.id ||
                          "",
                        selectedTables: originalChart.selectedTables || [],
                      }),
                    }).catch((error) => {
                      console.error(
                        "Failed to invalidate chart cache via API:",
                        error,
                      );
                    });
                  }

                  // Update data separately
                  setChartData((prev) => ({
                    ...prev,
                    [targetChartId]: result.data || [],
                  }));

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
                          currentChart.chartConfig?.metadata?.title ||
                          "Untitled Chart";

                        // Save to database with preserved title
                        StudioAPI.updateChart(targetChartId, {
                          title: preservedTitle, // Always preserve the original title
                          description: `Modified from query: ${result.query}`,
                          datasourceId: selectedDatasource.id,
                          sqlQuery: result.sql || "",
                          chartType: result.chartConfig.chartType || "bar", // Use chartType from config
                          chartConfig: {
                            ...result.chartConfig,
                            metadata: {
                              ...result.chartConfig.metadata,
                              title: preservedTitle,
                            },
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

                // Immediate save after chart modification to prevent data loss
                setTimeout(() => {
                  console.log(
                    "[Session Debug] Immediate save after chart modification",
                  );
                  saveCurrentSessionState();
                }, 100);

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
  }, [modifyMessages, modifyingChartId, selectedDatasource]); // Dependencies for chart modification

  // Real-time generation timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (generationStartTime) {
      interval = setInterval(() => {
        setCurrentGenerationTime(Date.now() - generationStartTime);
      }, 100);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [generationStartTime]);

  // Multi-session management functions
  const loadSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      const response = await StudioAPI.getAllSessions();
      if (response.success && response.data) {
        setSessions(response.data);

        // Find active session or set first session as active if none
        const activeSession = response.data.find((session) => session.isActive);
        if (activeSession) {
          setActiveSessionId(activeSession.id);
        } else if (response.data.length > 0) {
          const firstSession = response.data[0];
          setActiveSessionId(firstSession.id);
          // Make first session active
          await StudioAPI.setActiveSession(firstSession.id);
        }
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const loadActiveSession = useCallback(async (sessionId: string) => {
    try {
      setIsRestoringSession(true);
      const response = await StudioAPI.getSessionById(sessionId);
      if (response.success && response.data) {
        const session = response.data;

        // Restore session state
        if (session.selectedDatasourceId) {
          const datasourcesResponse = await DatasourceAPI.listDatasources();
          if (datasourcesResponse.success && datasourcesResponse.data) {
            const datasource = datasourcesResponse.data.find(
              (ds) => ds.id === session.selectedDatasourceId,
            );
            if (datasource) {
              setSelectedDatasource(datasource);
              setSelectedDatabase(session.selectedDatabase || "");
              setSelectedSchema(session.selectedSchema || "");
              setSelectedTables(session.selectedTables || []);
              setExpandedSidebar(session.expandedSidebar);

              // Restore chart cards
              console.log("[Session Debug] Loading session chart cards:", {
                sessionId: session.id,
                chartCardsCount: session.chartCards?.length || 0,
                hasChartCards: !!(
                  session.chartCards && session.chartCards.length > 0
                ),
              });

              if (session.chartCards && session.chartCards.length > 0) {
                setChartCards(session.chartCards as ChartCard[]);
                console.log(
                  "[Session Debug] Chart cards restored:",
                  session.chartCards.length,
                );

                // Restore chart data if available
                if (session.chartData) {
                  setChartData(session.chartData);
                  console.log(
                    "[Session Debug] Chart data restored:",
                    Object.keys(session.chartData).length,
                  );
                } else {
                  setChartData({});
                }
              } else {
                setChartCards([]);
                setChartData({});
                console.log(
                  "[Session Debug] No chart cards found, cleared state",
                );
              }

              // Load schema and tables if needed
              if (session.selectedSchema) {
                await loadSchemasAndTablesForSession(
                  datasource.id,
                  session.selectedSchema,
                );
              } else if (datasource) {
                await loadSchemasForSession(datasource.id);
              }
            }
          }
        } else {
          // Clear state for new session
          setSelectedDatasource(null);
          setSelectedDatabase("");
          setSelectedSchema("");
          setSelectedTables([]);
          setChartCards([]);
          setChartData({});
          setAvailableSchemas([]);
          setAvailableTables([]);
        }
      }
    } catch (error) {
      console.error("Failed to load active session:", error);
      toast.error("Failed to load session");
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  const createNewSession = useCallback(async () => {
    try {
      const response = await StudioAPI.createSession();
      if (response.success && response.data) {
        // Add new session to list and make it active
        setSessions((prev) => [
          response.data!,
          ...prev.map((s) => ({ ...s, isActive: false })),
        ]);
        setActiveSessionId(response.data.id);

        // Clear current state for new session
        setSelectedDatasource(null);
        setSelectedDatabase("");
        setSelectedSchema("");
        setSelectedTables([]);
        setChartCards([]);
        setChartData({});
        setAvailableSchemas([]);
        setAvailableTables([]);

        toast.success("New sheet created!");
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      toast.error("Failed to create new sheet");
    }
  }, []);

  const saveCurrentSessionState = useCallback(async () => {
    if (!activeSessionId) return;

    try {
      console.log("[Session Debug] Saving session state:", {
        sessionId: activeSessionId,
        chartCardsCount: chartCards.length,
        datasource: selectedDatasource?.name,
      });

      await StudioAPI.updateSession(activeSessionId, {
        selectedDatasourceId: selectedDatasource?.id || null,
        selectedDatabase,
        selectedSchema,
        selectedTables,
        expandedSidebar,
        chartCards: chartCards,
        chartData: chartData, // Save chart data separately
        sessionMetadata: {},
      });

      console.log("[Session Debug] Session state saved successfully");
    } catch (error) {
      console.error("Failed to save session state:", error);
    }
  }, [
    activeSessionId,
    selectedDatasource,
    selectedDatabase,
    selectedSchema,
    selectedTables,
    expandedSidebar,
    chartCards,
    chartData, // Add chartData to dependencies
  ]);

  const switchToSession = useCallback(
    async (sessionId: string) => {
      if (sessionId === activeSessionId) return;

      try {
        console.log("[Session Debug] Switching sessions:", {
          from: activeSessionId,
          to: sessionId,
          currentChartCards: chartCards.length,
        });

        // Save current session state before switching
        if (activeSessionId) {
          await saveCurrentSessionState();
          console.log(
            "[Session Debug] Current session state saved before switch",
          );
        }

        // Set new active session
        await StudioAPI.setActiveSession(sessionId);

        // Update local state
        setSessions((prev) =>
          prev.map((s) => ({ ...s, isActive: s.id === sessionId })),
        );
        setActiveSessionId(sessionId);

        // Load new session
        await loadActiveSession(sessionId);
        console.log("[Session Debug] New session loaded");

        toast.success("Switched to sheet");
      } catch (error) {
        console.error("Failed to switch session:", error);
        toast.error("Failed to switch sheet");
      }
    },
    [activeSessionId, loadActiveSession, saveCurrentSessionState],
  );

  const renameSession = useCallback(
    async (sessionId: string, newName: string) => {
      try {
        setRenameSessionModal((prev) => ({ ...prev, isRenaming: true }));
        const response = await StudioAPI.updateSession(sessionId, {
          sessionName: newName,
        });

        if (response.success && response.data) {
          setSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId ? { ...s, sessionName: newName } : s,
            ),
          );
          toast.success("Sheet renamed successfully!");
          setRenameSessionModal({
            isOpen: false,
            sessionId: null,
            currentName: "",
            newName: "",
            isRenaming: false,
          });
        }
      } catch (error) {
        console.error("Failed to rename session:", error);
        toast.error("Failed to rename sheet");
      } finally {
        setRenameSessionModal((prev) => ({ ...prev, isRenaming: false }));
      }
    },
    [],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      try {
        setCloseSessionModal((prev) => ({ ...prev, isClosing: true }));

        // Don't allow deleting the last session
        if (sessions.length <= 1) {
          toast.error("Cannot delete the last sheet");
          return;
        }

        const response = await StudioAPI.deleteSession(sessionId);
        if (response.success) {
          // Remove session from list
          const updatedSessions = sessions.filter((s) => s.id !== sessionId);
          setSessions(updatedSessions);

          // If this was the active session, switch to another one
          if (sessionId === activeSessionId && updatedSessions.length > 0) {
            const newActiveSession = updatedSessions[0];
            setActiveSessionId(newActiveSession.id);
            await loadActiveSession(newActiveSession.id);
            await StudioAPI.setActiveSession(newActiveSession.id);
          }

          toast.success("Sheet closed successfully!");
          setCloseSessionModal({
            isOpen: false,
            sessionId: null,
            sessionName: "",
            isClosing: false,
          });
        }
      } catch (error) {
        console.error("Failed to delete session:", error);
        toast.error("Failed to close sheet");
      } finally {
        setCloseSessionModal((prev) => ({ ...prev, isClosing: false }));
      }
    },
    [sessions, activeSessionId, loadActiveSession],
  );

  // Helper functions for schema and table loading
  const loadSchemasForSession = useCallback(async (datasourceId: string) => {
    setIsLoadingSchemas(true);
    try {
      const response = await fetch(
        `/api/analytics/schema?datasourceId=${datasourceId}`,
      );
      const result = await response.json();

      if (result.success && result.schema) {
        const schemas = result.schema.schemas || [];
        const schemaList = schemas.map((schema: string) => ({
          name: schema,
          tableCount:
            result.schema.tables?.filter(
              (table: any) => table.schema === schema,
            )?.length || 0,
        }));
        setAvailableSchemas(schemaList);
      }
    } catch (error) {
      console.error("Failed to load schemas:", error);
    } finally {
      setIsLoadingSchemas(false);
    }
  }, []);

  const loadSchemasAndTablesForSession = useCallback(
    async (datasourceId: string, schemaName: string) => {
      await loadSchemasForSession(datasourceId);

      setIsLoadingTables(true);
      try {
        const response = await fetch(
          `/api/analytics/schema?datasourceId=${datasourceId}`,
        );
        const result = await response.json();

        if (result.success && result.schema) {
          const filteredTables =
            result.schema.tables?.filter(
              (table: any) => table.schema === schemaName,
            ) || [];
          setAvailableTables(filteredTables);
        }
      } catch (error) {
        console.error("Failed to load tables:", error);
      } finally {
        setIsLoadingTables(false);
      }
    },
    [loadSchemasForSession],
  );

  // Datasource loading function
  const loadDatasources = useCallback(async () => {
    try {
      const response = await DatasourceAPI.listDatasources();
      if (response.success && response.data) {
        setDatasources(response.data.filter((ds) => ds.status === "connected"));
      }
    } catch (error) {
      console.error("Error loading datasources:", error);
      toast.error("Failed to load datasources");
    }
  }, []);

  // Auto-save current session state when it changes
  useEffect(() => {
    if (!isRestoringSession && activeSessionId && !isLoadingSessions) {
      const timeoutId = setTimeout(() => {
        saveCurrentSessionState();
      }, 1000); // Debounce saves by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [
    selectedDatasource,
    selectedDatabase,
    selectedSchema,
    selectedTables,
    expandedSidebar,
    chartCards,
    activeSessionId,
    isRestoringSession,
    isLoadingSessions,
    saveCurrentSessionState,
  ]);

  // Cleanup effect to prevent memory leaks and stale data
  useEffect(() => {
    return () => {
      // Clear processed invocations when component unmounts
      processedInvocationsRef.current.clear();
      processedModifyInvocationsRef.current.clear();
      console.log("Cleaned up processed invocations on component unmount");
    };
  }, []);

  // Initialize multi-session system on mount
  useEffect(() => {
    const initializeStudio = async () => {
      try {
        // Load datasources first
        await loadDatasources();

        // Load all sessions and set up the active one
        await loadSessions();
      } catch (error) {
        console.error("Failed to initialize studio:", error);
        toast.error("Failed to initialize studio");
      } finally {
        setIsLoadingSession(false);
      }
    };

    initializeStudio();
  }, [loadDatasources, loadSessions]);

  // Load active session when activeSessionId changes
  useEffect(() => {
    if (activeSessionId && !isLoadingSessions) {
      loadActiveSession(activeSessionId);
    }
  }, [activeSessionId, isLoadingSessions, loadActiveSession]);

  // Auto-save is now handled in the new multi-session system above

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

  const refreshSchemas = async () => {
    if (!selectedDatasource) {
      toast.error("No datasource selected");
      return;
    }

    console.log("Refreshing schemas for datasource:", selectedDatasource.id);

    // Clear current schema-related state to prevent stale data
    setAvailableSchemas([]);
    setSelectedSchema("");
    setAvailableTables([]);
    setSelectedTables([]);

    setIsLoadingSchemas(true);
    try {
      // Use API route to get fresh database schema
      const response = await fetch(
        `/api/analytics/schema?datasourceId=${selectedDatasource.id}`,
      );
      const result = await response.json();

      if (result.success && result.schema) {
        // Extract unique schemas from the fresh schema response
        const schemas = result.schema.schemas || [];
        const schemaList = schemas.map((schema: string) => ({
          name: schema,
          tableCount:
            result.schema.tables?.filter(
              (table: any) => table.schema === schema,
            )?.length || 0,
        }));

        setAvailableSchemas(schemaList);

        console.log(`Successfully refreshed ${schemaList.length} schemas`);
        toast.success(
          `Refreshed ${schemaList.length} schema${schemaList.length !== 1 ? "s" : ""}`,
        );
      } else {
        console.error("Schema refresh failed:", result.error);
        toast.error(result.error || "Failed to refresh database schemas");
      }
    } catch (error) {
      console.error("Error refreshing schemas:", error);
      toast.error("Failed to refresh database schemas");
    } finally {
      setIsLoadingSchemas(false);
    }
  };

  const refreshTables = async () => {
    if (!selectedDatasource || !selectedSchema) {
      toast.error("No datasource or schema selected");
      return;
    }

    console.log("Refreshing tables for schema:", selectedSchema);

    // Clear current table-related state
    setAvailableTables([]);
    setSelectedTables([]);

    await loadTables();
    toast.success("Tables refreshed successfully");
  };

  // Function to fetch table details (columns and sample data)
  const fetchTableDetails = async (table: DatabaseTable) => {
    if (!selectedDatasource) return;

    const tableKey = `${table.schema}.${table.name}`;

    // Don't fetch if already loading or already have data
    if (tableDetails[tableKey]?.loading || tableDetails[tableKey]?.columns) {
      return;
    }

    // Set loading state
    setTableDetails((prev) => ({
      ...prev,
      [tableKey]: { ...prev[tableKey], loading: true },
    }));

    try {
      // Fetch table schema (columns)
      const schemaResponse = await fetch(
        `/api/analytics/table-details?datasourceId=${selectedDatasource.id}&schema=${table.schema}&table=${table.name}`,
      );

      if (!schemaResponse.ok) {
        throw new Error(
          `Failed to fetch table details: ${schemaResponse.statusText}`,
        );
      }

      const schemaResult = await schemaResponse.json();

      if (schemaResult.success) {
        console.log(`✅ Fetched table details for ${tableKey}:`, {
          columns: schemaResult.columns?.length || 0,
          sampleData: schemaResult.sampleData?.length || 0,
          hasColumns: !!schemaResult.columns && schemaResult.columns.length > 0,
          hasSampleData:
            !!schemaResult.sampleData && schemaResult.sampleData.length > 0,
        });

        setTableDetails((prev) => ({
          ...prev,
          [tableKey]: {
            ...prev[tableKey],
            columns: schemaResult.columns || [],
            sampleData: schemaResult.sampleData || [],
            loading: false,
            error: undefined,
          },
        }));
      } else {
        throw new Error(schemaResult.error || "Failed to fetch table details");
      }
    } catch (error) {
      console.error(`Error fetching details for table ${tableKey}:`, error);

      // More specific error message based on the error
      let errorMessage = "Failed to fetch table details";
      if (error instanceof Error) {
        if (error.message.includes("does not exist")) {
          errorMessage = "Table not found";
        } else if (error.message.includes("permission")) {
          errorMessage = "Permission denied";
        } else if (error.message.includes("connection")) {
          errorMessage = "Database connection error";
        } else {
          errorMessage = error.message;
        }
      }

      setTableDetails((prev) => ({
        ...prev,
        [tableKey]: {
          ...prev[tableKey],
          loading: false,
          error: errorMessage,
        },
      }));
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

    // Track generation start time
    const startTime = Date.now();
    setGenerationStartTime(startTime);
    setLastGenerationDuration(null);
    setCurrentGenerationTime(0);

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

IMPORTANT GUIDELINES:

1. CHART TYPE SELECTION:
   - Explicit chart type mentions in the query
   - The nature of the data being requested
   - Time-based patterns (use line charts)
   - Categorical distributions (use pie charts for ≤10 items)
   - Comparisons and counts (use bar charts)
   - Raw data analysis or detailed data inspection (use table format)
   - When user asks for "table", "raw data", "show me the data", or wants to see all columns

2. VISUAL STYLING vs DATA LOGIC:
   - Focus on generating the correct SQL query for the DATA requirements
   - DO NOT add color columns to SQL unless explicitly requested for data analysis
   - Visual styling (colors, chart appearance) should be handled in the chart configuration
   - Chart colors should use the "fill", "stroke" properties in the chart components
   - Default to professional color schemes: blues (#1f77b4, #aec7e8), greens (#2ca02c, #98df8a), oranges (#ff7f0e, #ffbb78)

3. CHART CONFIGURATION:
   - Generate appropriate chart configuration with proper visual styling
   - Use fill="#colorHex" for bar charts, area charts, pie charts
   - Use stroke="#colorHex" for line charts, scatter plots
   - Include proper component configurations for visual elements
   - Set reasonable defaults for margins, axes, tooltips, and legend

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
                    chartConfig: {
                      ...chart.chartConfig,
                      metadata: {
                        ...chart.chartConfig.metadata,
                        title: newTitle,
                      },
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

  // Enhanced refresh data handler that handles modified charts
  const handleRefreshData = useCallback(
    async (chartId: string) => {
      // Access the current state via a ref or by accessing it in the useCallback deps
      const currentChart = chartCards.find((c) => c.id === chartId);

      if (!currentChart || !currentChart.datasourceId || !selectedDatasource) {
        toast.error("Cannot refresh chart: missing datasource information");
        return;
      }

      // Add detailed logging for debugging
      console.log("[Refresh Debug] Refreshing chart:", {
        chartId: currentChart.id,
        sql: currentChart.sql,
        query: currentChart.query,
        datasourceId: currentChart.datasourceId,
        selectedTables: currentChart.selectedTables,
        lastUpdated: currentChart.lastUpdated,
      });

      toast.info("Refreshing chart data...", { id: `refresh-${chartId}` });

      try {
        const response = await fetch("/api/charts/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chartId: currentChart.id,
            datasourceId: currentChart.datasourceId,
            sql: currentChart.sql,
            selectedTables: currentChart.selectedTables || [],
            query: currentChart.query,
            forceRefresh: true, // Add flag to force cache invalidation
            lastUpdated: currentChart.lastUpdated, // Send timestamp to detect modifications
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          console.log("[Refresh Debug] Refresh successful:", {
            chartId,
            dataRowCount: result.data?.length || 0,
            fromCache: result.fromCache,
            executionTime: result.executionTime,
          });

          // Update chart data with fresh results
          setChartData((prev) => ({
            ...prev,
            [chartId]: result.data || [],
          }));

          // Update chart metadata with fresh execution info
          setChartCards((prev) =>
            prev.map((c) =>
              c.id === chartId
                ? {
                    ...c,
                    rowCount: result.rowCount || 0,
                    executionTime: result.executionTime || 0,
                    lastUpdated: Date.now(),
                  }
                : c,
            ),
          );

          toast.success(
            `Chart data refreshed successfully (${result.data?.length || 0} rows)`,
            {
              id: `refresh-${chartId}`,
            },
          );
        } else {
          throw new Error(result.error || "Failed to refresh chart data");
        }
      } catch (error) {
        console.error("Failed to refresh chart data:", error);
        toast.error(
          `Failed to refresh chart data: ${error instanceof Error ? error.message : "Unknown error"}`,
          { id: `refresh-${chartId}` },
        );
      }
    },
    [chartCards, selectedDatasource], // Include chartCards to get latest state
  );

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
- Original Chart Title: "${currentChart.chartConfig?.metadata?.title || "Untitled Chart"}"
- Original Query: "${currentChart.query}"
- Current SQL Query: 
\`\`\`sql
${currentChart.sql}
\`\`\`
- Current Chart Type: ${currentChart.chartConfig?.chartType || "LineChart"}
- Current Data Rows: ${currentChart.rowCount}

MODIFICATION REQUEST: "${query}"

AVAILABLE DATA:
- Selected Tables: ${selectedTables.join(", ")}
- Datasource ID: ${selectedDatasource.id}

CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. DETERMINE THE TYPE OF CHANGE REQUESTED:

   A) VISUAL STYLING CHANGES (DO NOT MODIFY SQL):
   - Color changes: "make it red", "change line color to blue", "use green bars", "change color to red"
   - Chart type changes: "convert to bar chart", "make it a pie chart"  
   - Visual properties: "make lines thicker", "change transparency", "different colors for each category"
   - Legend/axis styling: "hide legend", "rotate labels", "change axis colors"
   
   IMPORTANT: For these requests, call textToSql with:
   - query: "${query}"
   - isVisualOnlyChange: true  
   - currentChartConfig: ${JSON.stringify(currentChart.chartConfig)}
   - currentSql: "${currentChart.sql}"
   - datasourceId: "${selectedDatasource.id}"
   - selectedTables: ${JSON.stringify(selectedTables)}
   
   B) DATA LOGIC CHANGES (MODIFY SQL):
   - Adding new columns: "add revenue column", "include customer count"
   - Filtering: "only show last 6 months", "filter by premium users"
   - Aggregation: "group by month", "sum by category", "average per day"
   - Sorting: "order by date", "sort by highest revenue"
   - Join operations: "include user data", "add product information"

2. HOW TO IDENTIFY VISUAL-ONLY CHANGES:
   - Query contains color words: red, blue, green, yellow, orange, purple, pink, etc.
   - Query mentions "color", "style", "appearance", "visual"
   - Query asks to change chart type without changing data
   - Query does NOT ask for new data, columns, filtering, or aggregation

3. TOOL PARAMETERS:
   - For visual changes: Set isVisualOnlyChange=true and pass currentChartConfig
   - For data changes: Use currentSql for context and do NOT set isVisualOnlyChange
   - Always preserve the original title unless explicitly asked to change

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

  // Reset functionality
  const handleReset = useCallback(() => {
    setResetModal({
      isOpen: true,
      isResetting: false,
    });
  }, []);

  const confirmReset = useCallback(async () => {
    setResetModal((prev) => ({ ...prev, isResetting: true }));

    try {
      // Delete all charts from database first
      const deleteResponse = await StudioAPI.deleteAllCharts();
      if (deleteResponse.success) {
        toast.success(
          `Deleted ${deleteResponse.data?.deletedCount || 0} chart${
            (deleteResponse.data?.deletedCount || 0) !== 1 ? "s" : ""
          } from database`,
        );
      } else {
        console.error("Failed to delete charts:", deleteResponse.error);
        toast.error("Failed to delete charts from database");
      }

      // Clear all local state
      setSelectedDatasource(null);
      setSelectedDatabase("");
      setAvailableSchemas([]);
      setSelectedSchema("");
      setAvailableTables([]);
      setSelectedTables([]);
      setChartCards([]);
      setInput("");

      // Clear AI input states
      setAiInputOpen({});
      setAiInputQuery({});

      // Clear title editing states
      setEditingTitleId(null);
      setEditingTitleValue("");
      setIsSavingTitle(null);

      // Clear modification tracking
      setModifyingChartId(null);

      // Clear processed invocations
      processedInvocationsRef.current.clear();
      processedModifyInvocationsRef.current.clear();

      // Save empty session to database
      const emptySession = {
        selectedDatasourceId: null,
        selectedDatabase: "",
        selectedSchema: "",
        selectedTables: [],
        expandedSidebar: true,
        sessionMetadata: {},
      };

      const saveResponse = await StudioAPI.saveSession(emptySession);
      if (!saveResponse.success) {
        console.error("Failed to save reset session:", saveResponse.error);
        // Continue anyway as local state is already cleared
      }

      toast.success("Studio reset successfully!");
    } catch (error) {
      console.error("Error resetting studio:", error);
      toast.error("Failed to reset studio");
    } finally {
      setResetModal({
        isOpen: false,
        isResetting: false,
      });
    }
  }, [setInput]);

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
    <div className="flex h-full bg-background border-t ">
      {/* Left Sidebar - Dataset Selection */}
      <div
        className={`border-r bg-muted/20 transition-all duration-300 flex flex-col ${expandedSidebar ? "w-80" : "w-16"}`}
      >
        <div className="p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3">
            {expandedSidebar && (
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <h2 className="text-base font-semibold">Data Sources</h2>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedSidebar(!expandedSidebar)}
              className="h-8 w-8 p-0"
            >
              {expandedSidebar ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {expandedSidebar && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <Accordion
                type="multiple"
                defaultValue={["database", "schema", "tables"]}
                className="w-full"
              >
                {/* Database Selection */}
                <AccordionItem value="database">
                  <AccordionTrigger className="py-3">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      <span>DB Connection</span>
                      {selectedDatasource && (
                        <Badge variant="secondary" className="ml-2">
                          {selectedDatasource.name}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
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
                            <SelectItem
                              key={datasource.id}
                              value={datasource.id}
                            >
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {datasource.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Schema Selection */}
                {selectedDatasource && (
                  <AccordionItem value="schema">
                    <AccordionTrigger className="py-3">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>Schema</span>
                        {selectedSchema && (
                          <Badge variant="secondary" className="ml-2">
                            {selectedSchema}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Select schema
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={refreshSchemas}
                            className="h-6 w-6 p-0"
                            disabled={isLoadingSchemas}
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${isLoadingSchemas ? "animate-spin" : ""}`}
                            />
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
                                <SelectItem
                                  key={schema.name}
                                  value={schema.name}
                                >
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
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Table Selection */}
                {selectedDatasource && selectedSchema && (
                  <AccordionItem value="tables">
                    <AccordionTrigger className="py-3">
                      <div className="flex items-center gap-2">
                        <TableIcon className="h-4 w-4" />
                        <span>Tables</span>
                        {selectedTables.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {selectedTables.length} selected
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Select tables to query
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={refreshTables}
                            className="h-6 w-6 p-0"
                            disabled={isLoadingTables}
                          >
                            <RefreshCw
                              className={`h-3 w-3 ${isLoadingTables ? "animate-spin" : ""}`}
                            />
                          </Button>
                        </div>
                        {isLoadingTables ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          <div className="max-h-80 overflow-y-auto">
                            <div className="space-y-2 pr-2">
                              {availableTables.map((table) => {
                                const tableKey = `${table.schema}.${table.name}`;
                                const isSelected = selectedTables.includes(
                                  table.schema
                                    ? `${table.schema}.${table.name}`
                                    : table.name,
                                );

                                return (
                                  <HoverCard
                                    key={table.name}
                                    openDelay={400}
                                    closeDelay={100}
                                  >
                                    <HoverCardTrigger asChild>
                                      <div
                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                          isSelected
                                            ? "bg-primary/10 border-primary"
                                            : "bg-background hover:bg-muted"
                                        }`}
                                        onClick={() =>
                                          handleTableSelection(table)
                                        }
                                        onMouseEnter={() =>
                                          fetchTableDetails(table)
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <TableIcon className="h-4 w-4 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                              {table.name}
                                            </div>
                                          </div>
                                          {isSelected && (
                                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                          )}
                                        </div>
                                      </div>
                                    </HoverCardTrigger>
                                    <HoverCardContent
                                      className="w-96"
                                      side="right"
                                      align="start"
                                    >
                                      <div className="space-y-3">
                                        <div>
                                          <h4 className="text-sm font-semibold">
                                            {table.name}
                                          </h4>
                                          <p className="text-xs text-muted-foreground">
                                            Schema: {table.schema}
                                          </p>
                                        </div>

                                        <Tabs
                                          defaultValue="schema"
                                          className="w-full"
                                        >
                                          <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="schema">
                                              Schema
                                            </TabsTrigger>
                                            <TabsTrigger value="sample">
                                              Sample Data
                                            </TabsTrigger>
                                          </TabsList>

                                          <TabsContent
                                            value="schema"
                                            className="mt-3"
                                          >
                                            <div className="space-y-2">
                                              <h5 className="text-xs font-medium text-muted-foreground">
                                                Columns
                                              </h5>
                                              {tableDetails[tableKey]
                                                ?.loading ? (
                                                <div className="flex items-center justify-center py-4">
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                  <span className="ml-2 text-xs text-muted-foreground">
                                                    Loading schema...
                                                  </span>
                                                </div>
                                              ) : tableDetails[tableKey]
                                                  ?.error ? (
                                                <div className="text-xs text-red-500 py-2">
                                                  {
                                                    tableDetails[tableKey]
                                                      ?.error
                                                  }
                                                </div>
                                              ) : tableDetails[tableKey]
                                                  ?.columns ? (
                                                <div className="max-h-48 overflow-y-auto">
                                                  <div className="space-y-1">
                                                    {tableDetails[
                                                      tableKey
                                                    ]?.columns?.map(
                                                      (column, idx) => (
                                                        <div
                                                          key={idx}
                                                          className="flex justify-between items-center py-1 px-2 bg-muted/50 rounded text-xs"
                                                        >
                                                          <span className="font-mono">
                                                            {column.name}
                                                          </span>
                                                          <span className="text-muted-foreground">
                                                            {column.type}
                                                          </span>
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="text-xs text-muted-foreground py-2">
                                                  Hover to load schema
                                                  information
                                                </div>
                                              )}
                                            </div>
                                          </TabsContent>

                                          <TabsContent
                                            value="sample"
                                            className="mt-3"
                                          >
                                            <div className="space-y-2">
                                              <h5 className="text-xs font-medium text-muted-foreground">
                                                Sample Data (First 5 rows)
                                              </h5>
                                              {tableDetails[tableKey]
                                                ?.loading ? (
                                                <div className="flex items-center justify-center py-4">
                                                  <Loader2 className="h-4 w-4 animate-spin" />
                                                  <span className="ml-2 text-xs text-muted-foreground">
                                                    Loading sample data...
                                                  </span>
                                                </div>
                                              ) : tableDetails[tableKey]
                                                  ?.error ? (
                                                <div className="text-xs text-red-500 py-2">
                                                  {
                                                    tableDetails[tableKey]
                                                      ?.error
                                                  }
                                                </div>
                                              ) : tableDetails[tableKey]
                                                  ?.sampleData !== undefined ? (
                                                tableDetails[tableKey]
                                                  ?.sampleData?.length > 0 ? (
                                                  <div className="max-h-48 overflow-auto">
                                                    <Table>
                                                      <TableHeader>
                                                        <TableRow>
                                                          {tableDetails[
                                                            tableKey
                                                          ]?.sampleData?.[0] &&
                                                            Object.keys(
                                                              tableDetails[
                                                                tableKey
                                                              ]
                                                                ?.sampleData?.[0] ||
                                                                {},
                                                            ).map((key) => (
                                                              <TableHead
                                                                key={key}
                                                                className="text-xs px-2 py-1"
                                                              >
                                                                {key}
                                                              </TableHead>
                                                            ))}
                                                        </TableRow>
                                                      </TableHeader>
                                                      <TableBody>
                                                        {tableDetails[
                                                          tableKey
                                                        ]?.sampleData?.map(
                                                          (row, idx) => (
                                                            <TableRow key={idx}>
                                                              {Object.values(
                                                                row,
                                                              ).map(
                                                                (
                                                                  value: any,
                                                                  cellIdx,
                                                                ) => (
                                                                  <TableCell
                                                                    key={
                                                                      cellIdx
                                                                    }
                                                                    className="text-xs px-2 py-1 max-w-24 truncate"
                                                                  >
                                                                    {value?.toString() ||
                                                                      ""}
                                                                  </TableCell>
                                                                ),
                                                              )}
                                                            </TableRow>
                                                          ),
                                                        )}
                                                      </TableBody>
                                                    </Table>
                                                  </div>
                                                ) : (
                                                  <div className="text-xs text-muted-foreground py-2">
                                                    No sample data available for
                                                    this table
                                                  </div>
                                                )
                                              ) : (
                                                <div className="text-xs text-muted-foreground py-2">
                                                  Hover to load sample data
                                                </div>
                                              )}
                                            </div>
                                          </TabsContent>
                                        </Tabs>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Multi-Session Tabs */}
        {!isLoadingSessions && sessions.length > 0 && (
          <div className="border-b bg-background">
            <div className="flex items-center px-6 py-2 gap-2">
              {/* Session Tabs */}
              <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-t-lg border-b-2 transition-colors cursor-pointer min-w-0 ${
                      session.id === activeSessionId
                        ? "bg-muted border-primary text-primary"
                        : "hover:bg-muted/50 border-transparent"
                    }`}
                    onClick={() => switchToSession(session.id)}
                  >
                    <span className="text-sm font-medium truncate min-w-0">
                      {session.sessionName}
                    </span>

                    {/* Three-dot menu for session options */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-background/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-1" align="start">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameSessionModal({
                              isOpen: true,
                              sessionId: session.id,
                              currentName: session.sessionName,
                              newName: session.sessionName,
                              isRenaming: false,
                            });
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-2" />
                          Rename Sheet
                        </Button>
                        {sessions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 px-2 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCloseSessionModal({
                                isOpen: true,
                                sessionId: session.id,
                                sessionName: session.sessionName,
                                isClosing: false,
                              });
                            }}
                          >
                            <X className="h-3 w-3 mr-2" />
                            Close Sheet
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
              </div>

              {/* Add New Session Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={createNewSession}
                className="h-8 w-8 p-0 flex-shrink-0"
                title="Create new sheet"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        className="px-3 h-8"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset Studio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
        </div>

        {/* Query Input */}
        <div className="border-b bg-muted/20">
          <Accordion
            type="single"
            defaultValue="query"
            collapsible
            className="px-6"
          >
            <AccordionItem value="query" className="border-none">
              <AccordionTrigger className="py-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium">
                    Ask a question about your data
                  </span>
                  {selectedTables.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedTables.length} table
                      {selectedTables.length !== 1 ? "s" : ""} selected
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pb-4">
                  {/* Full width text area */}
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
                    className="w-full min-h-[80px] resize-none"
                    disabled={isChatLoading}
                  />

                  {/* Generate button and status */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Button
                      onClick={generateChart}
                      disabled={
                        !input.trim() ||
                        selectedTables.length === 0 ||
                        isChatLoading
                      }
                      className="px-6 h-10 font-medium"
                    >
                      {isChatLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <BarChart3 className="h-4 w-4 mr-2" />
                      )}
                      Generate Chart
                    </Button>

                    {/* Status information */}
                    <div className="text-sm text-muted-foreground">
                      {isChatLoading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Generating chart...</span>
                          <span className="text-xs">
                            ({(currentGenerationTime / 1000).toFixed(1)}s)
                          </span>
                        </div>
                      ) : lastGenerationDuration ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>
                            Last generation completed in{" "}
                            {(lastGenerationDuration / 1000).toFixed(1)}s
                          </span>
                          {selectedTables.length > 0 && (
                            <>
                              <span className="mx-1">·</span>
                              <span>
                                {selectedTables.length} table
                                {selectedTables.length !== 1 ? "s" : ""}{" "}
                                selected
                              </span>
                            </>
                          )}
                        </div>
                      ) : selectedTables.length === 0 ? (
                        <span>
                          Select tables from the sidebar to get started
                        </span>
                      ) : (
                        <span>
                          Ready to generate charts · {selectedTables.length}{" "}
                          table
                          {selectedTables.length !== 1 ? "s" : ""} selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
                    data={chartData[chart.id] || []}
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
                    onRefreshData={handleRefreshData}
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

      {/* Reset confirmation modal */}
      <ConfirmationModal
        isOpen={resetModal.isOpen}
        onClose={() =>
          setResetModal({
            isOpen: false,
            isResetting: false,
          })
        }
        onConfirm={confirmReset}
        title="Reset Studio"
        description="Are you sure you want to reset the studio? This will clear all selected data sources, tables, charts, and start fresh. This action cannot be undone."
        confirmText="Reset"
        cancelText="Cancel"
        variant="destructive"
        isLoading={resetModal.isResetting}
      />

      {/* Rename session modal */}
      {renameSessionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() =>
              setRenameSessionModal({
                isOpen: false,
                sessionId: null,
                currentName: "",
                newName: "",
                isRenaming: false,
              })
            }
          />
          <Card className="relative z-10 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Rename Sheet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter a new name for the sheet:
              </p>
              <Input
                value={renameSessionModal.newName}
                onChange={(e) =>
                  setRenameSessionModal((prev) => ({
                    ...prev,
                    newName: e.target.value,
                  }))
                }
                placeholder="Sheet name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && renameSessionModal.newName.trim()) {
                    e.preventDefault();
                    if (renameSessionModal.sessionId) {
                      renameSession(
                        renameSessionModal.sessionId,
                        renameSessionModal.newName.trim(),
                      );
                    }
                  }
                }}
                autoFocus
                disabled={renameSessionModal.isRenaming}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setRenameSessionModal({
                      isOpen: false,
                      sessionId: null,
                      currentName: "",
                      newName: "",
                      isRenaming: false,
                    })
                  }
                  disabled={renameSessionModal.isRenaming}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (
                      renameSessionModal.sessionId &&
                      renameSessionModal.newName.trim()
                    ) {
                      renameSession(
                        renameSessionModal.sessionId,
                        renameSessionModal.newName.trim(),
                      );
                    }
                  }}
                  disabled={
                    !renameSessionModal.newName.trim() ||
                    renameSessionModal.isRenaming
                  }
                >
                  {renameSessionModal.isRenaming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Renaming...
                    </>
                  ) : (
                    "Rename"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Close session confirmation modal */}
      <ConfirmationModal
        isOpen={closeSessionModal.isOpen}
        onClose={() =>
          setCloseSessionModal({
            isOpen: false,
            sessionId: null,
            sessionName: "",
            isClosing: false,
          })
        }
        onConfirm={() => {
          if (closeSessionModal.sessionId) {
            deleteSession(closeSessionModal.sessionId);
          }
        }}
        title="Close Sheet"
        description={`Are you sure you want to close "${closeSessionModal.sessionName}"? All charts and data in this sheet will be permanently deleted. This action cannot be undone.`}
        confirmText="Close Sheet"
        cancelText="Cancel"
        variant="destructive"
        isLoading={closeSessionModal.isClosing}
      />
    </div>
  );
}
