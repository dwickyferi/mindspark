// Dynamic Chart Configuration Types

export interface ChartMargin {
  top: number;
  right: number;
  left: number;
  bottom: number;
}

export interface ChartComponentProps {
  [key: string]: any;
}

export interface ChartComponent {
  type: string;
  props?: ChartComponentProps;
}

export interface DynamicChartConfig {
  chartType: string;
  chartProps: {
    width?: number;
    height?: number;
    margin?: ChartMargin;
    [key: string]: any;
  };
  data: any[];
  components: ChartComponent[];
  metadata?: {
    title?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    version?: string;
  };
}

// Predefined chart types and their supported components
export const SUPPORTED_CHART_TYPES = {
  LineChart: {
    name: "Line Chart",
    components: [
      "XAxis",
      "YAxis",
      "CartesianGrid",
      "Tooltip",
      "Legend",
      "Line",
      "ResponsiveContainer",
    ],
  },
  BarChart: {
    name: "Bar Chart",
    components: [
      "XAxis",
      "YAxis",
      "CartesianGrid",
      "Tooltip",
      "Legend",
      "Bar",
      "ResponsiveContainer",
    ],
  },
  AreaChart: {
    name: "Area Chart",
    components: [
      "XAxis",
      "YAxis",
      "CartesianGrid",
      "Tooltip",
      "Legend",
      "Area",
      "ResponsiveContainer",
    ],
  },
  PieChart: {
    name: "Pie Chart",
    components: ["Tooltip", "Legend", "Pie", "Cell", "ResponsiveContainer"],
  },
  ScatterChart: {
    name: "Scatter Chart",
    components: [
      "XAxis",
      "YAxis",
      "CartesianGrid",
      "Tooltip",
      "Legend",
      "Scatter",
      "ResponsiveContainer",
    ],
  },
  ComposedChart: {
    name: "Composed Chart",
    components: [
      "XAxis",
      "YAxis",
      "CartesianGrid",
      "Tooltip",
      "Legend",
      "Line",
      "Bar",
      "Area",
      "ResponsiveContainer",
    ],
  },
  TableChart: {
    name: "Table Chart",
    components: [
      "Table",
      "TableHeader",
      "TableBody",
      "TableRow",
      "TableHead",
      "TableCell",
    ],
  },
} as const;

export type SupportedChartType = keyof typeof SUPPORTED_CHART_TYPES;

// Default configurations for different chart types
export const DEFAULT_CHART_CONFIGS: Record<
  SupportedChartType,
  Partial<DynamicChartConfig>
> = {
  LineChart: {
    chartType: "LineChart",
    chartProps: {
      width: 500,
      height: 300,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    },
    components: [
      { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
      { type: "XAxis", props: { dataKey: "name" } },
      { type: "YAxis" },
      { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
      { type: "Tooltip" },
      { type: "Legend" },
    ],
  },
  BarChart: {
    chartType: "BarChart",
    chartProps: {
      width: 500,
      height: 300,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    },
    components: [
      { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
      { type: "XAxis", props: { dataKey: "name" } },
      { type: "YAxis" },
      { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
      { type: "Tooltip" },
      { type: "Legend" },
    ],
  },
  AreaChart: {
    chartType: "AreaChart",
    chartProps: {
      width: 500,
      height: 300,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    },
    components: [
      { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
      { type: "XAxis", props: { dataKey: "name" } },
      { type: "YAxis" },
      { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
      { type: "Tooltip" },
      { type: "Legend" },
    ],
  },
  PieChart: {
    chartType: "PieChart",
    chartProps: {
      width: 400,
      height: 400,
      margin: { top: 20, right: 20, left: 20, bottom: 20 },
    },
    components: [
      { type: "ResponsiveContainer", props: { width: "100%", height: 400 } },
      { type: "Tooltip" },
      { type: "Legend" },
    ],
  },
  ScatterChart: {
    chartType: "ScatterChart",
    chartProps: {
      width: 500,
      height: 300,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    },
    components: [
      { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
      { type: "XAxis", props: { dataKey: "x" } },
      { type: "YAxis", props: { dataKey: "y" } },
      { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
      { type: "Tooltip" },
      { type: "Legend" },
    ],
  },
  ComposedChart: {
    chartType: "ComposedChart",
    chartProps: {
      width: 500,
      height: 300,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    },
    components: [
      { type: "ResponsiveContainer", props: { width: "100%", height: 300 } },
      { type: "XAxis", props: { dataKey: "name" } },
      { type: "YAxis" },
      { type: "CartesianGrid", props: { strokeDasharray: "3 3" } },
      { type: "Tooltip" },
      { type: "Legend" },
    ],
  },
  TableChart: {
    chartType: "TableChart",
    chartProps: {
      width: 800,
      height: 400,
      maxRows: 100,
    },
    components: [
      { type: "Table" },
      { type: "TableHeader" },
      { type: "TableBody" },
      { type: "TableRow" },
      { type: "TableHead" },
      { type: "TableCell" },
    ],
  },
};

// Color palette for automatic color assignment
export const CHART_COLORS = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00ff00",
  "#0088fe",
  "#00c49f",
  "#ffbb28",
  "#ff8042",
  "#8dd1e1",
];

// Utility functions for config manipulation
export const createDefaultConfig = (
  chartType: SupportedChartType,
  data: any[],
): DynamicChartConfig => {
  const baseConfig = DEFAULT_CHART_CONFIGS[chartType];
  return {
    ...baseConfig,
    data,
    metadata: {
      title: `${SUPPORTED_CHART_TYPES[chartType].name}`,
      description: `Generated ${chartType}`,
      createdAt: new Date().toISOString(),
      version: "1.0",
    },
  } as DynamicChartConfig;
};

export const validateChartConfig = (
  config: any,
): config is DynamicChartConfig => {
  return (
    typeof config === "object" &&
    typeof config.chartType === "string" &&
    typeof config.chartProps === "object" &&
    Array.isArray(config.data) &&
    Array.isArray(config.components)
  );
};
