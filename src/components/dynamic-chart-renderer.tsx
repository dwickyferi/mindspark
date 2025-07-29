import React from "react";
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ScatterChart,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  Scatter,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DynamicChartConfig, CHART_COLORS } from "@/types/chart-config";

interface DynamicChartRendererProps {
  config: DynamicChartConfig;
  className?: string;
}

// Component mapping for dynamic rendering
const COMPONENT_MAP = {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ScatterChart,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  Scatter,
  ResponsiveContainer,
  // Table components
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
};

export const DynamicChartRenderer: React.FC<DynamicChartRendererProps> = ({
  config,
  className = "",
}) => {
  if (!config || !config.chartType || !config.data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Invalid chart configuration</p>
      </div>
    );
  }

  const renderComponent = (
    component: any,
    index: number,
    parentData?: any[],
  ): React.ReactElement | null => {
    const ComponentType =
      COMPONENT_MAP[component.type as keyof typeof COMPONENT_MAP];

    if (!ComponentType) {
      console.warn(`Unknown component type: ${component.type}`);
      return null;
    }

    const props = { ...component.props };

    // Special handling for different component types
    switch (component.type) {
      case "Line":
        // Auto-assign colors if not specified
        if (!props.stroke) {
          const colorIndex = index % CHART_COLORS.length;
          props.stroke = CHART_COLORS[colorIndex];
        }
        if (!props.strokeWidth) {
          props.strokeWidth = 2;
        }
        break;

      case "Bar":
        // Auto-assign colors if not specified
        if (!props.fill) {
          const colorIndex = index % CHART_COLORS.length;
          props.fill = CHART_COLORS[colorIndex];
        }
        break;

      case "Area":
        // Auto-assign colors if not specified
        if (!props.fill) {
          const colorIndex = index % CHART_COLORS.length;
          props.fill = CHART_COLORS[colorIndex];
        }
        if (!props.stroke) {
          props.stroke = props.fill;
        }
        break;

      case "Pie":
        // Handle pie chart data and colors
        if (parentData && !props.data) {
          props.data = parentData;
        }
        if (!props.cx) props.cx = "50%";
        if (!props.cy) props.cy = "50%";
        if (!props.outerRadius) props.outerRadius = 100;
        break;

      case "Cell":
        // Cells are handled specially in renderChart
        break;

      case "Scatter":
        // Auto-assign colors if not specified
        if (!props.fill) {
          const colorIndex = index % CHART_COLORS.length;
          props.fill = CHART_COLORS[colorIndex];
        }
        break;
    }

    return React.createElement(ComponentType as any, {
      key: `${component.type}-${index}`,
      ...props,
    });
  };

  // Special handling for TableChart
  const renderTableChart = () => {
    if (!config.data || config.data.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No data available</p>
        </div>
      );
    }

    const columns = Object.keys(config.data[0] || {});
    const maxRows = config.chartProps?.maxRows || 100;
    const displayData = config.data.slice(0, maxRows);

    const formatCellValue = (value: any): string => {
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "object") {
        return JSON.stringify(value);
      }
      if (typeof value === "number") {
        return value.toLocaleString();
      }
      return String(value);
    };

    return (
      <div className="max-h-[400px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="font-semibold">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column} className="font-mono text-sm">
                    {formatCellValue(row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {config.data.length > maxRows && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Showing {maxRows} of {config.data.length} rows
          </p>
        )}
      </div>
    );
  };

  const renderChart = () => {
    // Special handling for TableChart first
    if (config.chartType === "TableChart") {
      return renderTableChart();
    }

    const ChartComponent =
      COMPONENT_MAP[config.chartType as keyof typeof COMPONENT_MAP];

    if (!ChartComponent) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Unsupported chart type: {config.chartType}</p>
        </div>
      );
    }

    // Filter components by type
    const containerComponent = config.components.find(
      (c) => c.type === "ResponsiveContainer",
    );
    const otherComponents = config.components.filter(
      (c) => c.type !== "ResponsiveContainer",
    ); // Special handling for PieChart with Cell components
    const renderPieChart = () => {
      const pieComponent = otherComponents.find((c) => c.type === "Pie");
      const nonPieComponents = otherComponents.filter((c) => c.type !== "Pie");

      const children = [
        ...nonPieComponents.map((comp, idx) =>
          renderComponent(comp, idx, config.data),
        ),
        pieComponent &&
          React.createElement(
            Pie as any,
            {
              key: "pie",
              data: config.data,
              cx: "50%",
              cy: "50%",
              outerRadius: 100,
              dataKey: "value",
              nameKey: "name",
              ...pieComponent.props,
            },
            config.data.map((_, idx) =>
              React.createElement(Cell as any, {
                key: `cell-${idx}`,
                fill: CHART_COLORS[idx % CHART_COLORS.length],
              }),
            ),
          ),
      ].filter(Boolean);

      return React.createElement(
        ChartComponent as any,
        {
          ...config.chartProps,
          data: config.data,
        },
        children,
      );
    };

    const chartElement =
      config.chartType === "PieChart"
        ? renderPieChart()
        : config.chartType === "TableChart"
          ? renderTableChart()
          : React.createElement(
              ChartComponent as any,
              {
                ...config.chartProps,
                data: config.data,
              },
              otherComponents.map((comp, idx) =>
                renderComponent(comp, idx, config.data),
              ),
            );

    // Wrap with ResponsiveContainer if specified
    if (containerComponent) {
      return React.createElement(
        ResponsiveContainer as any,
        {
          ...containerComponent.props,
        },
        chartElement,
      );
    }

    return chartElement;
  };

  return <div className={`w-full h-full ${className}`}>{renderChart()}</div>;
};

export default DynamicChartRenderer;
