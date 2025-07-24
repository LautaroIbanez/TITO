'use client';
import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, ChartData } from 'chart.js/auto';

interface LineChartProps {
  data: Array<{ fecha: string; valor: number }>;
  title: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
}

export default function LineChart({ 
  data, 
  title, 
  xLabel = 'Fecha', 
  yLabel = 'Valor', 
  color = '#3B82F6',
  height = 300 
}: LineChartProps) {
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

    const chartData: ChartData<'line'> = {
      labels: data.map(item => {
        const date = new Date(item.fecha);
        return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      }),
      datasets: [
        {
          label: title,
          data: data.map(item => item.valor),
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointBackgroundColor: color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: chartData,
      options: {
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
              callback: function(value) {
                return value + '%';
              },
            },
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        elements: {
          point: {
            hoverBackgroundColor: color,
          },
        },
      },
    };

    chartInstance.current = new Chart(ctx, config);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, title, xLabel, yLabel, color]);

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