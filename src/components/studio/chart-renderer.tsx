"use client";

import React, { useMemo } from "react";
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
  Legend,
  Area,
  AreaChart as RechartsAreaChart,
} from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Configuration interfaces
export interface ChartStyleConfig {
  colors: string[];
  colorScheme: "default" | "blue" | "green" | "purple" | "red" | "orange";
  showDataLabels: boolean;
  enableGrid: boolean;
  enableLegend: boolean;
  enableTooltip: boolean;
  strokeWidth: number;
  borderRadius: number;
  opacity: number;
}

export interface ChartAxisConfig {
  xAxis: {
    dataKey: string;
    label?: string;
    showAxis: boolean;
    showTicks: boolean;
  };
  yAxis: {
    label?: string;
    showAxis: boolean;
    showTicks: boolean;
    domain?: [number, number] | ["auto", "auto"];
  };
}

export interface ChartConfigurationBase {
  type: "line" | "bar" | "pie" | "area";
  title: string;
  description?: string;
  style: ChartStyleConfig;
  axis: ChartAxisConfig;
  data: any[];
}

export interface LineChartConfiguration extends ChartConfigurationBase {
  type: "line";
  curve: "linear" | "monotone" | "step";
  showDots: boolean;
  connectNulls: boolean;
}

export interface BarChartConfiguration extends ChartConfigurationBase {
  type: "bar";
  orientation: "vertical" | "horizontal";
  stacked: boolean;
  maxBarSize?: number;
}

export interface PieChartConfiguration extends ChartConfigurationBase {
  type: "pie";
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  showLabels: boolean;
}

export interface AreaChartConfiguration extends ChartConfigurationBase {
  type: "area";
  stacked: boolean;
  curve: "linear" | "monotone" | "step";
}

export type ChartConfiguration =
  | LineChartConfiguration
  | BarChartConfiguration
  | PieChartConfiguration
  | AreaChartConfiguration;

// Color schemes
const COLOR_SCHEMES = {
  default: ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00"],
  blue: ["#1e40af", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"],
  green: ["#166534", "#16a34a", "#22c55e", "#4ade80", "#bbf7d0"],
  purple: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#e9d5ff"],
  red: ["#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca"],
  orange: ["#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"],
};

interface ChartRendererProps {
  config: ChartConfiguration;
  height?: number;
  className?: string;
}

export function ChartRenderer({
  config,
  height = 300,
  className,
}: ChartRendererProps) {
  const { data, style, axis } = config;

  // Generate Recharts configuration
  const chartConfig = useMemo(() => {
    const rechartConfig: ChartConfig = {};
    const colors = COLOR_SCHEMES[style.colorScheme] || COLOR_SCHEMES.default;

    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      keys.forEach((key, index) => {
        if (key !== axis.xAxis.dataKey) {
          rechartConfig[key] = {
            label: key,
            color: colors[index % colors.length],
          };
        }
      });
    }

    return rechartConfig;
  }, [data, style.colorScheme, axis.xAxis.dataKey]);

  const colors = COLOR_SCHEMES[style.colorScheme] || COLOR_SCHEMES.default;

  if (!data || data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-[${height}px] bg-muted/10 rounded-lg ${className}`}
      >
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  const renderChart = () => {
    switch (config.type) {
      case "line":
        return (
          <ChartContainer
            config={chartConfig}
            className={`h-[${height}px] w-full`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={data}>
                {style.enableGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis
                  dataKey={axis.xAxis.dataKey}
                  axisLine={axis.xAxis.showAxis}
                  tickLine={axis.xAxis.showTicks}
                  label={
                    axis.xAxis.label
                      ? {
                          value: axis.xAxis.label,
                          position: "insideBottom",
                          offset: -10,
                        }
                      : undefined
                  }
                />
                <YAxis
                  axisLine={axis.yAxis.showAxis}
                  tickLine={axis.yAxis.showTicks}
                  domain={axis.yAxis.domain}
                  label={
                    axis.yAxis.label
                      ? {
                          value: axis.yAxis.label,
                          angle: -90,
                          position: "insideLeft",
                        }
                      : undefined
                  }
                />
                {style.enableTooltip && (
                  <ChartTooltip content={<ChartTooltipContent />} />
                )}
                {style.enableLegend && <Legend />}
                {Object.keys(data[0] || {})
                  .filter((key) => key !== axis.xAxis.dataKey)
                  .map((key, index) => (
                    <Line
                      key={key}
                      type={(config as LineChartConfiguration).curve}
                      dataKey={key}
                      stroke={colors[index % colors.length]}
                      strokeWidth={style.strokeWidth}
                      dot={(config as LineChartConfiguration).showDots}
                      connectNulls={
                        (config as LineChartConfiguration).connectNulls
                      }
                      strokeOpacity={style.opacity}
                    />
                  ))}
              </RechartsLineChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "bar":
        const barConfig = config as BarChartConfiguration;
        return (
          <ChartContainer
            config={chartConfig}
            className={`h-[${height}px] w-full`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={data}
                layout={
                  barConfig.orientation === "horizontal"
                    ? "horizontal"
                    : "vertical"
                }
              >
                {style.enableGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis
                  type={
                    barConfig.orientation === "horizontal"
                      ? "number"
                      : "category"
                  }
                  dataKey={
                    barConfig.orientation === "horizontal"
                      ? undefined
                      : axis.xAxis.dataKey
                  }
                  axisLine={axis.xAxis.showAxis}
                  tickLine={axis.xAxis.showTicks}
                />
                <YAxis
                  type={
                    barConfig.orientation === "horizontal"
                      ? "category"
                      : "number"
                  }
                  dataKey={
                    barConfig.orientation === "horizontal"
                      ? axis.xAxis.dataKey
                      : undefined
                  }
                  axisLine={axis.yAxis.showAxis}
                  tickLine={axis.yAxis.showTicks}
                />
                {style.enableTooltip && (
                  <ChartTooltip content={<ChartTooltipContent />} />
                )}
                {style.enableLegend && <Legend />}
                {Object.keys(data[0] || {})
                  .filter((key) => key !== axis.xAxis.dataKey)
                  .map((key, index) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={colors[index % colors.length]}
                      fillOpacity={style.opacity}
                      radius={style.borderRadius}
                      maxBarSize={barConfig.maxBarSize}
                      stackId={barConfig.stacked ? "stack" : undefined}
                    />
                  ))}
              </RechartsBarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "pie":
        const pieConfig = config as PieChartConfiguration;
        const dataKeys = Object.keys(data[0] || {}).filter(
          (key) => key !== axis.xAxis.dataKey,
        );
        const valueKey = dataKeys[0]; // Use first non-x-axis key as value

        return (
          <ChartContainer
            config={chartConfig}
            className={`h-[${height}px] w-full`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                {style.enableTooltip && (
                  <ChartTooltip content={<ChartTooltipContent />} />
                )}
                <Pie
                  data={data}
                  dataKey={valueKey}
                  nameKey={axis.xAxis.dataKey}
                  cx="50%"
                  cy="50%"
                  innerRadius={pieConfig.innerRadius}
                  outerRadius={pieConfig.outerRadius}
                  startAngle={pieConfig.startAngle}
                  endAngle={pieConfig.endAngle}
                  fill="#8884d8"
                  label={pieConfig.showLabels}
                  fillOpacity={style.opacity}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                {style.enableLegend && <Legend />}
              </RechartsPieChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "area":
        const areaConfig = config as AreaChartConfiguration;
        return (
          <ChartContainer
            config={chartConfig}
            className={`h-[${height}px] w-full`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsAreaChart data={data}>
                {style.enableGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis
                  dataKey={axis.xAxis.dataKey}
                  axisLine={axis.xAxis.showAxis}
                  tickLine={axis.xAxis.showTicks}
                />
                <YAxis
                  axisLine={axis.yAxis.showAxis}
                  tickLine={axis.yAxis.showTicks}
                />
                {style.enableTooltip && (
                  <ChartTooltip content={<ChartTooltipContent />} />
                )}
                {style.enableLegend && <Legend />}
                {Object.keys(data[0] || {})
                  .filter((key) => key !== axis.xAxis.dataKey)
                  .map((key, index) => (
                    <Area
                      key={key}
                      type={areaConfig.curve}
                      dataKey={key}
                      stroke={colors[index % colors.length]}
                      fill={colors[index % colors.length]}
                      fillOpacity={style.opacity}
                      strokeWidth={style.strokeWidth}
                      stackId={areaConfig.stacked ? "stack" : undefined}
                    />
                  ))}
              </RechartsAreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      default:
        return (
          <div
            className={`flex items-center justify-center h-[${height}px] bg-muted/10 rounded-lg ${className}`}
          >
            <p className="text-muted-foreground">Unsupported chart type</p>
          </div>
        );
    }
  };

  return renderChart();
}

// Helper function to generate default configuration
export function generateDefaultConfig(
  data: any[],
  chartType: ChartConfiguration["type"],
): ChartConfiguration {
  if (!data || data.length === 0) {
    throw new Error("No data available for chart configuration");
  }

  const keys = Object.keys(data[0]);
  const xAxisKey = keys[0];

  const baseConfig = {
    title: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
    data,
    style: {
      colors: COLOR_SCHEMES.default,
      colorScheme: "default" as const,
      showDataLabels: false,
      enableGrid: true,
      enableLegend: true,
      enableTooltip: true,
      strokeWidth: 2,
      borderRadius: 4,
      opacity: 0.8,
    },
    axis: {
      xAxis: {
        dataKey: xAxisKey,
        showAxis: true,
        showTicks: true,
      },
      yAxis: {
        showAxis: true,
        showTicks: true,
        domain: ["auto", "auto"] as const,
      },
    },
  };

  switch (chartType) {
    case "line":
      return {
        ...baseConfig,
        type: "line",
        curve: "monotone",
        showDots: false,
        connectNulls: true,
      } as LineChartConfiguration;

    case "bar":
      return {
        ...baseConfig,
        type: "bar",
        orientation: "vertical",
        stacked: false,
      } as BarChartConfiguration;

    case "pie":
      return {
        ...baseConfig,
        type: "pie",
        innerRadius: 0,
        outerRadius: 80,
        startAngle: 0,
        endAngle: 360,
        showLabels: true,
        style: {
          ...baseConfig.style,
          enableGrid: false,
        },
      } as PieChartConfiguration;

    case "area":
      return {
        ...baseConfig,
        type: "area",
        stacked: false,
        curve: "monotone",
      } as AreaChartConfiguration;

    default:
      // Return a default line chart for unsupported types
      return {
        ...baseConfig,
        type: "line",
        curve: "monotone",
        showDots: false,
        connectNulls: true,
      } as LineChartConfiguration;
  }
}
