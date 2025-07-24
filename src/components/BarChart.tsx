'use client';
import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, ChartData } from 'chart.js/auto';

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  title: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
}

export default function BarChart({ 
  data, 
  title, 
  xLabel = 'Valor', 
  yLabel = 'Categoría', 
  color = '#10B981',
  height = 400,
  formatValue = (value: number) => value.toFixed(2) + '%'
}: BarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Destroy previous chart instance
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const chartData: ChartData<'bar'> = {
      labels: data.map(item => item.label),
      datasets: [
        {
          label: title,
          data: data.map(item => item.value),
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: chartData,
      options: {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16,
              weight: 'bold',
            },
            color: '#374151',
          },
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return formatValue(context.parsed.x);
              },
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: xLabel,
              color: '#6B7280',
            },
            grid: {
              color: '#E5E7EB',
            },
            ticks: {
              color: '#6B7280',
              callback: function(value) {
                return formatValue(value as number);
              },
            },
          },
          y: {
            title: {
              display: true,
              text: yLabel,
              color: '#6B7280',
            },
            grid: {
              color: '#E5E7EB',
            },
            ticks: {
              color: '#6B7280',
              maxRotation: 0,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, title, xLabel, yLabel, color, formatValue]);

  if (!data.length) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">No hay datos disponibles</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-800 mb-4">{title}</h3>
      <div style={{ height }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
} 