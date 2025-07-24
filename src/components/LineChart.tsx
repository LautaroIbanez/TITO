'use client';
import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, ChartData } from 'chart.js/auto';

interface LineChartProps {
  data: any[];
  title: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
  multiSeries?: boolean;
  seriesLabels?: Record<string, string>;
  seriesColors?: Record<string, string>;
}

export default function LineChart({ 
  data, 
  title, 
  xLabel = 'Fecha', 
  yLabel = 'Valor', 
  color = '#3B82F6',
  height = 300,
  multiSeries = false,
  seriesLabels = {},
  seriesColors = {}
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

    // Process data for multi-series
    let processedData: any[] = [];
    
    if (multiSeries) {
      // Group data by date and create series
      const dateMap = new Map<string, any>();
      
      data.forEach(item => {
        const fecha = item.fecha;
        if (!dateMap.has(fecha)) {
          dateMap.set(fecha, { fecha });
        }
        
        // Add each series value to the date entry
        Object.keys(item).forEach(key => {
          if (key !== 'fecha') {
            const value = item[key];
            if (typeof value === 'number') {
              dateMap.get(fecha)[key] = value;
            }
          }
        });
      });
      
      processedData = Array.from(dateMap.values()).sort((a, b) => 
        new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
    } else {
      processedData = data;
    }

    const chartData: ChartData<'line'> = {
      labels: processedData.map(item => {
        const date = new Date(item.fecha);
        return date.toLocaleDateString('es-AR', { 
          day: '2-digit',
          month: 'short',
          year: '2-digit'
        });
      }),
      datasets: multiSeries ? 
        // Multi-series mode
        Object.keys(processedData[0] || {}).filter(key => key !== 'fecha').map(seriesKey => ({
          label: seriesLabels[seriesKey] || seriesKey,
          data: processedData.map(item => {
            const value = item[seriesKey];
            return typeof value === 'number' ? value : null;
          }),
          borderColor: seriesColors[seriesKey] || color,
          backgroundColor: (seriesColors[seriesKey] || color) + '20',
          borderWidth: 3,
          fill: false,
          tension: 0.2,
          pointBackgroundColor: seriesColors[seriesKey] || color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointHoverBorderWidth: 3,
          spanGaps: true, // Connect points even if some data is missing
        })) :
        // Single series mode
        [{
          label: title,
          data: processedData.map(item => {
            // For single series, look for 'valor' or take the first non-fecha key
            if ('valor' in item) {
              return item.valor;
            }
            const keys = Object.keys(item).filter(key => key !== 'fecha');
            return keys.length > 0 ? item[keys[0]] : null;
          }),
          borderColor: color,
          backgroundColor: color + '20',
          borderWidth: 3,
          fill: false,
          tension: 0.2,
          pointBackgroundColor: color,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8,
          pointHoverBorderWidth: 3,
        }],
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
              size: 18,
              weight: 'bold',
            },
            color: '#374151',
            padding: 20,
          },
          legend: {
            display: multiSeries,
            position: 'top' as const,
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                weight: 'bold',
              },
              generateLabels: (chart) => {
                const datasets = chart.data.datasets;
                return datasets.map((dataset, index) => ({
                  text: dataset.label || `Serie ${index + 1}`,
                  fillStyle: dataset.borderColor as string,
                  strokeStyle: dataset.borderColor as string,
                  lineWidth: 2,
                  pointStyle: 'circle',
                  hidden: !chart.isDatasetVisible(index),
                  index: index,
                }));
              },
            },
          },
          tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#ffffff',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              title: (tooltipItems) => {
                const dataIndex = tooltipItems[0]?.dataIndex;
                if (dataIndex !== undefined && processedData[dataIndex]) {
                  const date = new Date(processedData[dataIndex].fecha);
                  return date.toLocaleDateString('es-AR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                }
                return '';
              },
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                
                // Format value based on context
                if (title.toLowerCase().includes('dólar') || title.toLowerCase().includes('precio')) {
                  return `${label}: $${value?.toLocaleString('es-AR')} ARS`;
                } else if (title.toLowerCase().includes('inflación') || title.toLowerCase().includes('rendimiento')) {
                  return `${label}: ${value?.toFixed(2)}%`;
                } else {
                  return `${label}: ${value?.toLocaleString('es-AR')}`;
                }
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
              font: {
                size: 14,
                weight: 'bold',
              },
            },
            grid: {
              color: '#E5E7EB',
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 12,
              },
              maxTicksLimit: 10,
            },
          },
          y: {
            title: {
              display: true,
              text: yLabel,
              color: '#6B7280',
              font: {
                size: 14,
                weight: 'bold',
              },
            },
            grid: {
              color: '#E5E7EB',
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 12,
              },
              callback: function(value) {
                // Format based on context
                if (title.toLowerCase().includes('dólar') || title.toLowerCase().includes('precio')) {
                  return `$${Number(value).toLocaleString('es-AR')}`;
                } else if (title.toLowerCase().includes('inflación') || title.toLowerCase().includes('rendimiento')) {
                  return `${value}%`;
                }
                return value;
              },
            },
            beginAtZero: false,
          },
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        elements: {
          point: {
            hoverBackgroundColor: (context) => {
              const dataset = context.dataset;
              return dataset.borderColor as string;
            },
            hoverBorderColor: '#ffffff',
            hoverBorderWidth: 3,
          },
          line: {
            borderWidth: 3,
          },
        },
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
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
  }, [data, title, xLabel, yLabel, color, multiSeries, seriesLabels, seriesColors]);

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