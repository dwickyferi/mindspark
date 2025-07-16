'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart, ScatterChart } from 'echarts/charts';
import { 
  TitleComponent, 
  TooltipComponent, 
  LegendComponent, 
  GridComponent 
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

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

import { Button } from './ui/button';
import { ChartIcon, BarChartIcon, LineChartIcon, PieChartIcon, ScatterChartIcon, AreaChartIcon } from './icons';
import { useTheme } from 'next-themes';

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
  animationDuration?: number;
}

export function Charts({ 
  title = 'Chart Example', 
  data, 
  type = 'line', 
  width = 500, 
  height = 300, 
  className = '',
  isLoading = false,
  animationDuration = 1000,
}: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [currentType, setCurrentType] = useState<'line' | 'bar' | 'pie' | 'scatter' | 'area'>(type);
  const [currentData, setCurrentData] = useState<ChartData>(data);
  const { theme } = useTheme();

  // Add a loading pulse animation wrapper
  const LoadingWrapper = ({ children }: { children: React.ReactNode }) => {
    if (!isLoading) return <>{children}</>;
    
    return (
      <div className="relative">
        {/* Enhanced loading overlay for AI thinking phase */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-500/20 to-blue-500/10 animate-pulse rounded-lg z-10" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/5 to-transparent animate-pulse rounded-lg z-10" style={{ animationDelay: '0.5s' }} />
        
        {/* Loading indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 z-20 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full backdrop-blur-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
          <span className="font-medium">AI is thinking...</span>
        </div>
        
        {/* Dimmed content during loading */}
        <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
          {children}
        </div>
      </div>
    );
  };

  const generateChartOption = useCallback((data: ChartData, chartType: string, isDark: boolean) => {
    const baseOption = {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          color: isDark ? '#ffffff' : '#333333',
        },
      },
      tooltip: {
        trigger: 'axis' as const,
        backgroundColor: isDark ? '#1f2937' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        textStyle: {
          color: isDark ? '#ffffff' : '#333333',
        },
      },
      legend: {
        orient: 'horizontal' as const,
        bottom: 0,
        textStyle: {
          color: isDark ? '#ffffff' : '#333333',
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category' as const,
        data: data.categories || [],
        axisLine: {
          lineStyle: {
            color: isDark ? '#6b7280' : '#d1d5db',
          },
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
      },
      yAxis: {
        type: 'value' as const,
        axisLine: {
          lineStyle: {
            color: isDark ? '#6b7280' : '#d1d5db',
          },
        },
        axisLabel: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
        splitLine: {
          lineStyle: {
            color: isDark ? '#374151' : '#f3f4f6',
          },
        },
      },
      series: [] as any[],
    };

    if (chartType === 'pie') {
      return {
        title: baseOption.title,
        tooltip: {
          trigger: 'item' as const,
          formatter: '{a} <br/>{b} : {c} ({d}%)',
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          textStyle: {
            color: isDark ? '#ffffff' : '#333333',
          },
        },
        legend: {
          orient: 'vertical' as const,
          left: 'left',
          textStyle: {
            color: isDark ? '#ffffff' : '#333333',
          },
        },
        series: [
          {
            name: 'Chart Data',
            type: 'pie',
            radius: '50%',
            data: data.data || [],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };
    }

    if (chartType === 'scatter') {
      return {
        title: baseOption.title,
        tooltip: {
          trigger: 'item' as const,
          formatter: '{a} <br/>{b} : {c}',
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          borderColor: isDark ? '#374151' : '#e5e7eb',
          textStyle: {
            color: isDark ? '#ffffff' : '#333333',
          },
        },
        xAxis: {
          type: 'value' as const,
          axisLine: {
            lineStyle: {
              color: isDark ? '#6b7280' : '#d1d5db',
            },
          },
          axisLabel: {
            color: isDark ? '#9ca3af' : '#6b7280',
          },
          splitLine: {
            lineStyle: {
              color: isDark ? '#374151' : '#f3f4f6',
            },
          },
        },
        yAxis: {
          type: 'value' as const,
          axisLine: {
            lineStyle: {
              color: isDark ? '#6b7280' : '#d1d5db',
            },
          },
          axisLabel: {
            color: isDark ? '#9ca3af' : '#6b7280',
          },
          splitLine: {
            lineStyle: {
              color: isDark ? '#374151' : '#f3f4f6',
            },
          },
        },
        series: data.series?.map((serie) => ({
          name: serie.name,
          data: serie.data.map((value, index) => [index * 10, value]),
          type: 'scatter',
          symbolSize: 6,
        })) || [],
      };
    }

    const seriesData = data.series?.map((serie) => ({
      name: serie.name,
      type: chartType === 'area' ? 'line' : chartType,
      data: serie.data,
      smooth: chartType === 'line' || chartType === 'area',
      areaStyle: chartType === 'area' ? {} : undefined,
    })) || [];

    return {
      ...baseOption,
      series: seriesData,
    };
  }, [title]);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    const chart = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : 'light');
    chartInstance.current = chart;

    const option = generateChartOption(currentData, currentType, theme === 'dark');
    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [currentData, currentType, theme, generateChartOption]);

  const handleTypeChange = (newType: 'line' | 'bar' | 'pie' | 'scatter' | 'area') => {
    setCurrentType(newType);
    // Keep the original data from AI, just change the chart type
  };

  return (
    <div className={`flex flex-col gap-4 rounded-2xl p-4 border dark:border-gray-700 bg-white dark:bg-gray-900 ${className}`}>
      <div className="flex flex-row justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="flex gap-2">
          <Button
            variant={currentType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('line')}
            className="p-2"
          >
            <LineChartIcon size={16} />
          </Button>
          <Button
            variant={currentType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('bar')}
            className="p-2"
          >
            <BarChartIcon size={16} />
          </Button>
          <Button
            variant={currentType === 'pie' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('pie')}
            className="p-2"
          >
            <PieChartIcon size={16} />
          </Button>
          <Button
            variant={currentType === 'scatter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('scatter')}
            className="p-2"
          >
            <ScatterChartIcon size={16} />
          </Button>
          <Button
            variant={currentType === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('area')}
            className="p-2"
          >
            <AreaChartIcon size={16} />
          </Button>
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
        <p>Switch between different chart types using the buttons above</p>
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
    const seriesType = type === 'pie' ? 'bar' : type;
    return {
      categories: rawData.map((_, index) => `Item ${index + 1}`),
      series: [{
        name: 'Data',
        data: rawData.map(item => typeof item === 'number' ? item : item.value || 0),
        type: seriesType
      }]
    };
  }

  const seriesType = type === 'pie' ? 'bar' : type;
  return {
    categories: ['No Data'],
    series: [{
      name: 'Data',
      data: [0],
      type: seriesType
    }]
  };
}
