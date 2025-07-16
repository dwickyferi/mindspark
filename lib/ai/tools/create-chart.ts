import { tool } from 'ai';
import { z } from 'zod';
import { generateUUID } from '@/lib/utils';
import type { Session } from 'next-auth';

const createChartSchema = z.object({
  title: z.string().describe('The title of the chart'),
  type: z.enum(['line', 'bar', 'pie', 'scatter', 'area']).describe('The type of chart to create'),
  data: z.union([
    // For pie charts
    z.object({
      data: z.array(z.object({
        name: z.string(),
        value: z.number()
      }))
    }),
    // For other chart types
    z.object({
      categories: z.array(z.string()),
      series: z.array(z.object({
        name: z.string(),
        data: z.array(z.number())
      }))
    })
  ]).describe('The data for the chart'),
  description: z.string().optional().describe('Optional description of the chart')
});

export const createChart = ({
  session,
}: {
  session: Session;
}) => {
  return tool({
    description: 'Create interactive charts and visualizations with various chart types including line, bar, pie, scatter, and area charts.',
    inputSchema: createChartSchema,
    execute: async ({ title, type, data, description }) => {
      const id = generateUUID();
      
      // Validate data structure based on chart type
      if (type === 'pie') {
        if (!('data' in data)) {
          throw new Error('Pie charts require data in format: { data: [{ name: string, value: number }] }');
        }
      } else {
        if (!('categories' in data && 'series' in data)) {
          throw new Error(`${type} charts require data in format: { categories: string[], series: [{ name: string, data: number[] }] }`);
        }
      }

      const chartData = {
        id,
        title,
        type,
        data,
        description,
        createdAt: new Date().toISOString(),
        createdBy: session.user?.name || 'Unknown'
      };

      return {
        id,
        title,
        type,
        data,
        description,
        success: true,
        message: `Successfully created ${type} chart: "${title}"`
      };
    },
  });
};
