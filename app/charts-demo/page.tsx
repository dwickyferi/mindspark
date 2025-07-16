'use client';

import { Charts, createChartData } from '@/components/charts';

const sampleLineData = {
  categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  series: [
    {
      name: 'Revenue',
      data: [1200, 1900, 3000, 5000, 3500, 4200],
      type: 'line' as const
    },
    {
      name: 'Expenses',
      data: [800, 1200, 1800, 2500, 2200, 2800],
      type: 'line' as const
    }
  ]
};

const sampleBarData = {
  categories: ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'],
  series: [
    {
      name: 'Q1 Sales',
      data: [20, 30, 25, 35, 40],
      type: 'bar' as const
    },
    {
      name: 'Q2 Sales',
      data: [25, 35, 30, 40, 45],
      type: 'bar' as const
    }
  ]
};

const samplePieData = {
  data: [
    { name: 'Desktop', value: 45.2 },
    { name: 'Mobile', value: 38.8 },
    { name: 'Tablet', value: 16.0 }
  ]
};

export default function ChartsDemo() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center mb-8">Charts Demo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Charts
          title="Revenue vs Expenses"
          data={sampleLineData}
          type="line"
          height={400}
        />
        
        <Charts
          title="Quarterly Sales"
          data={sampleBarData}
          type="bar"
          height={400}
        />
        
        <Charts
          title="Device Usage"
          data={samplePieData}
          type="pie"
          height={400}
        />
        
        <Charts
          title="Interactive Chart"
          data={createChartData([100, 200, 300, 400, 500], 'area')}
          type="area"
          height={400}
        />
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Features:</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Interactive charts powered by Apache ECharts</li>
          <li>Support for Line, Bar, Pie, Scatter, and Area charts</li>
          <li>Dark mode support</li>
          <li>Responsive design</li>
          <li>Easy chart type switching</li>
          <li>Customizable themes</li>
        </ul>
      </div>
    </div>
  );
}
