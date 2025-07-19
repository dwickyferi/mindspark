'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, ScatterChart } from 'echarts/charts';
import { 
  TitleComponent, 
  TooltipComponent, 
  LegendComponent, 
  GridComponent 
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useTheme } from 'next-themes';

// Register the required components
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  LineChart,
  BarChart,
  PieChart,
  ScatterChart,
  CanvasRenderer
]);

export interface ChartData {
  categories?: string[];
  series?: Array<{
    name: string;
    data: number[];
    type?: 'line' | 'bar' | 'scatter' | 'area';
  }>;
  data?: Array<{
    name: string;
    value: number;
  }>;
}

export interface ChartProps {
  title?: string;
  data: ChartData;
  type?: 'line' | 'bar' | 'pie' | 'scatter' | 'area';
  width?: number;
  height?: number;
  className?: string;
  isLoading?: boolean;
}

// Loading skeleton component
const ChartSkeleton = ({ height = 300 }: { height?: number }) => (
  <div className="flex flex-col gap-4 rounded-2xl p-4 border dark:border-gray-700 bg-white dark:bg-gray-900">
    <div className="flex flex-row justify-between items-center">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
    </div>
    
    <div 
      className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse flex items-center justify-center"
      style={{ height: `${height}px` }}
    >
      <div className="text-gray-400 dark:text-gray-500 text-sm">
        Generating chart...
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
    </div>
  </div>
);

export function Charts({ 
  title = 'Chart', 
  data, 
  type = 'line', 
  width = 500, 
  height = 300, 
  className = '',
  isLoading = false,
}: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  // Create chart option based on type and data
  const createChartOption = (chartData: ChartData, chartType: string, isDark: boolean) => {
    const commonTheme = {
      textColor: isDark ? '#ffffff' : '#333333',
      axisColor: isDark ? '#6b7280' : '#d1d5db',
      axisLabelColor: isDark ? '#9ca3af' : '#6b7280',
      splitLineColor: isDark ? '#374151' : '#f3f4f6',
      tooltipBg: isDark ? '#1f2937' : '#ffffff',
      tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    };

    const baseOption = {
      title: {
        text: title,
        left: 'center',
        textStyle: { color: commonTheme.textColor },
      },
      tooltip: {
        backgroundColor: commonTheme.tooltipBg,
        borderColor: commonTheme.tooltipBorder,
        textStyle: { color: commonTheme.textColor },
      },
      legend: {
        bottom: 0,
        textStyle: { color: commonTheme.textColor },
      },
      animation: true,
      animationDuration: 750,
      animationEasing: 'cubicOut' as const,
    };

    // Pie chart
    if (chartType === 'pie') {
      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'item',
          formatter: '{b}: {c} ({d}%)',
        },
        legend: {
          ...baseOption.legend,
          orient: 'vertical',
          left: 'left',
        },
        series: [{
          name: title,
          type: 'pie',
          radius: '60%',
          center: ['50%', '50%'],
          data: chartData.data || [],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      };
    }

    // Scatter chart
    if (chartType === 'scatter') {
      return {
        ...baseOption,
        tooltip: {
          ...baseOption.tooltip,
          trigger: 'item',
        },
        xAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: commonTheme.axisColor } },
          axisLabel: { color: commonTheme.axisLabelColor },
          splitLine: { lineStyle: { color: commonTheme.splitLineColor } },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: commonTheme.axisColor } },
          axisLabel: { color: commonTheme.axisLabelColor },
          splitLine: { lineStyle: { color: commonTheme.splitLineColor } },
        },
        series: (chartData.series || []).map(serie => ({
          name: serie.name,
          type: 'scatter',
          data: serie.data.map((value, index) => [index, value]),
          symbolSize: 8,
        }))
      };
    }

    // Line, Bar, Area charts
    return {
      ...baseOption,
      tooltip: {
        ...baseOption.tooltip,
        trigger: 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: chartData.categories || [],
        axisLine: { lineStyle: { color: commonTheme.axisColor } },
        axisLabel: { color: commonTheme.axisLabelColor },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: commonTheme.axisColor } },
        axisLabel: { color: commonTheme.axisLabelColor },
        splitLine: { lineStyle: { color: commonTheme.splitLineColor } },
      },
      series: (chartData.series || []).map(serie => ({
        name: serie.name,
        type: chartType === 'area' ? 'line' : chartType,
        data: serie.data,
        smooth: chartType === 'line' || chartType === 'area',
        areaStyle: chartType === 'area' ? {} : undefined,
      }))
    };
  };

  useEffect(() => {
    if (!chartRef.current || !data || isLoading) return;

    // Clean up previous chart
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    // Initialize new chart
    const chart = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined);
    chartInstance.current = chart;

    // Set chart option
    const option = createChartOption(data, type, theme === 'dark');
    chart.setOption(option);

    // Handle resize
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data, type, theme, title, isLoading, createChartOption]);

  // Show loading skeleton when data is being generated
  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  return (
    <div className={`flex flex-col gap-4 rounded-2xl p-4 border dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}>
      <div className="flex flex-row justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
          {type.charAt(0).toUpperCase() + type.slice(1)} Chart
        </div>
      </div>
      
      <div className="w-full">
        <div
          ref={chartRef}
          style={{ width: '100%', height: `${height}px` }}
          className="min-h-[300px]"
        />
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>Interactive chart powered by Apache ECharts</p>
      </div>
    </div>
  );
}

// Utility function to create chart data from various formats
export function createChartData(
  rawData: any,
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' = 'line'
): ChartData {
  if (type === 'pie') {
    if (Array.isArray(rawData)) {
      return {
        data: rawData.map((item, index) => ({
          name: item.name || `Item ${index + 1}`,
          value: typeof item === 'number' ? item : item.value || 0
        }))
      };
    }
  }

  if (Array.isArray(rawData)) {
    return {
      categories: rawData.map((_, index) => `Item ${index + 1}`),
      series: [{
        name: 'Data',
        data: rawData.map(item => typeof item === 'number' ? item : item.value || 0),
      }]
    };
  }

  return {
    categories: ['No Data'],
    series: [{ name: 'Data', data: [0] }]
  };
}
