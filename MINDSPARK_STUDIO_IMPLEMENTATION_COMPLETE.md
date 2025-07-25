# MindSpark Studio: AI-Driven Data Visualization System Requirements

## 🎯 Executive Summary

MindSpark Studio is an intelligent dashboard and visualization platform that transforms natural language conversations into SQL queries and interactive data visualizations. The system combines chat-based interaction with Apache Superset-inspired dashboard functionality, enabling users to create, manage, and compose charts through conversational AI.

## 🏗️ System Architecture Overview

### Core Components

1. **AI Agent Interface** - Natural language to SQL conversion engine
2. **Chart Generation Engine** - Dynamic visualization creation and rendering
3. **Dashboard Builder** - Grid-based dashboard composition system with real-time data
4. **Dataset Manager** - Database connection and schema management
5. **Real-time Query Engine** - Live data refresh and caching layer for dashboards

### Data Architecture Strategy

**Two-Tier Data Handling Approach**:

1. **Chat-Generated Charts (Static Snapshots)**:

   - Data is queried once and stored as a snapshot in the database
   - Charts display cached results for consistent historical reference
   - Data remains fixed unless explicitly refreshed by user
   - Stored in `chart_data_cache` for persistence and sharing

2. **Dashboard Charts (Real-Time Dynamic)**:
   - Data is queried live from the database on each refresh
   - No data storage in application database (live connection only)
   - Configurable auto-refresh intervals (5s, 10s, 15s, 1min, 5min, etc.)
   - Real-time updates with WebSocket connections for instant data propagation

## 📋 Detailed Feature Requirements

### 1. Visual Agent via Chat (Text-to-SQL to Chart)

#### 1.1 Conversational Interface

- **Natural Language Processing**: Accept user queries in plain English
- **Context Awareness**: Maintain conversation history and dataset context
- **Multi-turn Conversations**: Support follow-up questions and refinements
- **Intent Recognition**: Identify visualization type from user query

#### 1.2 SQL Generation Engine

- **Text-to-SQL Conversion**: Convert natural language to PostgreSQL queries
- **Query Validation**: Syntax and security validation before execution
- **Query Optimization**: Automatic query performance optimization
- **Error Handling**: Graceful handling of invalid queries with suggestions

#### 1.3 Chart Auto-Generation

- **Intelligent Chart Type Selection**: Automatically choose appropriate visualization based on data
- **Data Type Detection**: Analyze data types to suggest optimal chart configurations
- **Multi-chart Support**: Generate multiple visualizations from single query when appropriate

### 2. Chart Card Component System

#### 2.1 Enhanced Chart Card Structure

The chart card system has been enhanced with advanced interaction capabilities and Apache Superset-inspired functionality for seamless dashboard composition.

```typescript
interface ChartCard {
  id: string;
  title: string;
  description?: string;
  chartType: ChartType;
  sqlQuery: string;
  dataResult: QueryResult; // Static snapshot for chat-generated charts
  chartConfig: ChartConfiguration;
  metadata: ChartMetadata;
  createdAt: Date;
  updatedAt: Date;

  // Data handling strategy
  dataMode: "static" | "realtime"; // Determines data fetching approach
  snapshotTimestamp?: Date; // When static data was captured
  refreshInterval?: number; // Seconds between auto-refresh (dashboard only)
  lastRefresh?: Date; // Last time realtime data was fetched

  // Enhanced card state management
  cardState: {
    mode: "visualization" | "settings";
    activeTab?: "data" | "query" | "config";
    aiInputVisible: boolean;
    isPinned: boolean;
    isEditable: boolean;
    isRefreshing?: boolean; // Loading state for realtime updates
  };
}
```

#### 2.2 Three-Button Action System (Top-Right Card Controls)

**Button Layout and Styling**:

```typescript
interface CardActionButtons {
  aiEnhancement: {
    icon: "star";
    position: "top-right-1";
    tooltip: "AI Chart Enhancement";
    variant: "primary";
  };
  inspect: {
    icon: "magnifying-glass";
    position: "top-right-2";
    tooltip: "Inspect Chart Settings";
    variant: "secondary";
  };
  pin: {
    icon: "pin";
    position: "top-right-3";
    tooltip: "Save to Chart Library";
    variant: "success";
    state: "pinned" | "unpinned";
  };
}
```

**AI Enhancement Button Implementation**:

```typescript
// components/chart-card/AIEnhancementInput.tsx
interface AIEnhancementInputProps {
  chartId: string;
  currentConfig: ChartConfiguration;
  onConfigUpdate: (newConfig: ChartConfiguration) => void;
  onQueryUpdate: (newQuery: string) => void;
  visible: boolean;
  onClose: () => void;
}

const AIEnhancementInput: React.FC<AIEnhancementInputProps> = ({
  chartId,
  currentConfig,
  onConfigUpdate,
  onQueryUpdate,
  visible,
  onClose,
}) => {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleAICommand = async (command: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/charts/ai-enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartId,
          command,
          currentConfig,
        }),
      });

      const result = await response.json();

      if (result.type === "config_change") {
        onConfigUpdate(result.newConfig);
      } else if (result.type === "query_change") {
        onQueryUpdate(result.newQuery);
      }
    } catch (error) {
      console.error("AI enhancement error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const predefinedSuggestions = [
    "Change to blue gradient colors",
    "Add trend line",
    "Group by month instead of day",
    "Increase font size",
    "Change to horizontal bar chart",
    "Add data labels",
  ];

  if (!visible) return null;

  return (
    <div className="absolute top-12 right-0 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          AI Chart Enhancement
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe how you want to modify this chart..."
          className="w-full h-20 p-2 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex gap-2">
          <button
            onClick={() => handleAICommand(input)}
            disabled={!input.trim() || isProcessing}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Apply Changes"}
          </button>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-1">
            {predefinedSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setInput(suggestion)}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

**Inspect Button - Settings View Implementation**:

```typescript
// components/chart-card/ChartSettingsView.tsx
interface ChartSettingsViewProps {
  chart: ChartCard;
  onUpdate: (updates: Partial<ChartCard>) => void;
  onClose: () => void;
}

const ChartSettingsView: React.FC<ChartSettingsViewProps> = ({
  chart,
  onUpdate,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"data" | "query" | "config">(
    "data"
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium">Chart Settings</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b">
        {["data", "query", "config"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "data"
              ? "Data Results"
              : tab === "query"
              ? "SQL Query"
              : "Chart Config"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "data" && (
          <DataResultsTab
            data={chart.dataResult}
            onExport={(format) => exportData(chart.id, format)}
          />
        )}

        {activeTab === "query" && (
          <SQLQueryTab
            query={chart.sqlQuery}
            onQueryUpdate={(newQuery) => onUpdate({ sqlQuery: newQuery })}
            executionStats={chart.metadata.executionStats}
          />
        )}

        {activeTab === "config" && (
          <ChartConfigTab
            config={chart.chartConfig}
            chartType={chart.chartType}
            onConfigUpdate={(newConfig) => onUpdate({ chartConfig: newConfig })}
          />
        )}
      </div>
    </div>
  );
};
```

**Pin Button Implementation**:

```typescript
// hooks/useChartPin.ts
interface UseChartPinReturn {
  isPinned: boolean;
  isLoading: boolean;
  pinChart: () => Promise<void>;
  unpinChart: () => Promise<void>;
  togglePin: () => Promise<void>;
}

export const useChartPin = (chartId: string): UseChartPinReturn => {
  const [isPinned, setIsPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const pinChart = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/charts/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId }),
      });
      setIsPinned(true);

      // Show success notification
      toast.success("Chart saved to library!");

      // Analytics tracking
      analytics.track("chart_pinned", { chartId });
    } catch (error) {
      toast.error("Failed to save chart");
    } finally {
      setIsLoading(false);
    }
  };

  const unpinChart = async () => {
    setIsLoading(true);
    try {
      await fetch(`/api/charts/pin/${chartId}`, {
        method: "DELETE",
      });
      setIsPinned(false);
      toast.success("Chart removed from library");
    } catch (error) {
      toast.error("Failed to remove chart");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePin = async () => {
    if (isPinned) {
      await unpinChart();
    } else {
      await pinChart();
    }
  };

  return {
    isPinned,
    isLoading,
    pinChart,
    unpinChart,
    togglePin,
  };
};

// components/chart-card/PinButton.tsx
const PinButton: React.FC<{ chartId: string }> = ({ chartId }) => {
  const { isPinned, isLoading, togglePin } = useChartPin(chartId);

  return (
    <button
      onClick={togglePin}
      disabled={isLoading}
      className={`p-2 rounded-md transition-colors ${
        isPinned
          ? "bg-green-100 text-green-600 hover:bg-green-200"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
      title={isPinned ? "Remove from library" : "Save to library"}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <PinIcon className={`w-4 h-4 ${isPinned ? "fill-current" : ""}`} />
      )}
    </button>
  );
};
```

#### 2.3 Three-Tab Interface (Settings Mode)

When the inspect button is activated, the chart visualization is replaced with a comprehensive settings interface featuring three distinct tabs:

1. **Data Result Tab**

   - **Real-time Data Display**: Live tabular display of query results with virtual scrolling for large datasets
   - **Advanced Pagination**: Server-side pagination with configurable page sizes (10, 25, 50, 100 rows)
   - **Multi-format Export**: Export functionality supporting CSV, JSON, Excel, and Parquet formats
   - **Interactive Sorting**: Click-to-sort on any column with visual indicators
   - **Advanced Filtering**: Column-specific filters with data type awareness
   - **Data Profiling**: Quick statistics showing null counts, unique values, and data distributions

   ```typescript
   interface DataResultsTabProps {
     data: QueryResult;
     onExport: (format: ExportFormat) => void;
     onSort: (column: string, direction: "asc" | "desc") => void;
     onFilter: (filters: Record<string, FilterValue>) => void;
   }

   const DataResultsTab: React.FC<DataResultsTabProps> = ({
     data,
     onExport,
     onSort,
     onFilter,
   }) => {
     return (
       <div className="p-4 space-y-4">
         {/* Export and Actions Bar */}
         <div className="flex justify-between items-center">
           <div className="text-sm text-gray-600">
             {data.totalRows.toLocaleString()} rows • {data.columns.length}{" "}
             columns
           </div>
           <div className="flex gap-2">
             {["CSV", "JSON", "Excel"].map((format) => (
               <button
                 key={format}
                 onClick={() => onExport(format.toLowerCase() as ExportFormat)}
                 className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
               >
                 Export {format}
               </button>
             ))}
           </div>
         </div>

         {/* Data Table with Virtual Scrolling */}
         <div className="border rounded-lg overflow-hidden">
           <VirtualizedTable
             data={data.rows}
             columns={data.columns}
             onSort={onSort}
             onFilter={onFilter}
             height={400}
           />
         </div>

         {/* Data Profiling Panel */}
         <DataProfilingPanel
           columns={data.columns}
           statistics={data.statistics}
         />
       </div>
     );
   };
   ```

2. **SQL Generate Tab**

   - **Syntax-highlighted Query Display**: CodeMirror integration with PostgreSQL syntax highlighting
   - **Query Performance Metrics**: Detailed execution statistics and performance insights
   - **Query History & Versioning**: Complete query modification history with diff visualization
   - **Inline Query Editing**: Live SQL editing with validation and auto-completion
   - **Explain Plan Visualization**: Visual query execution plan with performance bottlenecks
   - **Query Optimization Suggestions**: AI-powered optimization recommendations

   ```typescript
   interface SQLQueryTabProps {
     query: string;
     onQueryUpdate: (newQuery: string) => void;
     executionStats: QueryExecutionStats;
     queryHistory: QueryVersion[];
   }

   const SQLQueryTab: React.FC<SQLQueryTabProps> = ({
     query,
     onQueryUpdate,
     executionStats,
     queryHistory,
   }) => {
     const [isEditing, setIsEditing] = useState(false);
     const [editedQuery, setEditedQuery] = useState(query);

     return (
       <div className="p-4 space-y-4">
         {/* Query Editor Header */}
         <div className="flex justify-between items-center">
           <div className="flex items-center gap-4">
             <h3 className="font-medium">SQL Query</h3>
             <div className="flex gap-2 text-xs text-gray-500">
               <span>⏱️ {executionStats.executionTime}ms</span>
               <span>
                 📊 {executionStats.rowsReturned.toLocaleString()} rows
               </span>
               <span>💾 {formatBytes(executionStats.bytesProcessed)}</span>
             </div>
           </div>
           <div className="flex gap-2">
             <button
               onClick={() => setIsEditing(!isEditing)}
               className={`px-3 py-1 text-xs rounded ${
                 isEditing
                   ? "bg-blue-100 text-blue-700"
                   : "bg-gray-100 text-gray-700"
               }`}
             >
               {isEditing ? "View Mode" : "Edit Mode"}
             </button>
           </div>
         </div>

         {/* Code Editor */}
         <div className="border rounded-lg overflow-hidden">
           <CodeMirror
             value={isEditing ? editedQuery : query}
             onChange={isEditing ? setEditedQuery : undefined}
             extensions={[sql({ dialect: PostgreSQL })]}
             theme={vscodeDark}
             editable={isEditing}
             height="300px"
           />
         </div>

         {isEditing && (
           <div className="flex gap-2">
             <button
               onClick={() => {
                 onQueryUpdate(editedQuery);
                 setIsEditing(false);
               }}
               className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
             >
               Apply Changes
             </button>
             <button
               onClick={() => {
                 setEditedQuery(query);
                 setIsEditing(false);
               }}
               className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
             >
               Cancel
             </button>
           </div>
         )}

         {/* Query History */}
         <QueryHistoryPanel
           history={queryHistory}
           onQuerySelect={(historicalQuery) => setEditedQuery(historicalQuery)}
         />

         {/* Performance Insights */}
         <QueryPerformanceInsights
           executionStats={executionStats}
           optimizationSuggestions={executionStats.suggestions}
         />
       </div>
     );
   };
   ```

3. **Config Chart Tab**

   - **Dynamic Chart Type Selector**: Visual chart type picker with previews
   - **Intelligent Axis Configuration**: Automatic axis detection with manual override options
   - **Advanced Color Management**: Color palette selector, gradient builder, and custom color schemes
   - **Interactive Styling Options**: Real-time preview of styling changes
   - **Aggregation & Grouping Controls**: Visual query builder for data aggregation
   - **Professional Theming**: Pre-built themes with customization options

   ```typescript
   interface ChartConfigTabProps {
     config: ChartConfiguration;
     chartType: EChartsChartType;
     data: QueryResult;
     onConfigUpdate: (newConfig: ChartConfiguration) => void;
   }

   const ChartConfigTab: React.FC<ChartConfigTabProps> = ({
     config,
     chartType,
     data,
     onConfigUpdate,
   }) => {
     return (
       <div className="p-4 space-y-6">
         {/* Chart Type Selector */}
         <div>
           <label className="block text-sm font-medium mb-3">Chart Type</label>
           <ChartTypePicker
             currentType={chartType}
             availableTypes={getCompatibleChartTypes(data)}
             onTypeChange={(newType) =>
               onConfigUpdate({ ...config, chartType: newType })
             }
           />
         </div>

         {/* Axis Configuration */}
         <div className="grid grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium mb-2">X-Axis</label>
             <ColumnSelector
               columns={data.columns}
               selectedColumn={config.xAxis.column}
               onColumnChange={(column) =>
                 onConfigUpdate({
                   ...config,
                   xAxis: { ...config.xAxis, column },
                 })
               }
             />
           </div>
           <div>
             <label className="block text-sm font-medium mb-2">Y-Axis</label>
             <ColumnSelector
               columns={data.columns.filter((col) => col.type === "number")}
               selectedColumn={config.yAxis.column}
               onColumnChange={(column) =>
                 onConfigUpdate({
                   ...config,
                   yAxis: { ...config.yAxis, column },
                 })
               }
             />
           </div>
         </div>

         {/* Color Scheme */}
         <div>
           <label className="block text-sm font-medium mb-3">
             Color Scheme
           </label>
           <ColorSchemePicker
             currentScheme={config.colorScheme}
             onSchemeChange={(colorScheme) =>
               onConfigUpdate({ ...config, colorScheme })
             }
           />
         </div>

         {/* Advanced Options */}
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <label className="text-sm font-medium">Show Data Labels</label>
             <Switch
               checked={config.showDataLabels}
               onChange={(showDataLabels) =>
                 onConfigUpdate({ ...config, showDataLabels })
               }
             />
           </div>

           <div className="flex items-center justify-between">
             <label className="text-sm font-medium">Enable Zoom</label>
             <Switch
               checked={config.enableZoom}
               onChange={(enableZoom) =>
                 onConfigUpdate({ ...config, enableZoom })
               }
             />
           </div>

           <div className="flex items-center justify-between">
             <label className="text-sm font-medium">Smooth Animation</label>
             <Switch
               checked={config.animation.enabled}
               onChange={(enabled) =>
                 onConfigUpdate({
                   ...config,
                   animation: { ...config.animation, enabled },
                 })
               }
             />
           </div>
         </div>

         {/* Live Preview */}
         <div className="border-t pt-4">
           <label className="block text-sm font-medium mb-3">Preview</label>
           <div className="border rounded-lg p-4 bg-gray-50">
             <MiniChartPreview config={config} data={data} height={200} />
           </div>
         </div>
       </div>
     );
   };
   ```

#### 2.3 Apache ECharts Integration

**Library**: Apache ECharts with `echarts-for-react` wrapper

**Installation**:

```bash
npm install echarts echarts-for-react
```

**Chart Types Supported by Apache ECharts**:

- **Basic Series Charts**:

  - `Bar` - Vertical and horizontal bar charts with stacking support
  - `Line` - Line charts with smooth curves, step lines, and area filling
  - `Pie` - Pie and donut charts with customizable radius and angles
  - `Scatter` - Scatter plots with customizable point sizes and colors
  - `EffectScatter` - Enhanced scatter with ripple animation effects

- **Advanced Visualization Charts**:

  - `Heatmap` - Calendar heatmaps and matrix visualizations
  - `Treemap` - Hierarchical data visualization with nested rectangles
  - `Sunburst` - Multi-level pie charts for hierarchical data
  - `Tree` - Tree diagrams for hierarchical relationships
  - `Graph` - Network graphs and relationship visualizations
  - `Sankey` - Flow diagrams showing data flow between nodes
  - `ThemeRiver` - Stacked area charts with flowing theme changes

- **Statistical & Financial Charts**:

  - `Candlestick` - OHLC financial charts for stock data
  - `Boxplot` - Statistical box and whisker plots
  - `Parallel` - Parallel coordinates for multi-dimensional data
  - `Radar` - Spider/radar charts for multi-attribute comparison

- **Specialized Charts**:

  - `Gauge` - Gauge/speedometer charts for KPI visualization
  - `Funnel` - Funnel charts for conversion analysis
  - `PictorialBar` - Pictorial bar charts with custom symbols
  - `Custom` - Fully customizable charts using renderItem callback

- **Geographic & Calendar Charts**:
  - `Map` - Geographic maps with choropleth visualization
  - `Lines` - Geographic line connections between coordinates
  - `Calendar` - Calendar-based heatmaps for time-series data

**React Component Structure**:

```typescript
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  SunburstChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  CandlestickChart,
  BoxplotChart,
  ParallelChart,
  SankeyChart,
  TreeChart,
  GraphChart,
  MapChart,
  CustomChart,
} from "echarts/charts";

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  PolarComponent,
  AriaComponent,
  ParallelComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  TimelineComponent,
  CalendarComponent,
  GraphicComponent,
} from "echarts/components";

import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";

// Register components
echarts.use([
  // Charts
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  SunburstChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  CandlestickChart,
  BoxplotChart,
  ParallelChart,
  SankeyChart,
  TreeChart,
  GraphChart,
  MapChart,
  CustomChart,

  // Components
  TitleComponent,
  TooltipComponent,
  GridComponent,
  PolarComponent,
  AriaComponent,
  ParallelComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  TimelineComponent,
  CalendarComponent,
  GraphicComponent,

  // Features
  LabelLayout,
  UniversalTransition,

  // Renderers
  CanvasRenderer,
  SVGRenderer,
]);

interface ChartComponentProps {
  chartType: EChartsChartType;
  data: any[];
  config: EChartsOption;
  onChartReady?: (chartInstance: echarts.ECharts) => void;
  onEvents?: Record<string, (params: any) => void>;
  style?: React.CSSProperties;
  theme?: string;
  loading?: boolean;
}

const ChartComponent: React.FC<ChartComponentProps> = ({
  chartType,
  data,
  config,
  onChartReady,
  onEvents,
  style = { height: "400px", width: "100%" },
  theme,
  loading = false,
}) => {
  return (
    <ReactECharts
      option={config}
      style={style}
      theme={theme}
      onChartReady={onChartReady}
      onEvents={onEvents}
      showLoading={loading}
      opts={{
        renderer: "canvas", // or 'svg'
        useDirtyRect: false,
      }}
    />
  );
};
```

**Chart Configuration Examples**:

```typescript
// Bar Chart Configuration
const barChartOption: EChartsOption = {
  title: { text: "Sales by Category" },
  tooltip: { trigger: "axis" },
  legend: { data: ["Sales"] },
  xAxis: {
    type: "category",
    data: ["Electronics", "Clothing", "Books", "Home"],
  },
  yAxis: { type: "value" },
  series: [
    {
      name: "Sales",
      type: "bar",
      data: [820, 932, 901, 934],
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "#83bff6" },
          { offset: 0.5, color: "#188df0" },
          { offset: 1, color: "#188df0" },
        ]),
      },
    },
  ],
};

// Heatmap Configuration
const heatmapOption: EChartsOption = {
  tooltip: { position: "top" },
  grid: { height: "50%", top: "10%" },
  xAxis: {
    type: "category",
    data: ["12a", "1a", "2a", "3a", "4a", "5a"],
  },
  yAxis: {
    type: "category",
    data: ["Monday", "Tuesday", "Wednesday"],
  },
  visualMap: {
    min: 0,
    max: 10,
    calculable: true,
    orient: "horizontal",
    left: "center",
    bottom: "15%",
  },
  series: [
    {
      name: "Punch Card",
      type: "heatmap",
      data: [
        [0, 0, 5],
        [0, 1, 1],
        [0, 2, 0],
      ],
      label: { show: true },
    },
  ],
};
```

### 🎨 ECharts Component Architecture

````typescript
// Enhanced Chart Card Interface with ECharts Integration
interface EChartsChartCard extends ChartCard {
  echartsConfig: EChartsOption;
  renderMode: 'canvas' | 'svg';
  theme?: 'light' | 'dark' | string;
  animation: {
    enabled: boolean;
    duration: number;
    easing: string;
  };
  interaction: {
    brush: boolean;
    dataZoom: boolean;
    tooltip: TooltipComponentOption;
  };
}

// ECharts Option Types
type EChartsChartType =
  | 'bar' | 'line' | 'pie' | 'scatter' | 'effectScatter'
  | 'heatmap' | 'treemap' | 'sunburst' | 'tree' | 'graph'
  | 'sankey' | 'themeRiver' | 'radar' | 'gauge' | 'funnel'
  | 'candlestick' | 'boxplot' | 'parallel' | 'map' | 'custom';

// Chart Generation Service
class EChartsGenerationService {
  static generateChartConfig(
    chartType: EChartsChartType,
    data: any[],
    userPreferences?: Partial<EChartsOption>
  ): EChartsOption {
    const baseConfig = this.getBaseConfig(chartType);
    const dataConfig = this.processDataForChart(data, chartType);

    return merge(baseConfig, dataConfig, userPreferences);
  }

  static getBaseConfig(chartType: EChartsChartType): EChartsOption {
    const configs: Record<EChartsChartType, EChartsOption> = {
      bar: {
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: true },
        yAxis: { type: 'value' },
        series: [{ type: 'bar' }]
      },
      line: {
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', boundaryGap: false },
        yAxis: { type: 'value' },
        series: [{ type: 'line', smooth: true }]
      },
      pie: {
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['50%', '60%'],
          avoidLabelOverlap: false,
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 40, fontWeight: 'bold' } },
          labelLine: { show: false }
        }]
      },
      heatmap: {
        tooltip: { position: 'top' },
        grid: { height: '50%', top: '10%' },
        visualMap: {
          min: 0,
          max: 10,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '15%'
        }
      },
      treemap: {
        series: [{
          type: 'treemap',
          data: [],
          leafDepth: 1,
          label: { show: true, formatter: '{b}' },
          upperLabel: { show: true, height: 30 }
        }]
      },
      // Add more chart type configurations...
    };

    return configs[chartType] || {};
  }
}

### 3. Chart Storage and Management System

#### 3.1 Enhanced Database Schema for ECharts Integration

```sql
-- Enhanced Saved Charts with ECharts Support
CREATE TABLE saved_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    chart_type VARCHAR(50) NOT NULL, -- ECharts chart types
    sql_query TEXT NOT NULL,

    -- Data handling strategy
    data_mode VARCHAR(20) NOT NULL DEFAULT 'static', -- 'static' or 'realtime'
    refresh_interval INTEGER, -- Auto-refresh interval in seconds (dashboard only)

    -- ECharts specific configuration
    echarts_config JSONB NOT NULL, -- Full ECharts option object
    echarts_theme VARCHAR(50) DEFAULT 'default',
    render_mode VARCHAR(10) DEFAULT 'canvas', -- 'canvas' or 'svg'

    -- Enhanced chart metadata
    chart_config JSONB NOT NULL, -- Legacy compatibility
    query_metadata JSONB, -- Execution stats, column info, etc.
    visualization_metadata JSONB, -- Chart-specific metadata

    -- Static data caching (for chat-generated charts only)
    data_cache JSONB, -- Cached query results for static charts
    data_cache_timestamp TIMESTAMP, -- When static data was captured
    cache_expires_at TIMESTAMP, -- Expiration for static cache

    tags VARCHAR(255)[], -- For categorization and search
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_saved_charts_user_id (user_id),
    INDEX idx_saved_charts_dataset_id (dataset_id),
    INDEX idx_saved_charts_chart_type (chart_type),
    INDEX idx_saved_charts_data_mode (data_mode),
    INDEX idx_saved_charts_tags USING GIN (tags)
);

-- Pinned Charts for User Library (NEW)
CREATE TABLE pinned_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    chart_id UUID NOT NULL REFERENCES saved_charts(id) ON DELETE CASCADE,
    pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pin_order INTEGER, -- For custom ordering in library
    category VARCHAR(100), -- User-defined category
    notes TEXT, -- User notes about the chart

    UNIQUE(user_id, chart_id),
    INDEX idx_pinned_charts_user_id (user_id),
    INDEX idx_pinned_charts_chart_id (chart_id)
);

-- Chart Modification History (NEW)
CREATE TABLE chart_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES saved_charts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    modification_type VARCHAR(50) NOT NULL, -- 'config_change', 'query_change', 'ai_enhancement'

    -- Change details
    previous_config JSONB,
    new_config JSONB,
    previous_query TEXT,
    new_query TEXT,

    -- AI enhancement details
    ai_command TEXT, -- Original natural language command
    ai_reasoning TEXT, -- AI explanation of changes made

    -- Metadata
    change_summary TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_chart_history_chart_id (chart_id),
    INDEX idx_chart_history_user_id (user_id),
    INDEX idx_chart_history_type (modification_type)
);

-- ECharts Theme Configuration
CREATE TABLE echarts_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    theme_config JSONB NOT NULL, -- ECharts theme object
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, name),
    INDEX idx_echarts_themes_user_id (user_id)
);

-- Chart Interaction Logs (for analytics)
CREATE TABLE chart_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES saved_charts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL, -- 'view', 'hover', 'click', 'brush', 'zoom', 'ai_enhance', 'pin', 'inspect'
    interaction_data JSONB, -- Event specific data
    session_id VARCHAR(255), -- For grouping related interactions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_chart_interactions_chart_id (chart_id),
    INDEX idx_chart_interactions_user_id (user_id),
    INDEX idx_chart_interactions_type (interaction_type),
    INDEX idx_chart_interactions_session (session_id)
);

-- AI Enhancement Sessions (NEW)
CREATE TABLE ai_enhancement_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES saved_charts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,

    -- Session details
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    total_commands INTEGER DEFAULT 0,
    successful_commands INTEGER DEFAULT 0,

    -- Commands history
    commands JSONB[], -- Array of {command, timestamp, success, result}

    -- Session metadata
    initial_config JSONB,
    final_config JSONB,
    user_satisfaction_rating INTEGER, -- 1-5 rating

    INDEX idx_ai_sessions_chart_id (chart_id),
    INDEX idx_ai_sessions_user_id (user_id)
);

-- Dashboard Chart Composition (Enhanced with Real-time Support)
CREATE TABLE dashboard_charts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    chart_id UUID NOT NULL REFERENCES saved_charts(id) ON DELETE CASCADE,

    -- Grid layout properties
    grid_x INTEGER NOT NULL,
    grid_y INTEGER NOT NULL,
    grid_width INTEGER NOT NULL,
    grid_height INTEGER NOT NULL,

    -- Real-time data configuration (overrides chart defaults for dashboard context)
    refresh_interval_override INTEGER, -- Dashboard-specific refresh interval
    auto_refresh_enabled BOOLEAN DEFAULT true,
    last_refresh_timestamp TIMESTAMP,

    -- Chart-specific overrides for dashboard context
    title_override VARCHAR(255),
    config_overrides JSONB, -- Dashboard-specific chart config overrides

    -- Responsive breakpoints
    mobile_layout JSONB, -- Layout for mobile devices
    tablet_layout JSONB, -- Layout for tablet devices

    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(dashboard_id, chart_id),
    INDEX idx_dashboard_charts_dashboard_id (dashboard_id),
    INDEX idx_dashboard_charts_chart_id (chart_id),
    INDEX idx_dashboard_charts_refresh (refresh_interval_override)
);

-- Chart Export History (NEW)
CREATE TABLE chart_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID NOT NULL REFERENCES saved_charts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user(id) ON DELETE CASCADE,

    export_format VARCHAR(20) NOT NULL, -- 'csv', 'json', 'excel', 'png', 'svg', 'pdf'
    file_size_bytes BIGINT,
    download_count INTEGER DEFAULT 0,

    -- Export configuration
    export_config JSONB, -- Format-specific options

    -- File storage
    file_path VARCHAR(500), -- S3 path or local path
    expires_at TIMESTAMP, -- For temporary exports

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_chart_exports_chart_id (chart_id),
    INDEX idx_chart_exports_user_id (user_id),
    INDEX idx_chart_exports_format (export_format)
);
````

#### 3.2 Chart Versioning System

- Automatic versioning when chart configuration changes
- Version comparison and rollback functionality
- Change history tracking with user attribution

### 4. Four Primary Pages Implementation

#### 4.1 Add Datasource Configuration Page (`/datasets`)

**Purpose**: Extensible database connection management with PostgreSQL as the primary implementation

This page provides a user-friendly interface for adding and managing database connections, starting with PostgreSQL support and designed for future database engine extensibility.

### 🗄️ Database Connection Architecture

#### 4.1.1 Extensible Database Engine Design

**Frontend Database Type Selector**:

```typescript
// types/database.ts
type DatabaseType = "postgresql" | "mysql" | "sqlite" | "mssql" | "mongodb";

interface DatabaseEngine {
  type: DatabaseType;
  name: string;
  icon: React.ComponentType;
  description: string;
  isSupported: boolean;
  comingSoon?: boolean;
}

const DATABASE_ENGINES: DatabaseEngine[] = [
  {
    type: "postgresql",
    name: "PostgreSQL",
    icon: PostgreSQLIcon,
    description: "Open-source relational database with advanced features",
    isSupported: true,
  },
  {
    type: "mysql",
    name: "MySQL",
    icon: MySQLIcon,
    description: "Popular open-source relational database",
    isSupported: false,
    comingSoon: true,
  },
  {
    type: "sqlite",
    name: "SQLite",
    icon: SQLiteIcon,
    description: "Lightweight file-based database",
    isSupported: false,
    comingSoon: true,
  },
  {
    type: "mssql",
    name: "SQL Server",
    icon: SQLServerIcon,
    description: "Microsoft SQL Server database",
    isSupported: false,
    comingSoon: true,
  },
  {
    type: "mongodb",
    name: "MongoDB",
    icon: MongoDBIcon,
    description: "NoSQL document-oriented database",
    isSupported: false,
    comingSoon: true,
  },
];
```

**Dynamic Configuration Interfaces**:

```typescript
// Database configuration interfaces for extensibility
interface BaseConnectionConfig {
  id?: string;
  name: string;
  type: DatabaseType;
  description?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface PostgreSQLConfig extends BaseConnectionConfig {
  type: "postgresql";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: {
    enabled: boolean;
    mode?: "require" | "prefer" | "allow" | "disable";
    cert?: string;
    key?: string;
    ca?: string;
  };
  connectionParams?: {
    applicationName?: string;
    connectTimeout?: number;
    commandTimeout?: number;
    poolSize?: number;
    schema?: string;
  };
}

interface MySQLConfig extends BaseConnectionConfig {
  type: "mysql";
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  connectionParams?: {
    charset?: string;
    timezone?: string;
    timeout?: number;
  };
}

interface SQLiteConfig extends BaseConnectionConfig {
  type: "sqlite";
  filePath: string;
  readOnly?: boolean;
  connectionParams?: {
    journalMode?: "WAL" | "DELETE" | "TRUNCATE" | "PERSIST" | "MEMORY" | "OFF";
    synchronous?: "OFF" | "NORMAL" | "FULL" | "EXTRA";
  };
}

type DatabaseConfig = PostgreSQLConfig | MySQLConfig | SQLiteConfig;
```

#### 4.1.2 Add Datasource UI Components

**Main Add Datasource Page Component**:

```typescript
// components/datasets/AddDatasourcePage.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Database, CheckCircle, AlertCircle } from "lucide-react";
import { DatabaseEngineSelector } from "./DatabaseEngineSelector";
import { PostgreSQLConnectionForm } from "./forms/PostgreSQLConnectionForm";
import { ConnectionTestResult } from "./ConnectionTestResult";

interface AddDatasourcePageProps {
  onBack: () => void;
  onSave: (config: DatabaseConfig) => Promise<void>;
}

export const AddDatasourcePage: React.FC<AddDatasourcePageProps> = ({
  onBack,
  onSave,
}) => {
  const [selectedEngine, setSelectedEngine] = useState<DatabaseType | null>(
    null
  );
  const [connectionConfig, setConnectionConfig] =
    useState<DatabaseConfig | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null
  );
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEngineSelect = (engineType: DatabaseType) => {
    setSelectedEngine(engineType);
    setTestResult(null);
    setConnectionConfig(null);
  };

  const handleTestConnection = async () => {
    if (!connectionConfig) return;

    setIsTestingConnection(true);
    try {
      const response = await fetch("/api/datasources/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connectionConfig),
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        error: "Failed to test connection",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!connectionConfig) return;

    // Validate that connection was tested successfully (optional but recommended)
    if (!testResult?.success) {
      const confirmed = confirm(
        "Connection has not been tested successfully. Are you sure you want to save?"
      );
      if (!confirmed) return;
    }

    setIsSaving(true);
    try {
      await onSave(connectionConfig);
    } catch (error) {
      console.error("Failed to save datasource:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderConnectionForm = () => {
    if (!selectedEngine) return null;

    switch (selectedEngine) {
      case "postgresql":
        return (
          <PostgreSQLConnectionForm
            config={connectionConfig as PostgreSQLConfig}
            onChange={setConnectionConfig}
          />
        );
      default:
        return (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
              <h3 className="font-semibold text-amber-900 mb-2">Coming Soon</h3>
              <p className="text-sm text-amber-700">
                Support for{" "}
                {DATABASE_ENGINES.find((e) => e.type === selectedEngine)?.name}{" "}
                is in development.
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Datasources
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Add New Datasource
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Connect to your database to start creating charts and dashboards
          </p>
        </div>
      </div>

      {/* Database Engine Selection */}
      {!selectedEngine && (
        <DatabaseEngineSelector
          engines={DATABASE_ENGINES}
          onSelect={handleEngineSelect}
        />
      )}

      {/* Connection Configuration Form */}
      {selectedEngine && (
        <div className="space-y-6">
          {/* Selected Engine Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Database className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {
                        DATABASE_ENGINES.find((e) => e.type === selectedEngine)
                          ?.name
                      }{" "}
                      Connection
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Configure your database connection parameters
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEngine(null)}
                >
                  Change Database
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Connection Form */}
          {renderConnectionForm()}

          {/* Connection Test Result */}
          {testResult && <ConnectionTestResult result={testResult} />}

          {/* Action Buttons */}
          {selectedEngine === "postgresql" && connectionConfig && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                {testResult?.success ? (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Connection tested successfully
                  </span>
                ) : testResult && !testResult.success ? (
                  <span className="text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    Connection test failed
                  </span>
                ) : (
                  "Test connection before saving (recommended)"
                )}
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !connectionConfig}
                >
                  {isTestingConnection ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                      Testing...
                    </>
                  ) : (
                    "Test Connection"
                  )}
                </Button>

                <Button
                  onClick={handleSaveConnection}
                  disabled={isSaving || !connectionConfig}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Save Datasource"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

**Database Engine Selector Component**:

```typescript
// components/datasets/DatabaseEngineSelector.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatabaseEngineSelectorProps {
  engines: DatabaseEngine[];
  onSelect: (engineType: DatabaseType) => void;
}

export const DatabaseEngineSelector: React.FC<DatabaseEngineSelectorProps> = ({
  engines,
  onSelect,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Select Database Type
        </h2>
        <p className="text-sm text-gray-600">
          Choose the type of database you want to connect to
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {engines.map((engine) => (
          <Card
            key={engine.type}
            className={cn(
              "relative cursor-pointer transition-all duration-200 hover:shadow-md",
              engine.isSupported
                ? "hover:border-blue-300 hover:bg-blue-50"
                : "opacity-60 cursor-not-allowed"
            )}
            onClick={() => engine.isSupported && onSelect(engine.type)}
          >
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <engine.icon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {engine.name}
                    </h3>
                    {engine.isSupported ? (
                      <Badge variant="default" className="text-xs">
                        Supported
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {engine.description}
                  </p>
                </div>
              </div>

              {engine.isSupported && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(engine.type);
                  }}
                >
                  Configure Connection
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

**PostgreSQL Connection Form**:

```typescript
// components/datasets/forms/PostgreSQLConnectionForm.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Lock, Settings, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostgreSQLConnectionFormProps {
  config: PostgreSQLConfig | null;
  onChange: (config: PostgreSQLConfig) => void;
}

export const PostgreSQLConnectionForm: React.FC<
  PostgreSQLConnectionFormProps
> = ({ config, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);

  const updateConfig = (updates: Partial<PostgreSQLConfig>) => {
    const newConfig: PostgreSQLConfig = {
      type: "postgresql",
      name: "",
      host: "localhost",
      port: 5432,
      database: "",
      username: "",
      password: "",
      ssl: { enabled: false },
      connectionParams: {},
      ...config,
      ...updates,
    };
    onChange(newConfig);
  };

  const updateSSL = (sslUpdates: Partial<PostgreSQLConfig["ssl"]>) => {
    updateConfig({
      ssl: {
        ...config?.ssl,
        ...sslUpdates,
      },
    });
  };

  const updateConnectionParams = (
    paramUpdates: Partial<PostgreSQLConfig["connectionParams"]>
  ) => {
    updateConfig({
      connectionParams: {
        ...config?.connectionParams,
        ...paramUpdates,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span>PostgreSQL Configuration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="ssl">SSL & Security</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Settings Tab */}
          <TabsContent value="basic" className="space-y-4">
            {/* Connection Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Connection Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="My PostgreSQL Database"
                value={config?.name || ""}
                onChange={(e) => updateConfig({ name: e.target.value })}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                A friendly name to identify this connection
              </p>
            </div>

            {/* Connection Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Host */}
              <div className="space-y-2">
                <Label htmlFor="host" className="text-sm font-medium">
                  Host <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="host"
                  placeholder="localhost"
                  value={config?.host || ""}
                  onChange={(e) => updateConfig({ host: e.target.value })}
                />
              </div>

              {/* Port */}
              <div className="space-y-2">
                <Label htmlFor="port" className="text-sm font-medium">
                  Port <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="5432"
                  value={config?.port || 5432}
                  onChange={(e) =>
                    updateConfig({ port: parseInt(e.target.value) || 5432 })
                  }
                />
              </div>
            </div>

            {/* Database Name */}
            <div className="space-y-2">
              <Label htmlFor="database" className="text-sm font-medium">
                Database Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="database"
                placeholder="my_database"
                value={config?.database || ""}
                onChange={(e) => updateConfig({ database: e.target.value })}
              />
            </div>

            {/* Authentication */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  placeholder="postgres"
                  value={config?.username || ""}
                  onChange={(e) => updateConfig({ username: e.target.value })}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={config?.password || ""}
                    onChange={(e) => updateConfig({ password: e.target.value })}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Optional description for this datasource..."
                value={config?.description || ""}
                onChange={(e) => updateConfig({ description: e.target.value })}
                rows={3}
              />
            </div>
          </TabsContent>

          {/* SSL & Security Tab */}
          <TabsContent value="ssl" className="space-y-4">
            {/* SSL Enable Switch */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-gray-600" />
                  <Label className="text-sm font-medium">
                    Enable SSL Connection
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  Use SSL/TLS encryption for secure database connection
                </p>
              </div>
              <Switch
                checked={config?.ssl?.enabled || false}
                onCheckedChange={(enabled) => updateSSL({ enabled })}
              />
            </div>

            {/* SSL Configuration */}
            {config?.ssl?.enabled && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                {/* SSL Mode */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">SSL Mode</Label>
                  <Select
                    value={config.ssl.mode || "require"}
                    onValueChange={(mode) => updateSSL({ mode: mode as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="require">Require SSL</SelectItem>
                      <SelectItem value="prefer">Prefer SSL</SelectItem>
                      <SelectItem value="allow">Allow SSL</SelectItem>
                      <SelectItem value="disable">Disable SSL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* SSL Certificates (Optional) */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      Optional
                    </Badge>
                    <span className="text-sm font-medium">
                      SSL Certificates
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">
                        Client Certificate (cert)
                      </Label>
                      <Textarea
                        placeholder="-----BEGIN CERTIFICATE-----"
                        value={config.ssl.cert || ""}
                        onChange={(e) => updateSSL({ cert: e.target.value })}
                        rows={3}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">
                        Client Key (key)
                      </Label>
                      <Textarea
                        placeholder="-----BEGIN PRIVATE KEY-----"
                        value={config.ssl.key || ""}
                        onChange={(e) => updateSSL({ key: e.target.value })}
                        rows={3}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-gray-600">
                        CA Certificate (ca)
                      </Label>
                      <Textarea
                        placeholder="-----BEGIN CERTIFICATE-----"
                        value={config.ssl.ca || ""}
                        onChange={(e) => updateSSL({ ca: e.target.value })}
                        rows={3}
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              {/* Application Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Application Name</Label>
                <Input
                  placeholder="MindSpark Studio"
                  value={config?.connectionParams?.applicationName || ""}
                  onChange={(e) =>
                    updateConnectionParams({ applicationName: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">
                  Identifies your application in PostgreSQL logs
                </p>
              </div>

              {/* Default Schema */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Default Schema</Label>
                <Input
                  placeholder="public"
                  value={config?.connectionParams?.schema || ""}
                  onChange={(e) =>
                    updateConnectionParams({ schema: e.target.value })
                  }
                />
                <p className="text-xs text-gray-500">
                  Default schema for queries (optional)
                </p>
              </div>

              {/* Timeout Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Connect Timeout (seconds)
                  </Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={config?.connectionParams?.connectTimeout || ""}
                    onChange={(e) =>
                      updateConnectionParams({
                        connectTimeout: parseInt(e.target.value) || undefined,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Command Timeout (seconds)
                  </Label>
                  <Input
                    type="number"
                    placeholder="60"
                    value={config?.connectionParams?.commandTimeout || ""}
                    onChange={(e) =>
                      updateConnectionParams({
                        commandTimeout: parseInt(e.target.value) || undefined,
                      })
                    }
                  />
                </div>
              </div>

              {/* Pool Size */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Connection Pool Size
                </Label>
                <Input
                  type="number"
                  placeholder="10"
                  min="1"
                  max="100"
                  value={config?.connectionParams?.poolSize || ""}
                  onChange={(e) =>
                    updateConnectionParams({
                      poolSize: parseInt(e.target.value) || undefined,
                    })
                  }
                />
                <p className="text-xs text-gray-500">
                  Maximum number of concurrent connections (1-100)
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
```

**Connection Test Result Component**:

```typescript
// components/datasets/ConnectionTestResult.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Database,
  Users,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionTestResult {
  success: boolean;
  error?: string;
  details?: string;
  metadata?: {
    serverVersion?: string;
    currentUser?: string;
    currentDatabase?: string;
    schemaCount?: number;
    tableCount?: number;
    connectionTime?: number;
  };
}

interface ConnectionTestResultProps {
  result: ConnectionTestResult;
}

export const ConnectionTestResult: React.FC<ConnectionTestResultProps> = ({
  result,
}) => {
  return (
    <Card
      className={cn(
        "border-2",
        result.success
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      )}
    >
      <CardContent className="p-4">
        <div
          className={cn(
            "flex items-start space-x-3",
            result.success ? "text-green-900" : "text-red-900"
          )}
        >
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-semibold mb-2",
                result.success ? "text-green-900" : "text-red-900"
              )}
            >
              {result.success ? "Connection Successful!" : "Connection Failed"}
            </h3>

            {result.success && result.metadata && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                {result.metadata.serverVersion && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Database className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">
                      PostgreSQL {result.metadata.serverVersion}
                    </span>
                  </div>
                )}

                {result.metadata.currentUser && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">
                      User: {result.metadata.currentUser}
                    </span>
                  </div>
                )}

                {result.metadata.tableCount !== undefined && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Table className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">
                      {result.metadata.tableCount} tables
                    </span>
                  </div>
                )}

                {result.metadata.connectionTime && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-green-700">
                      {result.metadata.connectionTime}ms
                    </span>
                  </div>
                )}
              </div>
            )}

            {result.error && (
              <div className="space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  {result.error}
                </p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-red-600 hover:text-red-800">
                      Show technical details
                    </summary>
                    <pre className="mt-2 p-2 bg-red-100 rounded text-red-800 whitespace-pre-wrap">
                      {result.details}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 mt-3">
              <Badge
                variant={result.success ? "default" : "destructive"}
                className="text-xs"
              >
                {result.success ? "Ready to Save" : "Configuration Required"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 🔧 Backend Implementation - Extensible Database Engine Architecture

#### 4.1.3 Database Connection Manager

**Backend Database Engine Factory**:

```typescript
// lib/database/engines/DatabaseEngineFactory.ts
import { PostgreSQLEngine } from "./PostgreSQLEngine";
import type { DatabaseConfig, DatabaseEngine } from "@/types/database";

export class DatabaseEngineFactory {
  private static engines = new Map<string, typeof DatabaseEngine>([
    ["postgresql", PostgreSQLEngine],
    // Future engines will be registered here:
    // ['mysql', MySQLEngine],
    // ['sqlite', SQLiteEngine],
  ]);

  static createEngine(config: DatabaseConfig): DatabaseEngine {
    const EngineClass = this.engines.get(config.type);

    if (!EngineClass) {
      throw new Error(`Unsupported database type: ${config.type}`);
    }

    return new EngineClass(config);
  }

  static getSupportedEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  static isEngineSupported(type: string): boolean {
    return this.engines.has(type);
  }
}
```

**Base Database Engine Interface**:

```typescript
// lib/database/engines/BaseEngine.ts
export abstract class DatabaseEngine {
  protected config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract executeQuery(query: string): Promise<QueryResult>;
  abstract getSchema(): Promise<DatabaseSchema>;
  abstract getTables(): Promise<TableInfo[]>;
  abstract getTableColumns(tableName: string): Promise<ColumnInfo[]>;
  abstract getSampleData(
    tableName: string,
    limit?: number
  ): Promise<Record<string, any>[]>;
  abstract close(): Promise<void>;

  // Common utility methods
  protected formatError(error: Error): ConnectionTestResult {
    return {
      success: false,
      error: error.message,
      details: error.stack,
    };
  }
}

export interface QueryResult {
  rows: Record<string, any>[];
  rowCount: number;
  executionTime: number;
  fields: FieldInfo[];
}

export interface FieldInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface DatabaseSchema {
  schemas: string[];
  tables: TableInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  type: "table" | "view";
  rowCount?: number;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}
```

**PostgreSQL Engine Implementation**:

```typescript
// lib/database/engines/PostgreSQLEngine.ts
import { Pool, PoolClient } from "pg";
import {
  DatabaseEngine,
  ConnectionTestResult,
  QueryResult,
} from "./BaseEngine";
import type { PostgreSQLConfig } from "@/types/database";

export class PostgreSQLEngine extends DatabaseEngine {
  private pool: Pool | null = null;
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    super(config);
    this.config = config;
  }

  private createPool(): Pool {
    if (this.pool) return this.pool;

    const poolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl.enabled
        ? {
            rejectUnauthorized: this.config.ssl.mode === "require",
            cert: this.config.ssl.cert,
            key: this.config.ssl.key,
            ca: this.config.ssl.ca,
          }
        : false,
      max: this.config.connectionParams?.poolSize || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: this.config.connectionParams?.connectTimeout
        ? this.config.connectionParams.connectTimeout * 1000
        : 30000,
      application_name:
        this.config.connectionParams?.applicationName || "MindSpark Studio",
      statement_timeout: this.config.connectionParams?.commandTimeout
        ? this.config.connectionParams.commandTimeout * 1000
        : 60000,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err);
    });

    return this.pool;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      const pool = this.createPool();
      client = await pool.connect();

      // Test basic connectivity
      const versionResult = await client.query("SELECT version()");
      const userResult = await client.query("SELECT current_user");
      const dbResult = await client.query("SELECT current_database()");

      // Get schema and table counts
      const schemaCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
      `);

      const tableCountResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      `);

      const connectionTime = Date.now() - startTime;

      // Extract version number
      const versionString = versionResult.rows[0]?.version || "";
      const versionMatch = versionString.match(/PostgreSQL\s+(\d+\.\d+)/);
      const serverVersion = versionMatch?.[1] || "Unknown";

      return {
        success: true,
        metadata: {
          serverVersion,
          currentUser: userResult.rows[0]?.current_user,
          currentDatabase: dbResult.rows[0]?.current_database,
          schemaCount: parseInt(schemaCountResult.rows[0]?.count || "0"),
          tableCount: parseInt(tableCountResult.rows[0]?.count || "0"),
          connectionTime,
        },
      };
    } catch (error) {
      return this.formatError(
        error instanceof Error ? error : new Error("Unknown error")
      );
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      const pool = this.createPool();
      client = await pool.connect();

      const result = await client.query(query);
      const executionTime = Date.now() - startTime;

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
        executionTime,
        fields: result.fields.map((field) => ({
          name: field.name,
          type: this.getPostgreSQLTypeName(field.dataTypeID),
          nullable: true, // Would need additional query to determine nullability
        })),
      };
    } catch (error) {
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getTables(): Promise<TableInfo[]> {
    let client: PoolClient | null = null;

    try {
      const pool = this.createPool();
      client = await pool.connect();

      const query = `
        SELECT 
          t.table_name,
          t.table_schema,
          t.table_type,
          COALESCE(s.n_tup_ins, 0) as estimated_row_count
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY t.table_schema, t.table_name
      `;

      const result = await client.query(query);
      const tables: TableInfo[] = [];

      for (const row of result.rows) {
        const columns = await this.getTableColumns(row.table_name);

        tables.push({
          name: row.table_name,
          schema: row.table_schema,
          type:
            row.table_type.toLowerCase() === "base table" ? "table" : "view",
          rowCount: parseInt(row.estimated_row_count) || undefined,
          columns,
        });
      }

      return tables;
    } catch (error) {
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getTableColumns(tableName: string): Promise<ColumnInfo[]> {
    let client: PoolClient | null = null;

    try {
      const pool = this.createPool();
      client = await pool.connect();

      const query = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
          fk.referenced_table_name,
          fk.referenced_column_name
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY' 
            AND ku.table_name = $1
        ) pk ON pk.column_name = c.column_name
        LEFT JOIN (
          SELECT 
            ku.column_name,
            ccu.table_name as referenced_table_name,
            ccu.column_name as referenced_column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name
          JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ku.table_name = $1
        ) fk ON fk.column_name = c.column_name
        WHERE c.table_name = $1
        ORDER BY c.ordinal_position
      `;

      const result = await client.query(query, [tableName]);

      return result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === "YES",
        defaultValue: row.column_default,
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
        referencedTable: row.referenced_table_name,
        referencedColumn: row.referenced_column_name,
      }));
    } catch (error) {
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getSampleData(
    tableName: string,
    limit = 100
  ): Promise<Record<string, any>[]> {
    let client: PoolClient | null = null;

    try {
      const pool = this.createPool();
      client = await pool.connect();

      // Safely quote table name to prevent SQL injection
      const quotedTableName = `"${tableName.replace(/"/g, '""')}"`;
      const query = `SELECT * FROM ${quotedTableName} LIMIT $1`;

      const result = await client.query(query, [limit]);
      return result.rows;
    } catch (error) {
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async getSchema(): Promise<DatabaseSchema> {
    let client: PoolClient | null = null;

    try {
      const pool = this.createPool();
      client = await pool.connect();

      // Get schemas
      const schemaQuery = `
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schema_name
      `;

      const schemaResult = await client.query(schemaQuery);
      const schemas = schemaResult.rows.map((row) => row.schema_name);

      // Get tables
      const tables = await this.getTables();

      return {
        schemas,
        tables,
      };
    } catch (error) {
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  private getPostgreSQLTypeName(typeId: number): string {
    // Map PostgreSQL type OIDs to readable names
    const typeMap: Record<number, string> = {
      16: "boolean",
      20: "bigint",
      21: "smallint",
      23: "integer",
      25: "text",
      700: "real",
      701: "double precision",
      1043: "varchar",
      1082: "date",
      1114: "timestamp",
      1184: "timestamptz",
    };

    return typeMap[typeId] || "unknown";
  }
}
```

#### 4.1.4 API Endpoints for Datasource Management

**Test Connection API**:

```typescript
// app/api/datasources/test-connection/route.ts
import { DatabaseEngineFactory } from "@/lib/database/engines/DatabaseEngineFactory";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const config = await request.json();

    // Validate required fields
    if (!config.type || !DatabaseEngineFactory.isEngineSupported(config.type)) {
      return Response.json(
        { success: false, error: "Unsupported database type" },
        { status: 400 }
      );
    }

    // Create database engine instance
    const engine = DatabaseEngineFactory.createEngine(config);

    // Test connection
    const testResult = await engine.testConnection();

    // Clean up
    await engine.close();

    return Response.json(testResult);
  } catch (error) {
    console.error("Connection test failed:", error);

    return Response.json({
      success: false,
      error: "Connection test failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```

**Save Datasource API**:

```typescript
// app/api/datasources/route.ts
import { db } from "@/lib/db";
import { datasources } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { encryptConnectionString } from "@/lib/crypto";
import { DatabaseEngineFactory } from "@/lib/database/engines/DatabaseEngineFactory";

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const config = await request.json();

    // Validate configuration
    if (!config.name || !config.type) {
      return Response.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    if (!DatabaseEngineFactory.isEngineSupported(config.type)) {
      return Response.json(
        { error: "Unsupported database type" },
        { status: 400 }
      );
    }

    // Encrypt sensitive configuration data
    const encryptedConfig = await encryptConnectionString(
      JSON.stringify(config)
    );

    // Save to database
    const [savedDatasource] = await db
      .insert(datasources)
      .values({
        userId,
        name: config.name,
        type: config.type,
        description: config.description,
        encryptedConfig,
        tags: config.tags || [],
        isActive: true,
      })
      .returning();

    // Return datasource without sensitive data
    return Response.json({
      id: savedDatasource.id,
      name: savedDatasource.name,
      type: savedDatasource.type,
      description: savedDatasource.description,
      tags: savedDatasource.tags,
      createdAt: savedDatasource.createdAt,
    });
  } catch (error) {
    console.error("Failed to save datasource:", error);
    return Response.json(
      { error: "Failed to save datasource" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    const userDatasources = await db
      .select({
        id: datasources.id,
        name: datasources.name,
        type: datasources.type,
        description: datasources.description,
        tags: datasources.tags,
        isActive: datasources.isActive,
        createdAt: datasources.createdAt,
        updatedAt: datasources.updatedAt,
      })
      .from(datasources)
      .where(eq(datasources.userId, userId))
      .orderBy(desc(datasources.updatedAt));

    return Response.json(userDatasources);
  } catch (error) {
    console.error("Failed to fetch datasources:", error);
    return Response.json(
      { error: "Failed to fetch datasources" },
      { status: 500 }
    );
  }
}
```

### 🗃️ Database Schema for Datasources

```sql
-- Enhanced Datasources Table with Extensible Configuration
CREATE TABLE datasources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'postgresql', 'mysql', 'sqlite', etc.
    description TEXT,
    encrypted_config TEXT NOT NULL, -- Encrypted JSON configuration
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CONSTRAINT datasources_name_user_unique UNIQUE (user_id, name)
);

CREATE INDEX idx_datasources_user_id ON datasources(user_id);
CREATE INDEX idx_datasources_type ON datasources(type);
CREATE INDEX idx_datasources_tags USING GIN (tags);

-- Connection Test History for Analytics
CREATE TABLE datasource_connection_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datasource_id UUID REFERENCES datasources(id) ON DELETE CASCADE,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    connection_time_ms INTEGER,
    tested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_connection_tests_datasource ON datasource_connection_tests(datasource_id);
```

This comprehensive Add Datasource implementation provides:

1. **🔌 Extensible Architecture**: Plugin-based database engine system supporting easy addition of new database types
2. **🛡️ Security First**: Encrypted credential storage, SSL/TLS support, connection validation
3. **🎨 Intuitive UI/UX**: Clean tabbed interface, visual feedback, progressive disclosure
4. **✅ Robust Testing**: Comprehensive connection testing with detailed metadata and error reporting
5. **⚡ Performance**: Connection pooling, timeout management, efficient query execution
6. **🔧 PostgreSQL Implementation**: Full-featured PostgreSQL support with advanced configuration options
7. **🚀 Future Ready**: Structured for seamless addition of MySQL, SQLite, MSSQL, and MongoDB support

The implementation follows best practices for database connection management while providing a user-friendly interface that guides users through the connection setup process with clear feedback and validation.

#### 4.2 Chat-to-Generate Chart Page (`/chat-charts`)

**Purpose**: Conversational chart generation interface

**Features**:

- **Chat Interface**

  - Message history preservation
  - Context-aware responses
  - Loading states during query processing
  - Error handling with retry options

- **Dataset Context Selector**

  - Quick dataset switching
  - Schema information sidebar
  - Recent tables/columns suggestions

- **Chart Generation Pipeline**

  - Real-time query parsing
  - Progressive chart building
  - Configuration suggestions based on data

- **Enhanced Chart Card Component**

  The chart card features a sophisticated interface with three primary action buttons positioned in the top-right corner:

  **1. AI Enhancement Button (⭐ Star Icon)**

  - **Trigger**: Click displays floating text input component (tooltip-style but not actual tooltip)
  - **Purpose**: Natural language chart modification interface
  - **Functionality**:
    - Modify SQL queries through conversational commands
    - Adjust chart colors and styling via natural language
    - Change chart configuration parameters with plain English
    - Real-time preview of changes before applying
    - Context-aware suggestions based on current chart state
  - **Examples**:
    - "Change bars to blue gradient"
    - "Add trend line to this chart"
    - "Group by quarter instead of month"
    - "Make the chart title larger"

  **2. Inspect Button (🔍 Magnifying Glass Icon)**

  - **Trigger**: Click switches chart card to settings view
  - **Purpose**: In-card chart configuration and data inspection
  - **Interface**: Replaces chart visualization with three-tab settings panel:

    **Tab 1: Data Results**

    ```typescript
    interface DataResultsTab {
      display: "table" | "json";
      data: QueryResult[];
      totalRows: number;
      pagination: {
        currentPage: number;
        pageSize: number;
        totalPages: number;
      };
      sorting: {
        column: string;
        direction: "asc" | "desc";
      };
      filtering: {
        searchTerm: string;
        columnFilters: Record<string, any>;
      };
      export: {
        formats: ["csv", "json", "excel"];
        downloadUrl: string;
      };
    }
    ```

    **Tab 2: SQL Query**

    ```typescript
    interface SQLQueryTab {
      query: string;
      executionStats: {
        executionTime: number;
        rowsReturned: number;
        bytesProcessed: number;
      };
      queryHistory: QueryVersion[];
      editMode: boolean;
      syntaxHighlighting: boolean;
      queryValidation: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
      };
    }
    ```

    **Tab 3: Chart Configuration**

    ```typescript
    interface ChartConfigTab {
      chartType: EChartsChartType;
      axes: {
        xAxis: AxisConfiguration;
        yAxis: AxisConfiguration;
      };
      styling: {
        colors: string[];
        theme: string;
        fontSize: number;
        gridLines: boolean;
      };
      interactions: {
        zoom: boolean;
        brush: boolean;
        tooltip: TooltipConfiguration;
      };
      advanced: {
        animations: boolean;
        dataLabels: boolean;
        legend: LegendConfiguration;
      };
    }
    ```

  **3. Pin Button (📌 Pin Icon)**

  - **Trigger**: Click saves current chart to user's chart library
  - **Purpose**: Chart persistence and dashboard composition
  - **Functionality**:
    - Save chart with current configuration to user's library
    - Automatic categorization and tagging
    - Chart versioning and history tracking
    - Integration with dashboard builder system
    - Quick access from saved charts grid

  **Chart Card State Management**:

  ```typescript
  interface ChartCardState {
    mode: "visualization" | "settings";
    activeTab?: "data" | "query" | "config";
    aiInputVisible: boolean;
    isPinned: boolean;
    chartId: string;
    lastModified: Date;
  }

  interface ChartCardActions {
    toggleAIInput: () => void;
    toggleInspectMode: () => void;
    switchTab: (tab: "data" | "query" | "config") => void;
    pinChart: () => Promise<void>;
    updateChart: (updates: Partial<ChartConfiguration>) => void;
    executeQuery: (query: string) => Promise<QueryResult>;
  }
  ```

- **Integration Points**
  - Seamless save-to-library functionality via pin button
  - Direct dashboard addition from pinned charts
  - Share chart functionality with persistent URLs
  - Real-time collaboration on chart modifications

#### 4.3 Chart Listing Page (`/charts`)

**Purpose**: Grid-based chart library and management

**Features**:

- **Grid Layout**

  - Responsive card-based display
  - Thumbnail previews of charts
  - Hover interactions with quick actions

- **Search and Filter System**

  - Full-text search across titles and descriptions
  - Filter by chart type, dataset, date created
  - Tag-based categorization
  - Sort by various criteria (date, usage, name)

- **Chart Actions**

  - Quick preview modal
  - Edit/duplicate/delete operations
  - Add to dashboard functionality
  - Export options

- **Batch Operations**
  - Multi-select for bulk actions
  - Batch tagging and categorization
  - Bulk dashboard assignment

#### 4.4 Dashboard Builder Page (`/dashboards`)

**Purpose**: Drag-and-drop dashboard composition with real-time data

**Features**:

- **Grid System** (Based on react-grid-layout)

  - Responsive breakpoints (desktop, tablet, mobile)
  - Drag-and-drop positioning
  - Resize handles with snap-to-grid
  - Auto-layout suggestions

- **Real-time Data Management**

  - **Live Database Connections**: Each dashboard chart queries the database directly in real-time
  - **Configurable Auto-Refresh**: Individual chart refresh intervals (5s, 10s, 15s, 30s, 1min, 5min, 15min, 30min, 1hr)
  - **Global Dashboard Refresh**: Synchronized refresh for all charts with master refresh button
  - **Smart Refresh Scheduling**: Intelligent scheduling to avoid database overload
  - **Connection Health Monitoring**: Visual indicators for database connection status

  ```typescript
  interface DashboardRefreshConfig {
    globalRefreshEnabled: boolean;
    globalRefreshInterval?: number; // Seconds
    chartRefreshConfigs: Record<string, ChartRefreshConfig>;
    maxConcurrentRefreshes: number; // Prevent database overload
    refreshScheduler: "immediate" | "staggered" | "synchronized";
  }

  interface ChartRefreshConfig {
    chartId: string;
    autoRefreshEnabled: boolean;
    refreshInterval: number; // Seconds
    lastRefreshTimestamp: Date;
    failureCount: number;
    maxRetries: number;
    backoffMultiplier: number;
  }

  // Auto-refresh interval options
  const REFRESH_INTERVALS = [
    { value: 5, label: "5 seconds", category: "realtime" },
    { value: 10, label: "10 seconds", category: "realtime" },
    { value: 15, label: "15 seconds", category: "realtime" },
    { value: 30, label: "30 seconds", category: "realtime" },
    { value: 60, label: "1 minute", category: "frequent" },
    { value: 300, label: "5 minutes", category: "frequent" },
    { value: 900, label: "15 minutes", category: "periodic" },
    { value: 1800, label: "30 minutes", category: "periodic" },
    { value: 3600, label: "1 hour", category: "periodic" },
  ] as const;
  ```

- **Chart Integration**

  - Chart picker/selector modal with static-to-realtime conversion
  - Live chart previews during positioning
  - Chart-specific refresh configuration overrides
  - Cross-chart filtering capabilities with real-time updates

- **Dashboard Controls**

  - **Master Refresh Controls**: Global pause/resume, manual refresh all
  - **Individual Chart Controls**: Per-chart refresh settings and manual refresh
  - **Time Range Selectors**: Dynamic time window controls affecting all charts
  - **Filter Panels**: Cascading filters with real-time propagation
  - **Full-screen Mode**: Presentation mode with continued auto-refresh

- **Real-time Features**

  ```typescript
  // Dashboard Real-time Manager
  class DashboardRealtimeManager {
    private refreshTimers: Map<string, NodeJS.Timeout> = new Map();
    private websocketConnection: WebSocket;
    private chartRefreshQueue: ChartRefreshQueue;

    startAutoRefresh(chartId: string, intervalSeconds: number) {
      this.stopAutoRefresh(chartId); // Clear existing timer

      const timer = setInterval(async () => {
        try {
          await this.refreshChartData(chartId);
        } catch (error) {
          this.handleRefreshError(chartId, error);
        }
      }, intervalSeconds * 1000);

      this.refreshTimers.set(chartId, timer);
    }

    stopAutoRefresh(chartId: string) {
      const timer = this.refreshTimers.get(chartId);
      if (timer) {
        clearInterval(timer);
        this.refreshTimers.delete(chartId);
      }
    }

    async refreshChartData(chartId: string): Promise<void> {
      // Fetch fresh data from database (no caching)
      const chart = await this.getChart(chartId);
      const freshData = await this.executeQuery(
        chart.sqlQuery,
        chart.datasetId
      );

      // Update chart via WebSocket for real-time propagation
      this.websocketConnection.send(
        JSON.stringify({
          type: "chart_data_update",
          chartId,
          data: freshData,
          timestamp: new Date(),
        })
      );

      // Update last refresh timestamp
      await this.updateChartRefreshTimestamp(chartId);
    }

    private handleRefreshError(chartId: string, error: Error) {
      console.error(`Chart ${chartId} refresh failed:`, error);
      // Implement exponential backoff and retry logic
      // Show user notification of refresh failure
      // Optionally disable auto-refresh if too many failures
    }
  }

  // Dashboard Refresh Control Component
  const DashboardRefreshControls: React.FC<{
    dashboardId: string;
    charts: DashboardChart[];
    refreshConfig: DashboardRefreshConfig;
    onConfigUpdate: (config: DashboardRefreshConfig) => void;
  }> = ({ dashboardId, charts, refreshConfig, onConfigUpdate }) => {
    const [isGlobalRefreshEnabled, setIsGlobalRefreshEnabled] = useState(
      refreshConfig.globalRefreshEnabled
    );

    return (
      <div className="flex items-center gap-4 p-4 bg-gray-50 border-b">
        {/* Global Refresh Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            checked={isGlobalRefreshEnabled}
            onChange={(enabled) => {
              setIsGlobalRefreshEnabled(enabled);
              onConfigUpdate({
                ...refreshConfig,
                globalRefreshEnabled: enabled,
              });
            }}
          />
          <label className="text-sm font-medium">Auto-refresh</label>
        </div>

        {/* Global Refresh Interval */}
        {isGlobalRefreshEnabled && (
          <select
            value={refreshConfig.globalRefreshInterval || 60}
            onChange={(e) =>
              onConfigUpdate({
                ...refreshConfig,
                globalRefreshInterval: parseInt(e.target.value),
              })
            }
            className="text-sm border rounded px-2 py-1"
          >
            {REFRESH_INTERVALS.map((interval) => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>
        )}

        {/* Manual Refresh All */}
        <button
          onClick={() => refreshAllCharts(dashboardId)}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh All
        </button>

        {/* Connection Status */}
        <div className="flex items-center gap-1 text-xs">
          <div
            className={`w-2 h-2 rounded-full ${
              getConnectionStatus() === "connected"
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />
          <span className="text-gray-600">
            {getConnectionStatus() === "connected"
              ? "Connected"
              : "Disconnected"}
          </span>
        </div>

        {/* Active Refreshes Counter */}
        <span className="text-xs text-gray-500">
          {getActiveRefreshCount()} active refreshes
        </span>
      </div>
    );
  };
  ```

- **Static to Real-time Conversion**

  When adding a chat-generated (static) chart to a dashboard, the system automatically converts it to real-time mode:

  ```typescript
  // Convert static chart to real-time for dashboard use
  async function convertChartToRealtime(chartId: string, dashboardId: string) {
    const chart = await getChart(chartId);

    // Create dashboard chart entry with real-time configuration
    await db.insert(dashboardCharts).values({
      dashboardId,
      chartId,
      refreshIntervalOverride: 60, // Default 1 minute
      autoRefreshEnabled: true,
      // ... other dashboard-specific config
    });

    // Note: Original static chart data remains unchanged
    // Dashboard version will query live data independently
  }
  ```

### 4.5 Zero-Shot Text-to-SQL Agent Implementation

**Purpose**: AI-driven SQL generation with automatic error recovery and optimization

This implementation provides a robust text-to-SQL system that leverages AI SDK with user-selected models, schema awareness, and automatic error recovery to generate reliable SQL queries from natural language input.

#### 4.5.1 Frontend Implementation - Table Selection Interface

**Left Sidebar Table Selector (Generate Chart Page)**:

```typescript
// components/chart-generation/TableSelector.tsx
import { useState, useEffect } from "react";
import { Check, ChevronDown, Database, Table } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TableInfo {
  tableName: string;
  schemaName: string;
  rowCount: number;
  columnCount: number;
  description?: string;
}

interface TableSelectorProps {
  datasetId: string;
  selectedTables: string[];
  onTablesChange: (selectedTables: string[]) => void;
  maxTables?: number;
}

const TableSelector: React.FC<TableSelectorProps> = ({
  datasetId,
  selectedTables,
  onTablesChange,
  maxTables = 5,
}) => {
  const [availableTables, setAvailableTables] = useState<TableInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAvailableTables();
  }, [datasetId]);

  const fetchAvailableTables = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/datasets/${datasetId}/tables`);
      const tables = await response.json();
      setAvailableTables(tables);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTables = availableTables.filter(
    (table) =>
      table.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      table.schemaName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTableToggle = (tableName: string) => {
    const isSelected = selectedTables.includes(tableName);

    if (isSelected) {
      onTablesChange(selectedTables.filter((t) => t !== tableName));
    } else if (selectedTables.length < maxTables) {
      onTablesChange([...selectedTables, tableName]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Dataset Tables</h3>
        <Badge variant="secondary">
          {selectedTables.length}/{maxTables} selected
        </Badge>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {selectedTables.length === 0
                ? "Select tables..."
                : `${selectedTables.length} table${
                    selectedTables.length > 1 ? "s" : ""
                  } selected`}
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <input
              type="text"
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <ScrollArea className="h-64">
            <div className="p-2">
              {isLoading ? (
                <div className="text-sm text-gray-500 p-4 text-center">
                  Loading tables...
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 text-center">
                  No tables found
                </div>
              ) : (
                filteredTables.map((table) => {
                  const isSelected = selectedTables.includes(table.tableName);
                  const isDisabled =
                    !isSelected && selectedTables.length >= maxTables;

                  return (
                    <div
                      key={`${table.schemaName}.${table.tableName}`}
                      className={`flex items-start space-x-3 p-2 rounded-md hover:bg-gray-50 ${
                        isDisabled
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      }`}
                      onClick={() =>
                        !isDisabled && handleTableToggle(table.tableName)
                      }
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isDisabled}
                        className="mt-1"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Table className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {table.tableName}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{table.schemaName}</span>
                          <span>•</span>
                          <span>{table.rowCount.toLocaleString()} rows</span>
                          <span>•</span>
                          <span>{table.columnCount} columns</span>
                        </div>

                        {table.description && (
                          <p className="text-xs text-gray-500 mt-1 truncate">
                            {table.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected Tables Display */}
      {selectedTables.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-700">Selected Tables:</p>
          <div className="flex flex-wrap gap-2">
            {selectedTables.map((tableName) => (
              <Badge
                key={tableName}
                variant="secondary"
                className="text-xs cursor-pointer hover:bg-red-100"
                onClick={() => handleTableToggle(tableName)}
              >
                {tableName}
                <button className="ml-1 text-gray-500 hover:text-red-600">
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSelector;
```

#### 4.5.2 Server-Side Text-to-SQL Implementation

**API Handler Structure**:

````typescript
// app/api/text-to-sql/route.ts
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { NextRequest } from "next/server";

interface TextToSQLRequest {
  query: string;
  selectedTables: string[];
  datasetId: string;
  modelProvider: "openai" | "anthropic" | "ollama";
  modelName: string;
  maxRetries?: number;
}

interface TableSchema {
  tableName: string;
  schemaName: string;
  columns: ColumnInfo[];
  sampleData: Record<string, any>[];
  constraints: string[];
  indexes: string[];
}

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      query,
      selectedTables,
      datasetId,
      modelProvider,
      modelName,
      maxRetries = 3,
    }: TextToSQLRequest = await request.json();

    // Step 1: Get table schemas and sample data
    const tableSchemas = await getTableSchemasWithSamples(
      datasetId,
      selectedTables
    );

    // Step 2: Generate SQL using AI with retry mechanism
    const result = await generateSQLWithRetry(
      query,
      tableSchemas,
      modelProvider,
      modelName,
      maxRetries
    );

    return Response.json(result);
  } catch (error) {
    console.error("Text-to-SQL generation failed:", error);
    return Response.json(
      { error: "Failed to generate SQL query" },
      { status: 500 }
    );
  }
}

// Step 1: Schema & Data Sampling
async function getTableSchemasWithSamples(
  datasetId: string,
  selectedTables: string[]
): Promise<TableSchema[]> {
  const schemas: TableSchema[] = [];

  for (const tableName of selectedTables) {
    try {
      // Get table schema information
      const schemaQuery = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          CASE WHEN column_name IN (
            SELECT column_name 
            FROM information_schema.key_column_usage 
            WHERE table_name = '${tableName}' AND constraint_name LIKE '%_pkey'
          ) THEN true ELSE false END as is_primary_key
        FROM information_schema.columns 
        WHERE table_name = '${tableName}'
        ORDER BY ordinal_position;
      `;

      const columnsResult = await executeQuery(schemaQuery, datasetId);

      // Get sample data (2-5 rows)
      const sampleQuery = `SELECT * FROM ${tableName} LIMIT 3;`;
      const sampleResult = await executeQuery(sampleQuery, datasetId);

      // Get foreign key constraints
      const constraintsQuery = `
        SELECT 
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS referenced_table
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = '${tableName}';
      `;

      const constraintsResult = await executeQuery(constraintsQuery, datasetId);

      schemas.push({
        tableName,
        schemaName: "public", // Adjust based on your schema structure
        columns: columnsResult.map((col: any) => ({
          columnName: col.column_name,
          dataType: col.data_type,
          isNullable: col.is_nullable === "YES",
          defaultValue: col.column_default,
          isPrimaryKey: col.is_primary_key,
          isForeignKey: constraintsResult.some(
            (c: any) =>
              c.column_name === col.column_name &&
              c.constraint_type === "FOREIGN KEY"
          ),
          referencedTable: constraintsResult.find(
            (c: any) =>
              c.column_name === col.column_name &&
              c.constraint_type === "FOREIGN KEY"
          )?.referenced_table,
        })),
        sampleData: sampleResult,
        constraints: constraintsResult.map(
          (c: any) =>
            `${c.constraint_type}: ${c.column_name}${
              c.referenced_table ? ` -> ${c.referenced_table}` : ""
            }`
        ),
        indexes: [], // Can be populated if needed
      });
    } catch (error) {
      console.error(`Failed to get schema for table ${tableName}:`, error);
    }
  }

  return schemas;
}

// Step 2: Query Generation with AI SDK
async function generateSQLWithRetry(
  userQuery: string,
  tableSchemas: TableSchema[],
  modelProvider: string,
  modelName: string,
  maxRetries: number
): Promise<{
  sql: string;
  explanation: string;
  executionResult?: any;
  error?: string;
}> {
  let lastError: string = "";
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const sqlQuery = await generateSQL(
        userQuery,
        tableSchemas,
        modelProvider,
        modelName,
        lastError
      );

      // Step 3: Query Testing
      const testResult = await testGeneratedQuery(sqlQuery);

      if (testResult.success) {
        return {
          sql: sqlQuery,
          explanation: testResult.explanation || "Query executed successfully",
          executionResult: testResult.data,
        };
      } else {
        lastError = testResult.error || "Unknown execution error";
        attempt++;

        if (attempt >= maxRetries) {
          return {
            sql: sqlQuery,
            explanation: "Query generation completed but execution failed",
            error: `Failed after ${maxRetries} attempts. Last error: ${lastError}`,
          };
        }
      }
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : "Unknown generation error";
      attempt++;
    }
  }

  throw new Error(`Failed to generate valid SQL after ${maxRetries} attempts`);
}

async function generateSQL(
  userQuery: string,
  tableSchemas: TableSchema[],
  modelProvider: string,
  modelName: string,
  previousError?: string
): Promise<string> {
  const schemaContext = tableSchemas
    .map((schema) => {
      const columnsInfo = schema.columns
        .map(
          (col) =>
            `  ${col.columnName} (${col.dataType}${
              col.isPrimaryKey ? ", PK" : ""
            }${col.isForeignKey ? `, FK -> ${col.referencedTable}` : ""})`
        )
        .join("\n");

      const sampleDataStr =
        schema.sampleData.length > 0
          ? `Sample data:\n${JSON.stringify(schema.sampleData, null, 2)}`
          : "No sample data available";

      return `
Table: ${schema.tableName}
Columns:
${columnsInfo}

${sampleDataStr}

Constraints: ${schema.constraints.join(", ")}
`;
    })
    .join("\n---\n");

  let model;
  switch (modelProvider) {
    case "openai":
      model = openai(modelName);
      break;
    case "anthropic":
      model = anthropic(modelName);
      break;
    default:
      throw new Error(`Unsupported model provider: ${modelProvider}`);
  }

  const systemPrompt = `You are an expert SQL query generator. Given a natural language query and database schema information with sample data, generate a precise PostgreSQL query.

Database Schema:
${schemaContext}

Rules:
1. Generate only valid PostgreSQL syntax
2. Use proper JOINs when accessing multiple tables
3. Include appropriate WHERE clauses for filtering
4. Use aggregate functions (COUNT, SUM, AVG, etc.) when needed
5. Handle NULL values appropriately
6. Use aliases for readability
7. Optimize for performance when possible
8. Return only the SQL query without any explanation or markdown formatting

${
  previousError
    ? `Previous attempt failed with error: ${previousError}. Please fix the issue and generate a corrected query.`
    : ""
}`;

  const { text } = await generateText({
    model,
    system: systemPrompt,
    prompt: `Generate a SQL query for: "${userQuery}"`,
    temperature: 0.1, // Low temperature for consistent, accurate results
    maxTokens: 1000,
  });

  // Clean up the generated SQL (remove any markdown or extra text)
  const cleanSQL = text
    .replace(/```sql\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  return cleanSQL;
}

// Step 3: Query Testing and Validation
async function testGeneratedQuery(sqlQuery: string): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
  explanation?: string;
}> {
  try {
    // Add query timeout and row limit for safety
    const safeSqlQuery = `
      SET statement_timeout = '30s';
      ${sqlQuery}
      LIMIT 1000;
    `;

    const result = await executeQuery(safeSqlQuery);

    return {
      success: true,
      data: result,
      explanation: `Query executed successfully. Returned ${result.length} rows.`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown database error";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Utility function for database query execution
async function executeQuery(query: string, datasetId?: string): Promise<any[]> {
  // Implementation depends on your database connection setup
  // This is a placeholder - replace with your actual database execution logic

  const connection = await getDatabaseConnection(datasetId);
  try {
    const result = await connection.query(query);
    return result.rows || result;
  } finally {
    await connection.end();
  }
}
````

#### 4.5.3 Enhanced Chat Interface Integration

**Chat Component with Text-to-SQL Integration**:

````typescript
// components/chat/ChatInterface.tsx
import { useState } from "react";
import { useChat } from "ai/react";
import TableSelector from "./TableSelector";

interface ChatInterfaceProps {
  datasetId: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ datasetId }) => {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [modelConfig, setModelConfig] = useState({
    provider: "openai" as "openai" | "anthropic",
    model: "gpt-4",
  });

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/text-to-sql",
      body: {
        selectedTables,
        datasetId,
        modelProvider: modelConfig.provider,
        modelName: modelConfig.model,
      },
    });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTables.length === 0) {
      alert("Please select at least one table before generating a query.");
      return;
    }

    if (!input.trim()) {
      alert("Please enter a query description.");
      return;
    }

    handleSubmit(e);
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-80 border-r border-gray-200 p-4 space-y-6">
        <TableSelector
          datasetId={datasetId}
          selectedTables={selectedTables}
          onTablesChange={setSelectedTables}
        />

        {/* Model Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">AI Model</h3>

          <div className="space-y-2">
            <label className="text-xs text-gray-700">Provider</label>
            <select
              value={modelConfig.provider}
              onChange={(e) =>
                setModelConfig((prev) => ({
                  ...prev,
                  provider: e.target.value as "openai" | "anthropic",
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-700">Model</label>
            <select
              value={modelConfig.model}
              onChange={(e) =>
                setModelConfig((prev) => ({
                  ...prev,
                  model: e.target.value,
                }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            >
              {modelConfig.provider === "openai" ? (
                <>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </>
              ) : (
                <>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  <option value="claude-3-sonnet-20240229">
                    Claude 3 Sonnet
                  </option>
                  <option value="claude-3-haiku-20240307">
                    Claude 3 Haiku
                  </option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3xl px-4 py-2 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.role === "assistant" &&
                message.content.includes("```sql") ? (
                  <SQLResponseDisplay content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                  <span className="text-sm text-gray-600">
                    Generating SQL...
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Describe the data you want to visualize..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || selectedTables.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate
            </button>
          </form>

          {selectedTables.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">
              Please select tables from the sidebar to enable query generation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
````

#### 4.5.4 Error Recovery and Query Optimization

**Advanced Error Handling System**:

```typescript
// utils/sql-error-recovery.ts
interface SQLError {
  code: string;
  message: string;
  line?: number;
  column?: number;
  hint?: string;
}

interface ErrorRecoveryStrategy {
  errorPattern: RegExp;
  recoveryPrompt: string;
  maxAttempts: number;
}

const ERROR_RECOVERY_STRATEGIES: ErrorRecoveryStrategy[] = [
  {
    errorPattern: /column "(.+)" does not exist/i,
    recoveryPrompt:
      "The column mentioned does not exist. Please check the table schema and use the correct column names from the provided schema information.",
    maxAttempts: 2,
  },
  {
    errorPattern: /relation "(.+)" does not exist/i,
    recoveryPrompt:
      "The table mentioned does not exist. Please use only the tables that were selected and provided in the schema information.",
    maxAttempts: 2,
  },
  {
    errorPattern: /syntax error at or near "(.+)"/i,
    recoveryPrompt:
      "There is a SQL syntax error. Please generate valid PostgreSQL syntax following standard SQL rules.",
    maxAttempts: 3,
  },
  {
    errorPattern: /cannot join on different data types/i,
    recoveryPrompt:
      "The JOIN condition uses incompatible data types. Please ensure joined columns have compatible data types or use appropriate type casting.",
    maxAttempts: 2,
  },
  {
    errorPattern: /aggregate function calls cannot be nested/i,
    recoveryPrompt:
      "Nested aggregate functions are not allowed. Please restructure the query using subqueries or window functions if needed.",
    maxAttempts: 2,
  },
];

export function analyzeAndRecoverFromError(
  error: string,
  attempt: number
): { canRecover: boolean; recoveryPrompt?: string } {
  for (const strategy of ERROR_RECOVERY_STRATEGIES) {
    if (strategy.errorPattern.test(error) && attempt < strategy.maxAttempts) {
      return {
        canRecover: true,
        recoveryPrompt: `${strategy.recoveryPrompt}\n\nPrevious error: ${error}`,
      };
    }
  }

  return { canRecover: false };
}

// Query optimization suggestions
export function generateQueryOptimizationHints(
  query: string,
  tableSchemas: TableSchema[]
): string[] {
  const hints: string[] = [];

  // Check for missing indexes
  const joinConditions = query.match(/ON\s+(\w+\.\w+)\s*=\s*(\w+\.\w+)/gi);
  if (joinConditions && joinConditions.length > 2) {
    hints.push(
      "Consider adding indexes on join columns for better performance with multiple table joins."
    );
  }

  // Check for SELECT *
  if (query.includes("SELECT *")) {
    hints.push(
      "Consider selecting only the columns you need instead of using SELECT * for better performance."
    );
  }

  // Check for WHERE clause efficiency
  if (query.includes("WHERE") && query.includes("LIKE")) {
    hints.push(
      "LIKE patterns starting with % can be slow. Consider using full-text search or other indexing strategies if applicable."
    );
  }

  return hints;
}
```

#### 4.5.5 API Configuration and Security

**Environment Configuration**:

```typescript
// lib/ai-config.ts
interface AIModelConfig {
  provider: "openai" | "anthropic" | "ollama";
  model: string;
  apiKey?: string;
  baseURL?: string;
  maxTokens: number;
  temperature: number;
}

export const getAIModelConfig = (
  provider: string,
  model: string
): AIModelConfig => {
  const configs: Record<string, AIModelConfig> = {
    "openai-gpt-4": {
      provider: "openai",
      model: "gpt-4",
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
      temperature: 0.1,
    },
    "anthropic-claude-3-opus": {
      provider: "anthropic",
      model: "claude-3-opus-20240229",
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxTokens: 1000,
      temperature: 0.1,
    },
  };

  const configKey = `${provider}-${model}`;
  return configs[configKey] || configs["openai-gpt-4"];
};

// Rate limiting and security
export const rateLimitConfig = {
  maxRequestsPerMinute: 10,
  maxRequestsPerHour: 100,
  maxQueryComplexity: 5, // Number of JOINs allowed
  maxReturnRows: 1000,
  queryTimeout: 30000, // 30 seconds
};
```

This comprehensive zero-shot text-to-SQL implementation provides:

1. **Intelligent Table Selection**: Multi-select dropdown with table metadata
2. **Schema-Aware Generation**: AI understands table structures and relationships
3. **Sample Data Context**: AI sees actual data examples for better query generation
4. **Automatic Error Recovery**: Iterative improvement based on execution feedback
5. **Model Flexibility**: Support for multiple AI providers and models
6. **Performance Optimization**: Query hints and execution safeguards
7. **Security**: Rate limiting, query validation, and timeout protection

The system ensures reliable SQL generation with minimal user intervention while maintaining security and performance standards.

### 5. Backend Architecture and APIs

#### 5.1 SQL Execution Engine

**Security Measures**:

- Query sanitization and validation
- Read-only database connections for chart queries
- Query timeout limits
- Resource usage monitoring

**Performance Optimization**:

- Query result caching with Redis
- Connection pooling
- Query execution monitoring
- Automatic query optimization suggestions

#### 5.2 Real-time Chart Updates

**WebSocket Implementation**:

```typescript
interface ChartUpdateMessage {
  type: "chart_data_update" | "chart_config_change" | "dashboard_update";
  chartId: string;
  dashboardId?: string;
  data?: any;
  timestamp: Date;
}
```

**Caching Strategy**:

- Redis for query result caching
- Configurable TTL per chart type
- Cache invalidation on data updates
- Intelligent cache warming

#### 5.3 API Endpoints Structure

```typescript
// Dataset Management
POST   /api/datasets - Create new dataset connection
GET    /api/datasets - List user's datasets
GET    /api/datasets/:id/schema - Get dataset schema information
POST   /api/datasets/:id/test - Test dataset connection

// Chart Operations
POST   /api/charts - Save new chart (with static data snapshot for chat-generated)
GET    /api/charts - List user's charts (with pagination/filtering)
GET    /api/charts/:id - Get specific chart with cached data (static mode)
PUT    /api/charts/:id - Update chart configuration
DELETE /api/charts/:id - Delete chart
POST   /api/charts/:id/execute - Execute chart query and cache results (static mode)
GET    /api/charts/:id/data - Get cached chart data (static) or live data (realtime)

// Real-time Chart Operations (Dashboard Context)
GET    /api/charts/:id/live-data - Execute chart query for fresh data (no caching)
POST   /api/charts/:id/refresh - Manual refresh trigger for dashboard charts
GET    /api/charts/:id/refresh-status - Get current refresh status and timing

// Enhanced Chart Operations (New Features)
POST   /api/charts/ai-enhance - AI-powered chart modifications
POST   /api/charts/pin - Pin chart to user's library
DELETE /api/charts/pin/:id - Unpin chart from library
GET    /api/charts/:id/export - Export chart data in various formats
GET    /api/charts/:id/history - Get chart modification history
POST   /api/charts/:id/revert - Revert to previous chart version
POST   /api/charts/:id/convert-to-realtime - Convert static chart for dashboard use

// Dashboard Management
POST   /api/dashboards - Create new dashboard
GET    /api/dashboards - List user's dashboards
GET    /api/dashboards/:id - Get dashboard with real-time chart data
PUT    /api/dashboards/:id - Update dashboard layout/config
DELETE /api/dashboards/:id - Delete dashboard
POST   /api/dashboards/:id/charts/:chartId - Add chart to dashboard (converts to realtime)

// Dashboard Real-time Controls
POST   /api/dashboards/:id/refresh-all - Manually refresh all dashboard charts
PUT    /api/dashboards/:id/refresh-config - Update auto-refresh configuration
GET    /api/dashboards/:id/refresh-status - Get refresh status for all charts
POST   /api/dashboards/:id/charts/:chartId/refresh - Refresh specific dashboard chart

// AI Chat Interface & Text-to-SQL
POST   /api/text-to-sql - Zero-shot text-to-SQL generation with error recovery
GET    /api/datasets/:id/tables - Get available tables with metadata for selection
POST   /api/datasets/:id/schema - Get detailed schema for selected tables with samples
POST   /api/chat/generate-sql - Convert natural language to SQL (legacy endpoint)
POST   /api/chat/suggest-chart - Get chart type suggestions
POST   /api/chat/conversation - Handle chat conversation
POST   /api/chat/enhance-chart - Natural language chart modifications

// Real-time Dashboard Updates
WebSocket /ws/dashboards/:id - Real-time dashboard chart updates
WebSocket /ws/charts/:id/live - Live chart data streaming for specific chart
```

**Enhanced API Implementation Examples**:

```typescript
// API Route: /api/charts - Create chart with static data caching
export async function POST(request: Request) {
  const { title, sqlQuery, chartType, datasetId, chartConfig } =
    await request.json();
  const userId = await getCurrentUserId();

  try {
    // Execute query and cache results for static chart
    const queryResult = await executeQuery(sqlQuery, datasetId);

    const chart = await db
      .insert(savedCharts)
      .values({
        userId,
        title,
        sqlQuery,
        chartType,
        datasetId,
        chartConfig,
        dataMode: "static", // Chat-generated charts are static by default
        dataCache: queryResult, // Store query results
        dataCacheTimestamp: new Date(),
        cacheExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      })
      .returning();

    return Response.json({
      chart: chart[0],
      dataResult: queryResult, // Return cached data immediately
    });
  } catch (error) {
    return Response.json({ error: "Failed to create chart" }, { status: 500 });
  }
}

// API Route: /api/charts/:id/live-data - Get fresh data for dashboard charts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const chartId = params.id;

  try {
    const chart = await getChartById(chartId);

    // Always execute fresh query for dashboard/realtime context
    const freshData = await executeQuery(chart.sqlQuery, chart.datasetId);

    // Update refresh timestamp in dashboard_charts if applicable
    await updateDashboardChartRefreshTimestamp(chartId);

    return Response.json({
      data: freshData,
      timestamp: new Date(),
      chartId,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch live data" },
      { status: 500 }
    );
  }
}

// API Route: /api/charts/:id/data - Get data based on chart mode (static vs realtime)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const chartId = params.id;
  const { searchParams } = new URL(request.url);
  const forceRefresh = searchParams.get("refresh") === "true";

  try {
    const chart = await getChartById(chartId);

    if (chart.dataMode === "static" && !forceRefresh) {
      // Return cached data for static charts
      if (chart.dataCache && chart.dataCacheTimestamp) {
        return Response.json({
          data: chart.dataCache,
          isCache: true,
          timestamp: chart.dataCacheTimestamp,
          chartId,
        });
      }
    }

    // Execute fresh query for realtime charts or when cache is missing/expired
    const freshData = await executeQuery(chart.sqlQuery, chart.datasetId);

    // Update cache for static charts if refreshed
    if (chart.dataMode === "static" && forceRefresh) {
      await updateChartCache(chartId, freshData);
    }

    return Response.json({
      data: freshData,
      isCache: false,
      timestamp: new Date(),
      chartId,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}

// API Route: /api/dashboards/:id/charts/:chartId - Add chart to dashboard with realtime conversion
export async function POST(
  request: Request,
  { params }: { params: { id: string; chartId: string } }
) {
  const { id: dashboardId, chartId } = params;
  const { gridPosition, refreshInterval = 60 } = await request.json();

  try {
    // Add chart to dashboard with real-time configuration
    const dashboardChart = await db
      .insert(dashboardCharts)
      .values({
        dashboardId,
        chartId,
        gridX: gridPosition.x,
        gridY: gridPosition.y,
        gridWidth: gridPosition.width,
        gridHeight: gridPosition.height,
        refreshIntervalOverride: refreshInterval,
        autoRefreshEnabled: true,
        lastRefreshTimestamp: new Date(),
      })
      .returning();

    // Start auto-refresh timer for this chart
    startChartAutoRefresh(chartId, refreshInterval);

    return Response.json({
      dashboardChart: dashboardChart[0],
      message: "Chart added to dashboard with real-time data",
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to add chart to dashboard" },
      { status: 500 }
    );
  }
}

// API Route: /api/charts/ai-enhance
export async function POST(request: Request) {
  const { chartId, command, currentConfig } = await request.json();

  try {
    // Process natural language command using AI
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a chart configuration assistant. Given a user command and current chart configuration, return the modified configuration or SQL query. Always respond with valid JSON containing either 'type': 'config_change' with 'newConfig' or 'type': 'query_change' with 'newQuery'.`,
        },
        {
          role: "user",
          content: `Current config: ${JSON.stringify(
            currentConfig
          )}\n\nUser command: "${command}"\n\nModify the configuration accordingly.`,
        },
      ],
    });

    const modification = JSON.parse(aiResponse.choices[0].message.content);

    // Validate and apply changes
    if (modification.type === "config_change") {
      await updateChartConfig(chartId, modification.newConfig);
    } else if (modification.type === "query_change") {
      await updateChartQuery(chartId, modification.newQuery);

      // If chart is static, update cached data with new query results
      const chart = await getChartById(chartId);
      if (chart.dataMode === "static") {
        const newData = await executeQuery(
          modification.newQuery,
          chart.datasetId
        );
        await updateChartCache(chartId, newData);
      }
    }

    return Response.json(modification);
  } catch (error) {
    return Response.json(
      { error: "Failed to process AI enhancement" },
      { status: 500 }
    );
  }
}

// API Route: /api/charts/pin
export async function POST(request: Request) {
  const { chartId } = await request.json();
  const userId = await getCurrentUserId();

  try {
    // Save chart to user's library
    const pinnedChart = await db
      .insert(pinnedCharts)
      .values({
        userId,
        chartId,
        pinnedAt: new Date(),
      })
      .returning();

    // Track analytics
    await analytics.track("chart_pinned", {
      userId,
      chartId,
      timestamp: new Date(),
    });

    return Response.json({
      success: true,
      pinnedChart: pinnedChart[0],
    });
  } catch (error) {
    return Response.json({ error: "Failed to pin chart" }, { status: 500 });
  }
}

// API Route: /api/dashboards/:id/refresh-config - Update dashboard refresh configuration
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const dashboardId = params.id;
  const { refreshConfig } = await request.json();

  try {
    // Update refresh configuration for all charts in dashboard
    for (const [chartId, config] of Object.entries(
      refreshConfig.chartRefreshConfigs
    )) {
      await db
        .update(dashboardCharts)
        .set({
          refreshIntervalOverride: config.refreshInterval,
          autoRefreshEnabled: config.autoRefreshEnabled,
        })
        .where(
          and(
            eq(dashboardCharts.dashboardId, dashboardId),
            eq(dashboardCharts.chartId, chartId)
          )
        );

      // Update running refresh timers
      if (config.autoRefreshEnabled) {
        startChartAutoRefresh(chartId, config.refreshInterval);
      } else {
        stopChartAutoRefresh(chartId);
      }
    }

    return Response.json({
      success: true,
      message: "Dashboard refresh configuration updated",
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to update refresh configuration" },
      { status: 500 }
    );
  }
}

// API Route: /api/charts/:id/export
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const chartId = params.id;

  try {
    const chart = await getChartById(chartId);

    // Use cached data for static charts, fresh data for exports
    let data;
    if (chart.dataMode === "static" && chart.dataCache) {
      data = chart.dataCache;
    } else {
      data = await executeQuery(chart.sqlQuery, chart.datasetId);
    }

    switch (format) {
      case "csv":
        const csv = convertToCSV(data);
        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${chart.title}.csv"`,
          },
        });

      case "json":
        return Response.json(data);

      case "excel":
        const excel = await convertToExcel(data);
        return new Response(excel, {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${chart.title}.xlsx"`,
          },
        });

      default:
        return Response.json({ error: "Unsupported format" }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}

// WebSocket Handler for Real-time Dashboard Updates
class DashboardWebSocketHandler {
  private connections: Map<string, WebSocket> = new Map();
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map();

  handleConnection(ws: WebSocket, dashboardId: string) {
    this.connections.set(dashboardId, ws);

    // Start auto-refresh for all charts in this dashboard
    this.startDashboardAutoRefresh(dashboardId);

    ws.on("close", () => {
      this.connections.delete(dashboardId);
      this.stopDashboardAutoRefresh(dashboardId);
    });
  }

  async startDashboardAutoRefresh(dashboardId: string) {
    const dashboardCharts = await getDashboardCharts(dashboardId);

    for (const dashboardChart of dashboardCharts) {
      if (dashboardChart.autoRefreshEnabled) {
        this.startChartRefresh(
          dashboardChart.chartId,
          dashboardChart.refreshIntervalOverride,
          dashboardId
        );
      }
    }
  }

  private startChartRefresh(
    chartId: string,
    intervalSeconds: number,
    dashboardId: string
  ) {
    const timerId = `${dashboardId}-${chartId}`;

    // Clear existing timer
    const existingTimer = this.refreshTimers.get(timerId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Set new refresh timer
    const timer = setInterval(async () => {
      try {
        const chart = await getChartById(chartId);
        const freshData = await executeQuery(chart.sqlQuery, chart.datasetId);

        // Send update via WebSocket
        const ws = this.connections.get(dashboardId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "chart_data_update",
              chartId,
              data: freshData,
              timestamp: new Date(),
            })
          );
        }

        // Update refresh timestamp
        await updateDashboardChartRefreshTimestamp(chartId, dashboardId);
      } catch (error) {
        console.error(`Failed to refresh chart ${chartId}:`, error);
        // Implement error handling and retry logic
      }
    }, intervalSeconds * 1000);

    this.refreshTimers.set(timerId, timer);
  }

  stopDashboardAutoRefresh(dashboardId: string) {
    // Stop all timers for this dashboard
    for (const [timerId, timer] of this.refreshTimers.entries()) {
      if (timerId.startsWith(dashboardId + "-")) {
        clearInterval(timer);
        this.refreshTimers.delete(timerId);
      }
    }
  }
}
```

## 🚀 Implementation Phases

### Phase 1: Foundation & Data Architecture (Weeks 1-2)

- Database schema implementation with dual data handling support
- Static vs real-time data architecture setup
- Basic dataset connection functionality
- Core API structure setup

**Key Focus**: Establish the foundation for both static (chat-generated) and real-time (dashboard) data handling patterns.

### Phase 2: Chart Generation & Static Data Management (Weeks 3-4)

- **Zero-shot Text-to-SQL Agent Implementation**:

  - AI SDK integration with multiple model providers (OpenAI, Anthropic)
  - Schema-aware SQL generation with sample data context
  - Table selection interface with multi-select dropdown (shadcn/ui)
  - Automatic error recovery and query retry mechanism
  - Query optimization hints and performance safeguards

- **Chart Generation System**:
  - Basic chart rendering with Apache ECharts
  - Chart card component with three-tab interface
  - Static data caching system for chat-generated charts
  - Integration between text-to-SQL and chart visualization

**Key Focus**: Implement intelligent SQL generation from natural language with robust error handling, then connect to chart visualization system with data snapshot storage.

### Phase 3: Chart Management & Library (Weeks 5-6)

- Chart saving and listing functionality
- Search and filter implementation
- Chart configuration management
- Pin/unpin functionality for chart library

**Key Focus**: Chart persistence and user library management with static data preservation.

### Phase 4: Dashboard Builder & Real-time System (Weeks 7-8)

- Grid layout system implementation
- Real-time data querying architecture
- Auto-refresh configuration and controls
- WebSocket integration for live updates
- Static-to-realtime chart conversion

**Key Focus**: Dashboard composition with live database connections and configurable refresh intervals.

### Phase 5: Real-time Optimization & Polish (Weeks 9-10)

- Performance optimization for real-time queries
- Connection pooling and query optimization
- Advanced filtering and refresh controls
- UI/UX improvements
- Testing and bug fixes

**Key Focus**: Optimize real-time performance and ensure smooth user experience with auto-refresh features.

### 🔧 Technical Stack Recommendations

### Frontend

- **Framework**: Next.js 14+ with TypeScript
- **State Management**: Zustand or Redux Toolkit
- **UI Components**: Tailwind CSS + Headless UI
- **Grid Layout**: react-grid-layout
- **Charts**: **Apache ECharts 5.6+ with echarts-for-react**
  - Core bundle with tree-shaking support
  - Canvas and SVG rendering options
  - Built-in animations and interactions
  - Comprehensive chart type coverage (20+ types)
  - Professional themes and styling
- **Real-time**: Socket.io client

### ECharts Integration Details

**Package Installation**:

```bash
npm install echarts echarts-for-react
npm install @types/echarts # TypeScript support
```

**Bundle Optimization**:

```typescript
// Custom ECharts build for smaller bundle size
import * as echarts from "echarts/core";
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  SunburstChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  CandlestickChart,
} from "echarts/charts";

import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  ToolboxComponent,
} from "echarts/components";

import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  SunburstChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  CandlestickChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  ToolboxComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);
```

**Theme System**:

```typescript
// Custom theme registration
const customTheme = {
  color: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de"],
  backgroundColor: "rgba(0,0,0,0)",
  textStyle: {},
  title: {
    textStyle: { color: "#333" },
    subtextStyle: { color: "#aaa" },
  },
  // ... more theme configuration
};

echarts.registerTheme("mindspark-light", customTheme);
```

**Performance Features**:

- Progressive rendering for large datasets (10M+ data points)
- Canvas rendering for performance, SVG for high-quality export
- Built-in data sampling and aggregation
- Efficient animation system with hardware acceleration

### Backend

- **Runtime**: Node.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis
- **Authentication**: Better-auth (existing)
- **Real-time**: Socket.io
- **SQL Parsing**: node-sql-parser
- **AI Integration**:
  - **AI SDK** (`ai` package) for model-agnostic AI integration
  - **Multiple AI Providers**: OpenAI, Anthropic, Ollama support
  - **Text-to-SQL Engine**: Zero-shot SQL generation with schema awareness
  - **Error Recovery**: Automatic query regeneration based on execution feedback
  - **Model Flexibility**: User-selectable AI models and providers

### ECharts Backend Support

**Chart Export Service**:

```typescript
// Server-side chart rendering for exports
import { createCanvas } from "canvas";
import * as echarts from "echarts";

class ChartExportService {
  static async exportChart(
    option: EChartsOption,
    format: "png" | "jpg" | "svg" | "pdf",
    width: number = 800,
    height: number = 600
  ): Promise<Buffer> {
    if (format === "svg") {
      // SVG export using echarts server-side rendering
      const chart = echarts.init(null, null, {
        renderer: "svg",
        ssr: true,
        width,
        height,
      });

      chart.setOption(option);
      const svgString = chart.renderToSVGString();
      chart.dispose();

      return Buffer.from(svgString, "utf8");
    } else {
      // Canvas export for raster formats
      const canvas = createCanvas(width, height);
      const chart = echarts.init(canvas as any);

      chart.setOption(option);
      const buffer = canvas.toBuffer(
        format === "png" ? "image/png" : "image/jpeg"
      );
      chart.dispose();

      return buffer;
    }
  }
}
```

**Real-time Data Streaming**:

```typescript
// WebSocket integration for live chart updates
interface ChartStreamMessage {
  chartId: string;
  type: "data_update" | "config_change";
  data: any;
  timestamp: number;
}

class ChartStreamingService {
  static streamChartData(chartId: string, newData: any[]) {
    io.to(`chart_${chartId}`).emit("chart_update", {
      chartId,
      type: "data_update",
      data: newData,
      timestamp: Date.now(),
    });
  }
}
```

### Infrastructure

- **Deployment**: Vercel/Docker
- **Database**: PostgreSQL (AWS RDS/Supabase)
- **Caching**: Redis (AWS ElastiCache)
- **File Storage**: AWS S3 (for chart exports)
- **Monitoring**: Application performance monitoring

## 🛡️ Security Considerations

### Database Security

- Encrypted connection strings
- Read-only user accounts for chart queries
- Query validation and sanitization
- Connection pooling with proper limits

### API Security

- Rate limiting on expensive operations
- Input validation and sanitization
- SQL injection prevention
- Proper authentication and authorization

### Data Privacy

- User data isolation
- Secure credential storage
- Chart sharing permissions
- Audit logging for sensitive operations

## 📈 Performance Requirements

### Response Times

- Dataset schema loading: < 3 seconds
- Chart generation: < 5 seconds (ECharts optimization)
- Dashboard loading: < 4 seconds
- Real-time updates: < 1 second
- Chart rendering: < 2 seconds (Canvas), < 3 seconds (SVG)
- Chart export: < 10 seconds (server-side rendering)

### ECharts Performance Optimizations

**Large Dataset Handling**:

- **Progressive Rendering**: Built-in support for 10M+ data points
- **Data Sampling**: Automatic data sampling for performance
- **Streaming Updates**: Incremental data updates via WebSocket
- **Canvas Rendering**: Hardware-accelerated rendering for large datasets

**Memory Management**:

```typescript
class ChartPerformanceManager {
  private static chartInstances = new Map<string, echarts.ECharts>();

  static createChart(containerId: string, option: EChartsOption) {
    // Dispose existing chart if exists
    const existingChart = this.chartInstances.get(containerId);
    if (existingChart) {
      existingChart.dispose();
    }

    const chart = echarts.init(document.getElementById(containerId), null, {
      renderer: "canvas",
      useDirtyRect: true, // Performance optimization
      width: "auto",
      height: "auto",
    });

    chart.setOption(option, {
      notMerge: true,
      lazyUpdate: true,
      silent: false,
    });

    this.chartInstances.set(containerId, chart);
    return chart;
  }

  static disposeChart(containerId: string) {
    const chart = this.chartInstances.get(containerId);
    if (chart) {
      chart.dispose();
      this.chartInstances.delete(containerId);
    }
  }
}
```

### Scalability

- Support for 1000+ concurrent users
- Handle datasets with millions of rows via ECharts progressive rendering
- Efficient caching strategy with Redis
- Horizontal scaling capability
- Chart instance pooling and memory management
- Server-side rendering for exports without blocking UI

## 🧪 Comprehensive Testing Strategy & Implementation

### Production-Ready Testing Philosophy

MindSpark Studio implements a **comprehensive testing strategy** that ensures **reliability**, **performance**, and **user experience excellence** across all components. The testing approach follows **industry best practices** with **high code coverage**, **thorough error scenario testing**, and **realistic production simulation**.

#### Testing Pyramid Structure

1. **Unit Tests (70% Coverage)**: Individual component and function testing
2. **Integration Tests (20% Coverage)**: Component interaction and API endpoint testing
3. **End-to-End Tests (10% Coverage)**: Complete user workflow validation

### 🔬 Text-to-SQL Agent Testing Suite

#### 4.5.6 Core Logic Unit Tests

**Schema Analysis & Sample Data Processing**:

```typescript
// __tests__/lib/text-to-sql/schema-processor.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SchemaProcessor } from "@/lib/text-to-sql/schema-processor";
import { TableSchema, ColumnInfo } from "@/types/database";

describe("SchemaProcessor", () => {
  let schemaProcessor: SchemaProcessor;

  beforeEach(() => {
    schemaProcessor = new SchemaProcessor();
  });

  describe("extractTableSchemas", () => {
    it("should extract complete schema information with column details", async () => {
      const mockTableSchemas: TableSchema[] = [
        {
          tableName: "users",
          schemaName: "public",
          columns: [
            {
              columnName: "id",
              dataType: "integer",
              isNullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
            },
            {
              columnName: "email",
              dataType: "varchar",
              isNullable: false,
              isPrimaryKey: false,
              isForeignKey: false,
            },
          ],
          sampleData: [
            { id: 1, email: "user1@example.com" },
            { id: 2, email: "user2@example.com" },
          ],
          constraints: ["PRIMARY KEY (id)", "UNIQUE (email)"],
          indexes: ["btree_users_email"],
        },
      ];

      const mockDatabaseEngine = {
        getTableSchema: vi.fn().mockResolvedValue(mockTableSchemas[0]),
        getSampleData: vi
          .fn()
          .mockResolvedValue(mockTableSchemas[0].sampleData),
      };

      const result = await schemaProcessor.extractTableSchemas(
        "dataset-123",
        ["users"],
        mockDatabaseEngine
      );

      expect(result).toHaveLength(1);
      expect(result[0].tableName).toBe("users");
      expect(result[0].columns).toHaveLength(2);
      expect(result[0].sampleData).toHaveLength(2);
      expect(mockDatabaseEngine.getTableSchema).toHaveBeenCalledWith("users");
      expect(mockDatabaseEngine.getSampleData).toHaveBeenCalledWith("users", 5);
    });

    it("should handle empty tables gracefully", async () => {
      const mockDatabaseEngine = {
        getTableSchema: vi.fn().mockResolvedValue({
          tableName: "empty_table",
          columns: [],
          sampleData: [],
          constraints: [],
          indexes: [],
        }),
        getSampleData: vi.fn().mockResolvedValue([]),
      };

      const result = await schemaProcessor.extractTableSchemas(
        "dataset-123",
        ["empty_table"],
        mockDatabaseEngine
      );

      expect(result[0].sampleData).toHaveLength(0);
      expect(result[0].columns).toHaveLength(0);
    });

    it("should handle database connection errors", async () => {
      const mockDatabaseEngine = {
        getTableSchema: vi
          .fn()
          .mockRejectedValue(new Error("Connection failed")),
        getSampleData: vi
          .fn()
          .mockRejectedValue(new Error("Connection failed")),
      };

      await expect(
        schemaProcessor.extractTableSchemas(
          "dataset-123",
          ["users"],
          mockDatabaseEngine
        )
      ).rejects.toThrow("Connection failed");
    });
  });

  describe("generateSchemaContext", () => {
    it("should format schema information for AI prompt", () => {
      const mockSchemas: TableSchema[] = [
        {
          tableName: "orders",
          schemaName: "public",
          columns: [
            {
              columnName: "id",
              dataType: "integer",
              isNullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
            },
            {
              columnName: "user_id",
              dataType: "integer",
              isNullable: false,
              isPrimaryKey: false,
              isForeignKey: true,
              referencedTable: "users",
            },
          ],
          sampleData: [
            { id: 1, user_id: 101, total: 99.99 },
            { id: 2, user_id: 102, total: 149.5 },
          ],
          constraints: ["FOREIGN KEY (user_id) REFERENCES users(id)"],
          indexes: ["btree_orders_user_id"],
        },
      ];

      const context = schemaProcessor.generateSchemaContext(mockSchemas);

      expect(context).toContain("Table: orders");
      expect(context).toContain("id (integer, NOT NULL, PRIMARY KEY)");
      expect(context).toContain(
        "user_id (integer, NOT NULL, FOREIGN KEY -> users)"
      );
      expect(context).toContain("Sample Data:");
      expect(context).toContain("FOREIGN KEY (user_id) REFERENCES users(id)");
    });
  });
});
```

**SQL Generation with AI SDK Testing**:

````typescript
// __tests__/lib/text-to-sql/sql-generator.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SQLGenerator } from "@/lib/text-to-sql/sql-generator";
import { generateText } from "ai";
import { TableSchema } from "@/types/database";

// Mock AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

describe("SQLGenerator", () => {
  let sqlGenerator: SQLGenerator;
  const mockGenerateText = vi.mocked(generateText);

  beforeEach(() => {
    sqlGenerator = new SQLGenerator();
    vi.clearAllMocks();
  });

  describe("generateSQL", () => {
    it("should generate valid SQL query from natural language", async () => {
      const mockTableSchemas: TableSchema[] = [
        {
          tableName: "sales",
          schemaName: "public",
          columns: [
            {
              columnName: "id",
              dataType: "integer",
              isNullable: false,
              isPrimaryKey: true,
              isForeignKey: false,
            },
            {
              columnName: "product_name",
              dataType: "varchar",
              isNullable: false,
              isPrimaryKey: false,
              isForeignKey: false,
            },
            {
              columnName: "revenue",
              dataType: "decimal",
              isNullable: false,
              isPrimaryKey: false,
              isForeignKey: false,
            },
          ],
          sampleData: [
            { id: 1, product_name: "Widget A", revenue: 1000.0 },
            { id: 2, product_name: "Widget B", revenue: 1500.0 },
          ],
          constraints: [],
          indexes: [],
        },
      ];

      mockGenerateText.mockResolvedValue({
        text: "SELECT product_name, SUM(revenue) as total_revenue FROM sales GROUP BY product_name ORDER BY total_revenue DESC;",
        finishReason: "stop",
        usage: { promptTokens: 100, completionTokens: 50 },
      });

      const result = await sqlGenerator.generateSQL(
        "Show me total revenue by product",
        mockTableSchemas,
        "openai",
        "gpt-4"
      );

      expect(result).toBe(
        "SELECT product_name, SUM(revenue) as total_revenue FROM sales GROUP BY product_name ORDER BY total_revenue DESC;"
      );
      expect(mockGenerateText).toHaveBeenCalledWith({
        model: expect.anything(),
        system: expect.stringContaining(
          "You are an expert SQL query generator"
        ),
        prompt: 'Generate a SQL query for: "Show me total revenue by product"',
        temperature: 0.1,
        maxTokens: 1000,
      });
    });

    it("should handle AI SDK timeout errors", async () => {
      mockGenerateText.mockRejectedValue(new Error("Request timeout"));

      await expect(
        sqlGenerator.generateSQL("Show me sales data", [], "openai", "gpt-4")
      ).rejects.toThrow("Request timeout");
    });

    it("should clean up generated SQL properly", async () => {
      mockGenerateText.mockResolvedValue({
        text: "```sql\nSELECT * FROM users;\n```",
        finishReason: "stop",
        usage: { promptTokens: 50, completionTokens: 25 },
      });

      const result = await sqlGenerator.generateSQL(
        "Get all users",
        [],
        "openai",
        "gpt-4"
      );

      expect(result).toBe("SELECT * FROM users;");
    });

    it("should support different AI providers", async () => {
      mockGenerateText.mockResolvedValue({
        text: "SELECT COUNT(*) FROM orders;",
        finishReason: "stop",
        usage: { promptTokens: 30, completionTokens: 15 },
      });

      await sqlGenerator.generateSQL(
        "Count all orders",
        [],
        "anthropic",
        "claude-3-opus-20240229"
      );

      expect(mockGenerateText).toHaveBeenCalledWith({
        model: expect.anything(),
        system: expect.any(String),
        prompt: expect.any(String),
        temperature: 0.1,
        maxTokens: 1000,
      });
    });
  });
});
````

**Error Recovery System Testing**:

```typescript
// __tests__/lib/text-to-sql/error-recovery.test.ts
import { describe, it, expect, vi } from "vitest";
import { SQLErrorRecovery } from "@/lib/text-to-sql/error-recovery";
import { analyzeAndRecoverFromError } from "@/utils/sql-error-recovery";

describe("SQLErrorRecovery", () => {
  let errorRecovery: SQLErrorRecovery;

  beforeEach(() => {
    errorRecovery = new SQLErrorRecovery();
  });

  describe("generateSQLWithRetry", () => {
    it("should retry query generation after column not found error", async () => {
      const mockGenerateSQL = vi
        .fn()
        .mockRejectedValueOnce(new Error('column "wrong_name" does not exist'))
        .mockResolvedValueOnce("SELECT correct_column FROM table1;");

      const mockExecuteQuery = vi
        .fn()
        .mockResolvedValueOnce({ success: true, data: [] });

      const result = await errorRecovery.generateSQLWithRetry(
        "Get data from table",
        [],
        "openai",
        "gpt-4",
        3,
        mockGenerateSQL,
        mockExecuteQuery
      );

      expect(result.sql).toBe("SELECT correct_column FROM table1;");
      expect(mockGenerateSQL).toHaveBeenCalledTimes(2);
    });

    it("should retry query generation after syntax error", async () => {
      const mockGenerateSQL = vi
        .fn()
        .mockRejectedValueOnce(new Error('syntax error at or near "FROM"'))
        .mockResolvedValueOnce("SELECT id FROM users;");

      const mockExecuteQuery = vi
        .fn()
        .mockResolvedValueOnce({ success: true, data: [] });

      const result = await errorRecovery.generateSQLWithRetry(
        "Get user IDs",
        [],
        "openai",
        "gpt-4",
        3,
        mockGenerateSQL,
        mockExecuteQuery
      );

      expect(result.sql).toBe("SELECT id FROM users;");
      expect(result.error).toBeUndefined();
    });

    it("should fail after maximum retry attempts", async () => {
      const mockGenerateSQL = vi
        .fn()
        .mockRejectedValue(new Error("persistent error"));

      await expect(
        errorRecovery.generateSQLWithRetry(
          "Invalid query",
          [],
          "openai",
          "gpt-4",
          2,
          mockGenerateSQL,
          vi.fn()
        )
      ).rejects.toThrow("Failed to generate valid SQL after 2 attempts");

      expect(mockGenerateSQL).toHaveBeenCalledTimes(2);
    });

    it("should analyze error patterns correctly", () => {
      const columnError = 'column "invalid_col" does not exist';
      const recoveryResult = analyzeAndRecoverFromError(columnError, 1);

      expect(recoveryResult.canRecover).toBe(true);
      expect(recoveryResult.recoveryPrompt).toContain(
        "column mentioned does not exist"
      );
    });
  });

  describe("Query Optimization", () => {
    it("should provide optimization hints for complex queries", () => {
      const complexQuery = `
        SELECT * FROM table1 t1
        JOIN table2 t2 ON t1.id = t2.table1_id
        JOIN table3 t3 ON t2.id = t3.table2_id
        WHERE t1.name LIKE '%pattern%'
      `;

      const hints = errorRecovery.generateQueryOptimizationHints(
        complexQuery,
        []
      );

      expect(hints).toContain("Consider adding indexes on join columns");
      expect(hints).toContain(
        "Consider selecting only the columns you need instead of using SELECT *"
      );
      expect(hints).toContain("LIKE patterns starting with % can be slow");
    });
  });
});
```

#### 4.5.7 API Routes Testing

**Text-to-SQL API Endpoint Testing**:

```typescript
// __tests__/api/text-to-sql.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/text-to-sql/route";
import { NextRequest } from "next/server";
import { DatabaseEngineFactory } from "@/lib/database/engines/DatabaseEngineFactory";

// Mock external dependencies
vi.mock("@/lib/database/engines/DatabaseEngineFactory");
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-123"),
}));

describe("/api/text-to-sql", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully generate SQL from natural language", async () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/text-to-sql",
      {
        method: "POST",
        body: JSON.stringify({
          query: "Show me all users",
          selectedTables: ["users"],
          datasetId: "dataset-123",
          modelProvider: "openai",
          modelName: "gpt-4",
        }),
      }
    );

    const mockEngine = {
      getTableSchema: vi.fn().mockResolvedValue({
        tableName: "users",
        columns: [{ columnName: "id", dataType: "integer" }],
      }),
      getSampleData: vi.fn().mockResolvedValue([{ id: 1, name: "John" }]),
      executeQuery: vi.fn().mockResolvedValue([{ id: 1, name: "John" }]),
    };

    vi.mocked(DatabaseEngineFactory.createEngine).mockResolvedValue(mockEngine);

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sql).toBeDefined();
    expect(data.explanation).toBeDefined();
    expect(mockEngine.getTableSchema).toHaveBeenCalledWith("users");
  });

  it("should handle invalid table selection", async () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/text-to-sql",
      {
        method: "POST",
        body: JSON.stringify({
          query: "Show me data",
          selectedTables: [], // Empty selection
          datasetId: "dataset-123",
          modelProvider: "openai",
          modelName: "gpt-4",
        }),
      }
    );

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("table");
  });

  it("should handle database connection failures", async () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/text-to-sql",
      {
        method: "POST",
        body: JSON.stringify({
          query: "Show me users",
          selectedTables: ["users"],
          datasetId: "invalid-dataset",
          modelProvider: "openai",
          modelName: "gpt-4",
        }),
      }
    );

    vi.mocked(DatabaseEngineFactory.createEngine).mockRejectedValue(
      new Error("Database connection failed")
    );

    const response = await POST(mockRequest);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("connection");
  });

  it("should handle AI service timeouts", async () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/text-to-sql",
      {
        method: "POST",
        body: JSON.stringify({
          query: "Complex query that times out",
          selectedTables: ["users"],
          datasetId: "dataset-123",
          modelProvider: "openai",
          modelName: "gpt-4",
        }),
      }
    );

    const mockEngine = {
      getTableSchema: vi
        .fn()
        .mockResolvedValue({ tableName: "users", columns: [] }),
      getSampleData: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(DatabaseEngineFactory.createEngine).mockResolvedValue(mockEngine);

    // Mock AI timeout
    const { generateText } = await import("ai");
    vi.mocked(generateText).mockRejectedValue(new Error("Request timeout"));

    const response = await POST(mockRequest);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("timeout");
  });

  it("should validate input parameters", async () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/text-to-sql",
      {
        method: "POST",
        body: JSON.stringify({
          query: "", // Empty query
          selectedTables: ["users"],
          datasetId: "dataset-123",
          modelProvider: "openai",
          modelName: "gpt-4",
        }),
      }
    );

    const response = await POST(mockRequest);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("query");
  });
});
```

**Database Schema API Testing**:

```typescript
// __tests__/api/datasets/[id]/schema.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/datasets/[id]/schema/route";
import { NextRequest } from "next/server";

describe("/api/datasets/[id]/schema", () => {
  it("should return table schemas with column information", async () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/datasets/dataset-123/schema"
    );

    const mockEngine = {
      getSchema: vi.fn().mockResolvedValue({
        schemas: ["public"],
        tables: [
          {
            name: "users",
            columns: [
              { name: "id", dataType: "integer", isNullable: false },
              { name: "email", dataType: "varchar", isNullable: false },
            ],
          },
        ],
      }),
    };

    vi.mocked(DatabaseEngineFactory.createEngine).mockResolvedValue(mockEngine);

    const response = await GET(mockRequest, { params: { id: "dataset-123" } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tables).toHaveLength(1);
    expect(data.tables[0].name).toBe("users");
    expect(data.tables[0].columns).toHaveLength(2);
  });

  it("should handle dataset not found", async () => {
    const mockRequest = new NextRequest(
      "http://localhost:3000/api/datasets/nonexistent/schema"
    );

    vi.mocked(DatabaseEngineFactory.createEngine).mockRejectedValue(
      new Error("Dataset not found")
    );

    const response = await GET(mockRequest, { params: { id: "nonexistent" } });

    expect(response.status).toBe(404);
  });
});
```

#### 4.5.8 Frontend Component Testing

**Table Selector Component Testing**:

```typescript
// __tests__/components/TableSelector.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TableSelector } from "@/components/chart-generation/TableSelector";
import { fetchTableSchemas } from "@/lib/api/datasets";

// Mock API calls
vi.mock("@/lib/api/datasets", () => ({
  fetchTableSchemas: vi.fn(),
}));

describe("TableSelector", () => {
  const mockOnTablesChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render table selection dropdown", async () => {
    vi.mocked(fetchTableSchemas).mockResolvedValue([
      {
        tableName: "users",
        schemaName: "public",
        rowCount: 100,
        columnCount: 5,
        description: "User information table",
      },
      {
        tableName: "orders",
        schemaName: "public",
        rowCount: 500,
        columnCount: 8,
      },
    ]);

    render(
      <TableSelector
        datasetId="dataset-123"
        selectedTables={[]}
        onTablesChange={mockOnTablesChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Select Tables")).toBeInTheDocument();
    });

    // Open dropdown
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("users")).toBeInTheDocument();
      expect(screen.getByText("orders")).toBeInTheDocument();
    });
  });

  it("should handle table selection", async () => {
    vi.mocked(fetchTableSchemas).mockResolvedValue([
      {
        tableName: "users",
        schemaName: "public",
        rowCount: 100,
        columnCount: 5,
      },
    ]);

    render(
      <TableSelector
        datasetId="dataset-123"
        selectedTables={[]}
        onTablesChange={mockOnTablesChange}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button"));
    });

    const checkbox = screen.getByRole("checkbox", { name: /users/ });
    fireEvent.click(checkbox);

    expect(mockOnTablesChange).toHaveBeenCalledWith(["users"]);
  });

  it("should respect maximum table limit", async () => {
    vi.mocked(fetchTableSchemas).mockResolvedValue([
      {
        tableName: "table1",
        schemaName: "public",
        rowCount: 100,
        columnCount: 5,
      },
      {
        tableName: "table2",
        schemaName: "public",
        rowCount: 100,
        columnCount: 5,
      },
      {
        tableName: "table3",
        schemaName: "public",
        rowCount: 100,
        columnCount: 5,
      },
    ]);

    render(
      <TableSelector
        datasetId="dataset-123"
        selectedTables={["table1", "table2"]}
        onTablesChange={mockOnTablesChange}
        maxTables={2}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button"));
    });

    const table3Checkbox = screen.getByRole("checkbox", { name: /table3/ });
    expect(table3Checkbox).toBeDisabled();
  });

  it("should display loading state", () => {
    vi.mocked(fetchTableSchemas).mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <TableSelector
        datasetId="dataset-123"
        selectedTables={[]}
        onTablesChange={mockOnTablesChange}
      />
    );

    expect(screen.getByText("Loading tables...")).toBeInTheDocument();
  });

  it("should handle API errors gracefully", async () => {
    vi.mocked(fetchTableSchemas).mockRejectedValue(new Error("API Error"));

    render(
      <TableSelector
        datasetId="dataset-123"
        selectedTables={[]}
        onTablesChange={mockOnTablesChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Error loading tables/)).toBeInTheDocument();
    });
  });

  it("should filter tables based on search input", async () => {
    vi.mocked(fetchTableSchemas).mockResolvedValue([
      {
        tableName: "users",
        schemaName: "public",
        rowCount: 100,
        columnCount: 5,
      },
      {
        tableName: "orders",
        schemaName: "public",
        rowCount: 500,
        columnCount: 8,
      },
      {
        tableName: "products",
        schemaName: "public",
        rowCount: 200,
        columnCount: 6,
      },
    ]);

    render(
      <TableSelector
        datasetId="dataset-123"
        selectedTables={[]}
        onTablesChange={mockOnTablesChange}
      />
    );

    await waitFor(() => {
      fireEvent.click(screen.getByRole("button"));
    });

    const searchInput = screen.getByPlaceholderText("Search tables...");
    fireEvent.change(searchInput, { target: { value: "user" } });

    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.queryByText("orders")).not.toBeInTheDocument();
    expect(screen.queryByText("products")).not.toBeInTheDocument();
  });
});
```

**Enhanced Chart Card Testing**:

```typescript
// __tests__/components/EnhancedChartCard.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/research";
import { EnhancedChartCard } from "@/components/charts/EnhancedChartCard";
import { ChartData } from "@/types/charts";

describe("EnhancedChartCard", () => {
  const mockChart: ChartData = {
    id: "chart-123",
    title: "Sales by Region",
    chartType: "bar",
    sqlQuery: "SELECT region, SUM(sales) FROM sales_data GROUP BY region",
    chartConfig: { theme: "default" },
    isPinned: false,
    createdAt: new Date(),
  };

  const mockCallbacks = {
    onAIEnhance: vi.fn(),
    onInspect: vi.fn(),
    onPin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render chart card with all action buttons", () => {
    render(<EnhancedChartCard chart={mockChart} {...mockCallbacks} />);

    expect(screen.getByText("Sales by Region")).toBeInTheDocument();
    expect(screen.getByLabelText("AI Enhancement")).toBeInTheDocument();
    expect(screen.getByLabelText("Inspect Chart")).toBeInTheDocument();
    expect(screen.getByLabelText("Pin Chart")).toBeInTheDocument();
  });

  it("should call AI enhance callback when star button clicked", () => {
    render(<EnhancedChartCard chart={mockChart} {...mockCallbacks} />);

    fireEvent.click(screen.getByLabelText("AI Enhancement"));
    expect(mockCallbacks.onAIEnhance).toHaveBeenCalledTimes(1);
  });

  it("should call inspect callback when magnifying glass clicked", () => {
    render(<EnhancedChartCard chart={mockChart} {...mockCallbacks} />);

    fireEvent.click(screen.getByLabelText("Inspect Chart"));
    expect(mockCallbacks.onInspect).toHaveBeenCalledTimes(1);
  });

  it("should call pin callback when pin button clicked", () => {
    render(<EnhancedChartCard chart={mockChart} {...mockCallbacks} />);

    fireEvent.click(screen.getByLabelText("Pin Chart"));
    expect(mockCallbacks.onPin).toHaveBeenCalledTimes(1);
  });

  it("should show pinned state correctly", () => {
    const pinnedChart = { ...mockChart, isPinned: true };

    render(<EnhancedChartCard chart={pinnedChart} {...mockCallbacks} />);

    const pinButton = screen.getByLabelText("Pin Chart");
    expect(pinButton).toHaveClass("text-blue-600"); // Assuming pinned styling
  });

  it("should show hover state on card", () => {
    render(<EnhancedChartCard chart={mockChart} {...mockCallbacks} />);

    const card = screen.getByRole("article");
    fireEvent.mouseEnter(card);

    // Action buttons should be more visible on hover
    expect(screen.getByLabelText("AI Enhancement")).toBeVisible();
  });

  it("should handle dropdown menu actions", async () => {
    render(<EnhancedChartCard chart={mockChart} {...mockCallbacks} />);

    const moreButton = screen.getByLabelText("More options");
    fireEvent.click(moreButton);

    await waitFor(() => {
      expect(screen.getByText("Download")).toBeInTheDocument();
      expect(screen.getByText("Share")).toBeInTheDocument();
      expect(screen.getByText("Duplicate")).toBeInTheDocument();
    });
  });
});
```

**Chat Interface Testing**:

```typescript
// __tests__/components/ChatInterface.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useChat } from "ai/react";

// Mock the useChat hook
vi.mock("ai/react", () => ({
  useChat: vi.fn(),
}));

describe("ChatInterface", () => {
  const mockUseChat = {
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useChat).mockReturnValue(mockUseChat);
  });

  it("should render chat interface with table selector", () => {
    render(<ChatInterface datasetId="dataset-123" />);

    expect(
      screen.getByPlaceholderText(/Describe the chart you want/)
    ).toBeInTheDocument();
    expect(screen.getByText("Select Tables")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate Chart/ })
    ).toBeInTheDocument();
  });

  it("should prevent submission with no tables selected", () => {
    render(<ChatInterface datasetId="dataset-123" />);

    const submitButton = screen.getByRole("button", { name: /Generate Chart/ });
    fireEvent.click(submitButton);

    expect(
      screen.getByText(/Please select at least one table/)
    ).toBeInTheDocument();
    expect(mockUseChat.handleSubmit).not.toHaveBeenCalled();
  });

  it("should prevent submission with empty query", () => {
    render(<ChatInterface datasetId="dataset-123" />);

    // Mock table selection
    const tableSelector = screen.getByText("Select Tables");
    fireEvent.click(tableSelector);

    const submitButton = screen.getByRole("button", { name: /Generate Chart/ });
    fireEvent.click(submitButton);

    expect(
      screen.getByText(/Please enter a query description/)
    ).toBeInTheDocument();
  });

  it("should handle successful chart generation", async () => {
    const mockMessages = [
      {
        id: "1",
        role: "user",
        content: "Show me sales by region",
      },
      {
        id: "2",
        role: "assistant",
        content:
          "Generated chart with SQL: SELECT region, SUM(sales) FROM sales GROUP BY region",
      },
    ];

    vi.mocked(useChat).mockReturnValue({
      ...mockUseChat,
      messages: mockMessages,
    });

    render(<ChatInterface datasetId="dataset-123" />);

    expect(screen.getByText("Show me sales by region")).toBeInTheDocument();
    expect(screen.getByText(/Generated chart with SQL/)).toBeInTheDocument();
  });

  it("should show loading state during generation", () => {
    vi.mocked(useChat).mockReturnValue({
      ...mockUseChat,
      isLoading: true,
    });

    render(<ChatInterface datasetId="dataset-123" />);

    expect(screen.getByText(/Generating chart.../)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Generate Chart/ })
    ).toBeDisabled();
  });

  it("should handle model provider selection", () => {
    render(<ChatInterface datasetId="dataset-123" />);

    const modelSelect = screen.getByLabelText("AI Model");
    fireEvent.change(modelSelect, {
      target: { value: "anthropic-claude-3-opus" },
    });

    expect(modelSelect).toHaveValue("anthropic-claude-3-opus");
  });
});
```

#### 4.5.9 Database Engine Testing

**PostgreSQL Engine Testing**:

```typescript
// __tests__/lib/database/engines/PostgreSQLEngine.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PostgreSQLEngine } from "@/lib/database/engines/PostgreSQLEngine";
import { Pool } from "pg";

// Mock pg module
vi.mock("pg", () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    end: vi.fn(),
    query: vi.fn(),
  })),
}));

describe("PostgreSQLEngine", () => {
  let engine: PostgreSQLEngine;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      connect: vi.fn(),
      end: vi.fn(),
      query: vi.fn(),
    };
    vi.mocked(Pool).mockReturnValue(mockPool);

    engine = new PostgreSQLEngine({
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "testdb",
      username: "testuser",
      password: "testpass",
      ssl: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("testConnection", () => {
    it("should successfully test database connection", async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ version: "PostgreSQL 14.0" }],
      });

      const result = await engine.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toContain("PostgreSQL 14.0");
      expect(mockPool.query).toHaveBeenCalledWith("SELECT version();");
    });

    it("should handle connection failures", async () => {
      mockPool.query.mockRejectedValue(new Error("Connection failed"));

      const result = await engine.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Connection failed");
    });

    it("should handle timeout errors", async () => {
      mockPool.query.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 100)
          )
      );

      const result = await engine.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain("timeout");
    });
  });

  describe("executeQuery", () => {
    it("should execute SELECT queries successfully", async () => {
      const mockRows = [
        { id: 1, name: "John", email: "john@example.com" },
        { id: 2, name: "Jane", email: "jane@example.com" },
      ];

      mockPool.query.mockResolvedValue({
        rows: mockRows,
        fields: [
          { name: "id", dataTypeID: 23 },
          { name: "name", dataTypeID: 1043 },
          { name: "email", dataTypeID: 1043 },
        ],
      });

      const result = await engine.executeQuery("SELECT * FROM users;");

      expect(result.rows).toEqual(mockRows);
      expect(result.fields).toHaveLength(3);
      expect(result.fields[0].name).toBe("id");
    });

    it("should handle query syntax errors", async () => {
      mockPool.query.mockRejectedValue(
        new Error('syntax error at or near "FORM"')
      );

      await expect(engine.executeQuery("SELECT * FORM users;")).rejects.toThrow(
        'syntax error at or near "FORM"'
      );
    });

    it("should apply query timeout", async () => {
      mockPool.query.mockImplementation(
        () =>
          new Promise(
            (resolve) => setTimeout(resolve, 35000) // Longer than timeout
          )
      );

      await expect(engine.executeQuery("SELECT pg_sleep(60);")).rejects.toThrow(
        "timeout"
      );
    });
  });

  describe("getSchema", () => {
    it("should retrieve database schema information", async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ schema_name: "public" }, { schema_name: "analytics" }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              table_name: "users",
              column_name: "id",
              data_type: "integer",
              is_nullable: "NO",
              column_default: "nextval('users_id_seq'::regclass)",
            },
            {
              table_name: "users",
              column_name: "email",
              data_type: "character varying",
              is_nullable: "NO",
              column_default: null,
            },
          ],
        });

      const schema = await engine.getSchema();

      expect(schema.schemas).toEqual(["public", "analytics"]);
      expect(schema.tables).toHaveLength(1);
      expect(schema.tables[0].name).toBe("users");
      expect(schema.tables[0].columns).toHaveLength(2);
    });
  });
});
```

#### 4.5.10 Integration Testing

**End-to-End Chart Generation Flow**:

```typescript
// __tests__/integration/chart-generation-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, Browser, Page } from "playwright";

describe("Chart Generation Integration", () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it("should complete full chart generation workflow", async () => {
    // Navigate to chat interface
    await page.goto("http://localhost:3000/chat-charts");

    // Select dataset
    await page.selectOption('[data-testid="dataset-selector"]', "dataset-123");

    // Select tables
    await page.click('[data-testid="table-selector"]');
    await page.check('input[value="users"]');
    await page.check('input[value="orders"]');
    await page.keyboard.press("Escape");

    // Enter natural language query
    await page.fill(
      '[data-testid="query-input"]',
      "Show me total revenue by customer"
    );

    // Generate chart
    await page.click('[data-testid="generate-button"]');

    // Wait for chart to appear
    await page.waitFor('[data-testid="generated-chart"]', { timeout: 10000 });

    // Verify chart is rendered
    const chart = await page.locator('[data-testid="generated-chart"]');
    expect(await chart.isVisible()).toBe(true);

    // Test AI enhancement
    await page.click('[data-testid="ai-enhance-button"]');
    await page.fill('[data-testid="ai-input"]', "Make the bars blue");
    await page.click('[data-testid="apply-enhancement"]');

    // Wait for chart update
    await page.waitForTimeout(2000);

    // Test inspect functionality
    await page.click('[data-testid="inspect-button"]');
    expect(
      await page.locator('[data-testid="chart-settings"]').isVisible()
    ).toBe(true);

    // Test pin functionality
    await page.click('[data-testid="pin-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      "Chart pinned"
    );
  });

  it("should handle error scenarios gracefully", async () => {
    await page.goto("http://localhost:3000/chat-charts");

    // Try to generate without selecting tables
    await page.fill('[data-testid="query-input"]', "Show me data");
    await page.click('[data-testid="generate-button"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "select at least one table"
    );

    // Test invalid query
    await page.check('input[value="users"]');
    await page.fill(
      '[data-testid="query-input"]',
      "Invalid nonsense query with @#$%"
    );
    await page.click('[data-testid="generate-button"]');

    // Should show SQL generation error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      "unable to generate"
    );
  });
});
```

#### 4.5.11 Performance Testing

**Query Generation Performance Tests**:

```typescript
// __tests__/performance/sql-generation.test.ts
import { describe, it, expect, vi } from "vitest";
import { performance } from "perf_hooks";
import { SQLGenerator } from "@/lib/text-to-sql/sql-generator";

describe("SQL Generation Performance", () => {
  it("should generate SQL within acceptable time limits", async () => {
    const sqlGenerator = new SQLGenerator();
    const startTime = performance.now();

    // Mock AI response for consistent timing
    vi.mocked(generateText).mockResolvedValue({
      text: "SELECT * FROM users WHERE created_at > NOW() - INTERVAL '30 days';",
      finishReason: "stop",
      usage: { promptTokens: 100, completionTokens: 50 },
    });

    await sqlGenerator.generateSQL(
      "Show me users created in the last 30 days",
      [],
      "openai",
      "gpt-4"
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);
  });

  it("should handle large schema contexts efficiently", async () => {
    const largeSchemas = Array.from({ length: 10 }, (_, i) => ({
      tableName: `table_${i}`,
      schemaName: "public",
      columns: Array.from({ length: 20 }, (_, j) => ({
        columnName: `column_${j}`,
        dataType: "varchar",
        isNullable: true,
        isPrimaryKey: false,
        isForeignKey: false,
      })),
      sampleData: Array.from({ length: 5 }, (_, k) => ({
        [`column_${k}`]: `value_${k}`,
      })),
      constraints: [],
      indexes: [],
    }));

    const sqlGenerator = new SQLGenerator();
    const startTime = performance.now();

    vi.mocked(generateText).mockResolvedValue({
      text: "SELECT COUNT(*) FROM table_0;",
      finishReason: "stop",
      usage: { promptTokens: 500, completionTokens: 25 },
    });

    await sqlGenerator.generateSQL(
      "Count rows in first table",
      largeSchemas,
      "openai",
      "gpt-4"
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Should still complete within reasonable time with large context
    expect(duration).toBeLessThan(10000);
  });
});
```

### Testing Configuration & Setup

#### 4.5.12 Testing Environment Configuration

**Vitest Configuration**:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        ".next/",
        "coverage/",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/types/**",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        // Stricter requirements for critical components
        "./src/lib/text-to-sql/": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "./src/app/api/": {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Test Setup File**:

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => "/test-path",
}));

// Mock AI SDK by default
vi.mock("ai", () => ({
  generateText: vi.fn(),
  openai: vi.fn(),
  anthropic: vi.fn(),
}));

// Mock ECharts
vi.mock("echarts", () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
  })),
  registerTheme: vi.fn(),
}));

// Global test setup
beforeAll(() => {
  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

**Test Data Factory**:

```typescript
// __tests__/utils/test-factory.ts
import { TableSchema, ChartData, DatabaseConfig } from "@/types";

export class TestDataFactory {
  static createTableSchema(overrides: Partial<TableSchema> = {}): TableSchema {
    return {
      tableName: "test_table",
      schemaName: "public",
      columns: [
        {
          columnName: "id",
          dataType: "integer",
          isNullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
        },
        {
          columnName: "name",
          dataType: "varchar",
          isNullable: false,
          isPrimaryKey: false,
          isForeignKey: false,
        },
      ],
      sampleData: [
        { id: 1, name: "Test Item 1" },
        { id: 2, name: "Test Item 2" },
      ],
      constraints: ["PRIMARY KEY (id)"],
      indexes: ["btree_test_table_id"],
      ...overrides,
    };
  }

  static createChartData(overrides: Partial<ChartData> = {}): ChartData {
    return {
      id: "chart-test-123",
      title: "Test Chart",
      description: "A test chart for unit testing",
      chartType: "bar",
      sqlQuery: "SELECT category, COUNT(*) FROM items GROUP BY category",
      chartConfig: {
        theme: "default",
        showLegend: true,
        animation: true,
      },
      datasetId: "dataset-test-123",
      userId: "user-test-123",
      isPinned: false,
      dataMode: "static",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      ...overrides,
    };
  }

  static createDatabaseConfig(
    overrides: Partial<DatabaseConfig> = {}
  ): DatabaseConfig {
    return {
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "testdb",
      username: "testuser",
      password: "testpass",
      ssl: false,
      connectionTimeout: 30000,
      ...overrides,
    };
  }
}
```

#### 4.5.13 CI/CD Testing Pipeline

**GitHub Actions Workflow**:

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_USER: testuser
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run type-check

      - name: Run linting
        run: npm run lint

      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgresql://testuser:testpass@localhost:5432/testdb
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Start application
        run: npm start &

      - name: Wait for application
        run: npx wait-on http://localhost:3000

      - name: Run integration tests
        run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Build and start application
        run: |
          npm run build
          npm start &
          npx wait-on http://localhost:3000

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

#### 4.5.14 Test Commands & Scripts

**Package.json Test Scripts**:

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:integration": "vitest run --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage && open coverage/index.html",
    "test:text-to-sql": "vitest run --testPathPattern=text-to-sql",
    "test:api": "vitest run --testPathPattern=api",
    "test:components": "vitest run --testPathPattern=components"
  }
}
```

This comprehensive testing strategy ensures **production-ready quality** with:

1. **🔬 95%+ Code Coverage**: Thorough testing of all critical paths
2. **🚨 Error Scenario Coverage**: Complete validation of failure cases
3. **⚡ Performance Validation**: Response time and scalability testing
4. **🧪 Integration Testing**: End-to-end workflow validation
5. **🤖 Automated CI/CD**: Continuous testing with every code change
6. **📊 Realistic Data**: Factory-generated test data matching production scenarios
7. **🛡️ Security Testing**: Input validation and SQL injection prevention
8. **♿ Accessibility Testing**: WCAG compliance verification

The testing implementation provides **confidence in production deployment** while maintaining **developer productivity** through fast feedback loops and comprehensive coverage reporting.

## 🎨 UI/UX Design System & Implementation Guide

### Design Philosophy: Apache Superset-Inspired Excellence

MindSpark Studio follows a **user-first design philosophy** that prioritizes **intuitive navigation**, **visual clarity**, and **efficient workflows**. Drawing inspiration from Apache Superset's proven interface patterns, the design emphasizes **progressive disclosure**, **contextual actions**, and **predictable interactions**.

#### Core Design Principles

1. **Principle of Least Surprise**: Users should never wonder what will happen when they interact with interface elements
2. **Immediate Feedback**: Every user action receives clear, immediate visual response
3. **Contextual Relevance**: Tools and options appear when and where users need them
4. **Accessibility First**: WCAG 2.1 AA compliance built into every component
5. **Responsive Excellence**: Seamless experience across all device sizes

### 🏗️ Layout Architecture & Component Hierarchy

#### Global Layout Structure

```typescript
// components/layout/AppLayout.tsx
import { cn } from "@/lib/utils";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebarContent,
  breadcrumbs,
  className,
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <Header />

      <div className="flex h-[calc(100vh-64px)]">
        {/* Collapsible Sidebar */}
        {sidebarContent && (
          <aside className="w-80 bg-white border-r border-gray-200 flex-shrink-0">
            <div className="h-full overflow-y-auto">{sidebarContent}</div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={cn("flex-1 overflow-hidden", className)}>
          {/* Breadcrumb Navigation */}
          {breadcrumbs && (
            <div className="bg-white border-b border-gray-200 px-6 py-3">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}

          {/* Page Content */}
          <div className="h-full overflow-y-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};
```

#### Navigation Header Component

```typescript
// components/layout/Header.tsx
import { useState } from "react";
import { Bell, User, Settings, LogOut, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Logo & Brand */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
          <h1 className="text-xl font-bold text-gray-900">MindSpark Studio</h1>
        </div>

        {/* Primary Navigation */}
        <nav className="hidden md:flex items-center space-x-1 ml-8">
          {[
            { name: "Datasets", href: "/datasets", active: false },
            { name: "Generate", href: "/chat-charts", active: true },
            { name: "Charts", href: "/charts", active: false },
            { name: "Dashboards", href: "/dashboards", active: false },
          ].map((item) => (
            <Button
              key={item.name}
              variant={item.active ? "default" : "ghost"}
              size="sm"
              className={cn(
                "font-medium",
                item.active
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              {item.name}
            </Button>
          ))}
        </nav>
      </div>

      {/* Search & User Actions */}
      <div className="flex items-center space-x-4">
        {/* Global Search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search charts, datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs bg-red-500">
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">
                John Doe
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
```

### 📊 Chart Generation Interface Design

#### Chat-to-Chart Interface with Progressive Disclosure

```typescript
// components/chat/ChatGenerationInterface.tsx
import { useState } from "react";
import { Send, Sparkles, Database, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TableSelector } from "./TableSelector";
import { ModelSelector } from "./ModelSelector";

export const ChatGenerationInterface: React.FC = () => {
  const [input, setInput] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Context & Configuration */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Dataset Context */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2 mb-3">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Dataset Context</h3>
          </div>
          <TableSelector
            selectedTables={selectedTables}
            onTablesChange={setSelectedTables}
            className="w-full"
          />
        </div>

        {/* AI Model Configuration */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">AI Model</h3>
          </div>
          <ModelSelector />
        </div>

        {/* Context Summary */}
        <div className="flex-1 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Active Context
          </h4>
          <div className="space-y-2">
            {selectedTables.length > 0 ? (
              selectedTables.map((table) => (
                <Badge key={table} variant="secondary" className="block w-fit">
                  {table}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No tables selected</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Welcome Message */}
          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Welcome to MindSpark Studio
                  </h4>
                  <p className="text-sm text-blue-700">
                    Describe the data visualization you want to create. I'll
                    generate the SQL query and create a chart for you.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      "Show sales by region",
                      "Top 10 customers by revenue",
                      "Monthly growth trends",
                    ].map((suggestion) => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                        onClick={() => setInput(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generated Chart Cards Would Appear Here */}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex space-x-3">
            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the data visualization you want to create..."
                className="min-h-[60px] resize-none border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    // Handle submit
                  }
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>Press Enter to send, Shift+Enter for new line</span>
                </div>
                <div className="text-xs text-gray-400">{input.length}/1000</div>
              </div>
            </div>
            <Button
              size="lg"
              disabled={
                !input.trim() || selectedTables.length === 0 || isGenerating
              }
              className="h-[60px] px-6"
            >
              {isGenerating ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Send className="w-4 h-4" />
                  <span>Generate</span>
                </div>
              )}
            </Button>
          </div>

          {/* Status Indicators */}
          {selectedTables.length === 0 && (
            <div className="mt-2 text-xs text-amber-600 flex items-center space-x-1">
              <div className="w-2 h-2 bg-amber-400 rounded-full" />
              <span>Please select tables from the sidebar to continue</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### Enhanced Chart Card with Three-Action System

```typescript
// components/charts/EnhancedChartCard.tsx
import { useState } from "react";
import {
  Sparkles,
  Search,
  Pin,
  MoreVertical,
  Download,
  Share,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

interface ChartCardProps {
  chart: ChartData;
  onAIEnhance: () => void;
  onInspect: () => void;
  onPin: () => void;
}

export const EnhancedChartCard: React.FC<ChartCardProps> = ({
  chart,
  onAIEnhance,
  onInspect,
  onPin,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(chart.isPinned);

  return (
    <Card
      className="group relative transition-all duration-200 hover:shadow-lg border-gray-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with Title and Actions */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {chart.title}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {chart.chartType}
              </Badge>
              <span className="text-xs text-gray-500">
                {chart.dataPoints} rows • {chart.createdAt}
              </span>
            </div>
          </div>

          {/* Action Buttons - Always Visible on Mobile, Hover on Desktop */}
          <div
            className={cn(
              "flex items-center space-x-1 transition-opacity duration-200",
              "md:opacity-0 md:group-hover:opacity-100 opacity-100"
            )}
          >
            <TooltipProvider>
              {/* AI Enhancement Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                    onClick={onAIEnhance}
                  >
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI Enhancement</TooltipContent>
              </Tooltip>

              {/* Inspect Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    onClick={onInspect}
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Inspect Settings</TooltipContent>
              </Tooltip>

              {/* Pin Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0",
                      isPinned
                        ? "bg-green-100 text-green-600 hover:bg-green-200"
                        : "hover:bg-gray-100"
                    )}
                    onClick={() => {
                      setIsPinned(!isPinned);
                      onPin();
                    }}
                  >
                    <Pin
                      className={cn("w-4 h-4", isPinned && "fill-current")}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isPinned ? "Remove from Library" : "Save to Library"}
                </TooltipContent>
              </Tooltip>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Export Data
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Share className="w-4 h-4 mr-2" />
                    Share Chart
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      {/* Chart Content Area */}
      <CardContent className="p-0">
        <div className="h-64 bg-gray-50 rounded-b-lg flex items-center justify-center">
          {/* Chart visualization would go here */}
          <div className="text-gray-400">Chart Visualization</div>
        </div>
      </CardContent>

      {/* Status Indicator */}
      {chart.isGenerating && (
        <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Generating chart...</span>
          </div>
        </div>
      )}
    </Card>
  );
};
```

### 📊 Dashboard Builder Interface

#### Drag-and-Drop Dashboard Grid

```typescript
// components/dashboard/DashboardBuilder.tsx
import { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import { Plus, Settings, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardControls } from "./DashboardControls";
import { ChartSelector } from "./ChartSelector";

const ResponsiveGridLayout = WidthProvider(Responsive);

export const DashboardBuilder: React.FC = () => {
  const [layouts, setLayouts] = useState({});
  const [isEditMode, setIsEditMode] = useState(true);
  const [showChartSelector, setShowChartSelector] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sales Dashboard
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Real-time analytics and insights
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChartSelector(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Chart</span>
            </Button>

            <Button
              variant={isEditMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditMode(!isEditMode)}
              className="flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>{isEditMode ? "Done" : "Edit"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Controls */}
      <DashboardControls />

      {/* Grid Layout Area */}
      <div className="flex-1 p-4 bg-gray-50">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={(layout, layouts) => setLayouts(layouts)}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          margin={[16, 16]}
          containerPadding={[0, 0]}
        >
          {/* Sample Dashboard Items */}
          <div
            key="chart1"
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <DashboardChartCard
              title="Revenue Over Time"
              chartType="line"
              isEditMode={isEditMode}
            />
          </div>

          <div
            key="chart2"
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <DashboardChartCard
              title="Sales by Region"
              chartType="bar"
              isEditMode={isEditMode}
            />
          </div>
        </ResponsiveGridLayout>
      </div>

      {/* Chart Selector Modal */}
      {showChartSelector && (
        <ChartSelector
          onClose={() => setShowChartSelector(false)}
          onChartSelect={(chart) => {
            // Add chart to dashboard
            setShowChartSelector(false);
          }}
        />
      )}
    </div>
  );
};
```

### 🎯 Form Design & Accessibility

#### Accessible Form Components

```typescript
// components/forms/AccessibleFormField.tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormFieldProps {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
}

export const AccessibleFormField = forwardRef<HTMLDivElement, FormFieldProps>(
  (
    { label, description, error, required, helpText, children, className },
    ref
  ) => {
    const fieldId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`;

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {/* Label with Required Indicator */}
        <div className="flex items-center space-x-2">
          <Label
            htmlFor={fieldId}
            className={cn(
              "text-sm font-medium text-gray-900",
              error && "text-red-700"
            )}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </Label>

          {/* Help Tooltip */}
          {helpText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Description Text */}
        {description && <p className="text-sm text-gray-600">{description}</p>}

        {/* Form Control */}
        <div className="relative">
          {children}

          {/* Error Icon */}
          {error && (
            <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-500" />
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600 flex items-center space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);
```

### 📱 Responsive Design Implementation

#### Mobile-First Breakpoint System

```typescript
// tailwind.config.js extension for MindSpark Studio
module.exports = {
  theme: {
    extend: {
      screens: {
        xs: "475px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      colors: {
        mindspark: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          900: "#0c4a6e",
        },
      },
    },
  },
};

// Responsive Layout Hook
export const useResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet };
};
```

### 🔄 Loading States & Feedback Systems

#### Progressive Loading Components

```typescript
// components/feedback/LoadingStates.tsx
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

// Skeleton Loader for Charts
export const ChartSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      <div className="flex space-x-2">
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
        <div className="h-8 w-8 bg-gray-200 rounded"></div>
      </div>
    </div>
    <div className="h-64 bg-gray-200 rounded-lg"></div>
  </div>
);

// Inline Loading Indicator
export const InlineLoader: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => (
  <div className="flex items-center space-x-2 text-sm text-gray-600">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{message}</span>
  </div>
);

// Status Indicator
interface StatusIndicatorProps {
  status: "loading" | "success" | "error";
  message: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  className,
}) => {
  const variants = {
    loading: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      color: "text-blue-600",
    },
    success: {
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-600",
    },
    error: {
      icon: <XCircle className="w-4 h-4" />,
      color: "text-red-600",
    },
  };

  const variant = variants[status];

  return (
    <div
      className={cn(
        "flex items-center space-x-2 text-sm",
        variant.color,
        className
      )}
    >
      {variant.icon}
      <span>{message}</span>
    </div>
  );
};
```

### 🎨 Theme System & Visual Consistency

#### Consistent Design Tokens

```typescript
// lib/design-tokens.ts
export const designTokens = {
  colors: {
    primary: {
      50: "#f0f9ff",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
    },
    semantic: {
      success: "#059669",
      warning: "#d97706",
      error: "#dc2626",
      info: "#0284c7",
    },
    neutral: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      500: "#6b7280",
      900: "#111827",
    },
  },
  spacing: {
    component: "1rem",
    section: "2rem",
    page: "3rem",
  },
  typography: {
    h1: "text-3xl font-bold tracking-tight",
    h2: "text-2xl font-semibold tracking-tight",
    h3: "text-lg font-semibold",
    body: "text-sm text-gray-700",
    caption: "text-xs text-gray-500",
  },
  shadows: {
    card: "shadow-sm border border-gray-200",
    elevated: "shadow-lg border border-gray-100",
    floating: "shadow-xl border border-gray-50",
  },
  animations: {
    fast: "transition-all duration-150 ease-out",
    normal: "transition-all duration-200 ease-out",
    slow: "transition-all duration-300 ease-out",
  },
};
```

### ♿ Accessibility Implementation

#### WCAG 2.1 AA Compliance Features

```typescript
// components/accessibility/AccessibilityProvider.tsx
import { createContext, useContext, useEffect } from "react";

interface AccessibilityContextType {
  announceToScreenReader: (message: string) => void;
  focusManagement: {
    trapFocus: (element: HTMLElement) => () => void;
    restoreFocus: (element: HTMLElement) => void;
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null
);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement("div");
    announcement.setAttribute("aria-live", "polite");
    announcement.setAttribute("aria-atomic", "true");
    announcement.className = "sr-only";
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  const trapFocus = (element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener("keydown", handleTabKey);
    firstElement?.focus();

    return () => {
      element.removeEventListener("keydown", handleTabKey);
    };
  };

  const restoreFocus = (element: HTMLElement) => {
    element.focus();
  };

  return (
    <AccessibilityContext.Provider
      value={{
        announceToScreenReader,
        focusManagement: { trapFocus, restoreFocus },
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return context;
};
```

### 🎯 User Onboarding & Progressive Disclosure

#### Contextual Help System

```typescript
// components/onboarding/ContextualHelp.tsx
import { useState } from "react";
import { HelpCircle, X, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: "top" | "bottom" | "left" | "right";
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: "table-selection",
    title: "Select Your Data Tables",
    description:
      "Choose which database tables you want to use for generating your visualization.",
    target: '[data-onboarding="table-selector"]',
    position: "right",
  },
  {
    id: "natural-language",
    title: "Describe Your Chart",
    description:
      "Use natural language to describe what kind of chart you want to create.",
    target: '[data-onboarding="chat-input"]',
    position: "top",
  },
  {
    id: "chart-actions",
    title: "Chart Actions",
    description:
      "Use these buttons to enhance, inspect, or save your generated charts.",
    target: '[data-onboarding="chart-actions"]',
    position: "left",
  },
];

export const OnboardingTour: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);

  if (!isActive || currentStep >= onboardingSteps.length) return null;

  const step = onboardingSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />

      {/* Tooltip */}
      <Card className="fixed z-50 w-80 shadow-xl border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsActive(false)}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{step.description}</p>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Step {currentStep + 1} of {onboardingSteps.length}
            </div>

            <div className="flex space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => {
                  if (currentStep === onboardingSteps.length - 1) {
                    setIsActive(false);
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
              >
                {currentStep === onboardingSteps.length - 1 ? "Finish" : "Next"}
                {currentStep < onboardingSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
```

This comprehensive UI/UX design system ensures that MindSpark Studio provides an **intuitive, accessible, and delightful user experience** that rivals the best data visualization tools in the market. The design emphasizes **clarity**, **consistency**, and **user empowerment** through thoughtful component architecture and progressive disclosure patterns.

## 🔄 Data Flow Architecture

```mermaid
graph TD
    A[User Chat Input] --> B[NLP Processing]
    B --> C[SQL Generation]
    C --> D[Query Validation]
    D --> E[Database Execution]
    E --> F[Result Processing]
    F --> G[Chart Generation]
    G --> H[Chart Card Display]
    H --> I[Save to Library]
    I --> J[Dashboard Integration]

    K[Dataset Configuration] --> L[Schema Discovery]
    L --> M[Metadata Storage]
    M --> C

    N[Dashboard Builder] --> O[Layout Engine]
    O --> P[Chart Positioning]
    P --> Q[Real-time Updates]
    Q --> R[WebSocket Push]
```

This comprehensive system requirements document provides the foundation for building MindSpark Studio as a powerful, AI-driven data visualization platform that combines the conversational ease of chat interfaces with the robust functionality of Apache Superset-style dashboards.

---

## 📊 Apache ECharts Implementation Guide

### ECharts Component Architecture

#### Core Chart Component Structure

```typescript
// components/charts/EChartsWrapper.tsx
import React, { useEffect, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts/core";
import { EChartsOption } from "echarts";

interface EChartsWrapperProps {
  option: EChartsOption;
  style?: React.CSSProperties;
  theme?: string;
  loading?: boolean;
  onChartReady?: (chart: echarts.ECharts) => void;
  onEvents?: Record<string, (params: any) => void>;
  autoResize?: boolean;
  renderer?: "canvas" | "svg";
}

export const EChartsWrapper: React.FC<EChartsWrapperProps> = ({
  option,
  style = { height: "400px", width: "100%" },
  theme = "default",
  loading = false,
  onChartReady,
  onEvents,
  autoResize = true,
  renderer = "canvas",
}) => {
  const chartRef = useRef<ReactECharts>(null);
  const [chartInstance, setChartInstance] = useState<echarts.ECharts | null>(
    null
  );

  const handleChartReady = (chart: echarts.ECharts) => {
    setChartInstance(chart);
    onChartReady?.(chart);
  };

  useEffect(() => {
    if (chartInstance && autoResize) {
      const handleResize = () => chartInstance.resize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [chartInstance, autoResize]);

  return (
    <ReactECharts
      ref={chartRef}
      option={option}
      style={style}
      theme={theme}
      showLoading={loading}
      onChartReady={handleChartReady}
      onEvents={onEvents}
      opts={{
        renderer,
        useDirtyRect: true,
        width: "auto",
        height: "auto",
      }}
    />
  );
};
```

### Chart Type Implementations

#### 1. Bar Chart Implementation

```typescript
// components/charts/BarChart.tsx
export interface BarChartProps {
  data: Array<{
    category: string;
    value: number;
    [key: string]: any;
  }>;
  title?: string;
  horizontal?: boolean;
  stacked?: boolean;
  gradient?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  horizontal = false,
  stacked = false,
  gradient = true,
}) => {
  const option: EChartsOption = {
    title: title ? { text: title, left: "center" } : undefined,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: horizontal ? "value" : "category",
      data: horizontal ? undefined : data.map((item) => item.category),
      axisLabel: { rotate: horizontal ? 0 : 45 },
    },
    yAxis: {
      type: horizontal ? "category" : "value",
      data: horizontal ? data.map((item) => item.category) : undefined,
    },
    series: [
      {
        type: "bar",
        data: data.map((item) => item.value),
        itemStyle: gradient
          ? {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: "#83bff6" },
                { offset: 0.5, color: "#188df0" },
                { offset: 1, color: "#188df0" },
              ]),
            }
          : undefined,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  return <EChartsWrapper option={option} />;
};
```

#### 2. Heatmap Implementation

```typescript
// components/charts/HeatmapChart.tsx
export interface HeatmapChartProps {
  data: Array<[number, number, number]>; // [x, y, value]
  xAxisLabels: string[];
  yAxisLabels: string[];
  title?: string;
  colorRange?: [string, string];
}

export const HeatmapChart: React.FC<HeatmapChartProps> = ({
  data,
  xAxisLabels,
  yAxisLabels,
  title,
  colorRange = ["#313695", "#a50026"],
}) => {
  const maxValue = Math.max(...data.map((item) => item[2]));
  const minValue = Math.min(...data.map((item) => item[2]));

  const option: EChartsOption = {
    title: title ? { text: title, left: "center" } : undefined,
    tooltip: {
      position: "top",
      formatter: (params: any) => {
        const [x, y, value] = params.data;
        return `${yAxisLabels[y]}<br/>${xAxisLabels[x]}: ${value}`;
      },
    },
    grid: {
      height: "50%",
      top: "10%",
    },
    xAxis: {
      type: "category",
      data: xAxisLabels,
      splitArea: { show: true },
    },
    yAxis: {
      type: "category",
      data: yAxisLabels,
      splitArea: { show: true },
    },
    visualMap: {
      min: minValue,
      max: maxValue,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: "15%",
      inRange: {
        color: colorRange,
      },
    },
    series: [
      {
        name: "Heatmap",
        type: "heatmap",
        data: data,
        label: {
          show: true,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };

  return <EChartsWrapper option={option} />;
};
```

#### 3. Treemap Implementation

```typescript
// components/charts/TreemapChart.tsx
export interface TreemapData {
  name: string;
  value: number;
  children?: TreemapData[];
}

export interface TreemapChartProps {
  data: TreemapData[];
  title?: string;
  colorSeries?: string[];
}

export const TreemapChart: React.FC<TreemapChartProps> = ({
  data,
  title,
  colorSeries = ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de"],
}) => {
  const option: EChartsOption = {
    title: title ? { text: title, left: "center" } : undefined,
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}",
    },
    series: [
      {
        type: "treemap",
        data: data,
        leafDepth: 1,
        label: {
          show: true,
          formatter: "{b}",
        },
        upperLabel: {
          show: true,
          height: 30,
          color: "#fff",
        },
        itemStyle: {
          borderColor: "#fff",
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 0,
              gapWidth: 5,
            },
          },
          {
            itemStyle: {
              gapWidth: 1,
            },
          },
        ],
      },
    ],
  };

  return <EChartsWrapper option={option} />;
};
```

#### 4. Gauge Chart Implementation

```typescript
// components/charts/GaugeChart.tsx
export interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  title?: string;
  unit?: string;
  thresholds?: Array<{
    value: number;
    color: string;
    label: string;
  }>;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  min = 0,
  max = 100,
  title,
  unit = "%",
  thresholds = [
    { value: 30, color: "#fd666d", label: "Low" },
    { value: 70, color: "#37a2da", label: "Medium" },
    { value: 100, color: "#32c5e9", label: "High" },
  ],
}) => {
  const option: EChartsOption = {
    title: title ? { text: title, left: "center" } : undefined,
    series: [
      {
        type: "gauge",
        min,
        max,
        splitNumber: 10,
        radius: "70%",
        axisLine: {
          lineStyle: {
            color: thresholds.map((threshold) => [
              threshold.value / max,
              threshold.color,
            ]),
            width: 20,
          },
        },
        pointer: {
          itemStyle: {
            color: "auto",
          },
        },
        axisTick: {
          distance: -30,
          length: 8,
          lineStyle: {
            color: "#fff",
            width: 2,
          },
        },
        splitLine: {
          distance: -30,
          length: 30,
          lineStyle: {
            color: "#fff",
            width: 4,
          },
        },
        axisLabel: {
          color: "auto",
          distance: 40,
          fontSize: 14,
        },
        detail: {
          valueAnimation: true,
          formatter: `{value}${unit}`,
          color: "auto",
          fontSize: 30,
          offsetCenter: [0, "70%"],
        },
        data: [
          {
            value: value,
            name: title || "Progress",
          },
        ],
      },
    ],
  };

  return <EChartsWrapper option={option} />;
};
```

### Chart Factory Pattern

```typescript
// services/ChartFactory.ts
export class ChartFactory {
  static createChart(
    type: EChartsChartType,
    data: any[],
    config?: Partial<EChartsOption>
  ): EChartsOption {
    switch (type) {
      case "bar":
        return this.createBarChart(data, config);
      case "line":
        return this.createLineChart(data, config);
      case "pie":
        return this.createPieChart(data, config);
      case "heatmap":
        return this.createHeatmapChart(data, config);
      case "treemap":
        return this.createTreemapChart(data, config);
      case "gauge":
        return this.createGaugeChart(data, config);
      case "radar":
        return this.createRadarChart(data, config);
      case "sunburst":
        return this.createSunburstChart(data, config);
      case "sankey":
        return this.createSankeyChart(data, config);
      default:
        throw new Error(`Unsupported chart type: ${type}`);
    }
  }

  private static createBarChart(
    data: any[],
    config?: Partial<EChartsOption>
  ): EChartsOption {
    return {
      tooltip: { trigger: "axis" },
      grid: { left: "3%", right: "4%", bottom: "3%", containLabel: true },
      xAxis: {
        type: "category",
        data: data.map((item) => item.label || item.name || item.category),
      },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          data: data.map((item) => item.value || item.y || item.count),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#83bff6" },
              { offset: 0.5, color: "#188df0" },
              { offset: 1, color: "#188df0" },
            ]),
          },
        },
      ],
      ...config,
    };
  }

  // Add other chart creation methods...
}
```

### Advanced ECharts Features Integration

#### Data Zoom and Brush Selection

```typescript
// Enhanced chart with data zoom and brush selection
const advancedOption: EChartsOption = {
  dataZoom: [
    {
      type: "slider",
      xAxisIndex: 0,
      filterMode: "none",
    },
    {
      type: "slider",
      yAxisIndex: 0,
      filterMode: "none",
    },
    {
      type: "inside",
      xAxisIndex: 0,
      filterMode: "none",
    },
    {
      type: "inside",
      yAxisIndex: 0,
      filterMode: "none",
    },
  ],
  brush: {
    toolbox: ["rect", "polygon", "lineX", "lineY", "keep", "clear"],
    xAxisIndex: "all",
  },
  toolbox: {
    feature: {
      brush: {
        type: ["rect", "polygon", "lineX", "lineY"],
      },
      dataZoom: {
        yAxisIndex: "none",
      },
      restore: {},
      saveAsImage: {},
    },
  },
};
```

This enhanced Apache ECharts implementation provides a comprehensive foundation for creating sophisticated, interactive data visualizations in MindSpark Studio, supporting all major chart types with professional styling and advanced features.
