import React from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Tooltip, 
  Legend, 
  Filler, 
  TooltipItem,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-dayjs-4';
import dayjs from 'dayjs';
import { formatCurrency } from '@/utils/goalCalculator';

ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Tooltip, 
  Legend, 
  Filler,
  TimeScale
);

interface Props {
  valueHistory: { date: string; value: number }[];
  currency: 'ARS' | 'USD';
  title?: string;
}

export default function PortfolioValueChart({ valueHistory, currency, title = 'Evolución del Valor del Portafolio' }: Props) {
  if (!valueHistory || valueHistory.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No hay datos históricos disponibles</p>
      </div>
    );
  }

  const chartData = {
    datasets: [
      {
        label: `Valor del Portafolio (${currency})`,
        data: valueHistory.map((d) => ({
          x: dayjs(d.date).toDate(),
          y: d.value
        })),
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { 
      legend: { 
        display: true,
        position: 'top' as const,
      }, 
      tooltip: { 
        enabled: true,
        callbacks: {
          label: function(tooltipItem: TooltipItem<'line'>) {
            return `${tooltipItem.dataset.label}: ${formatCurrency(tooltipItem.parsed.y, currency)}`;
          }
        }
      } 
    },
    scales: { 
      x: { 
        type: 'time' as const,
        display: true,
        time: {
          parser: 'YYYY-MM-DD',
          unit: 'day' as const,
          displayFormats: {
            day: 'YYYY-MM-DD'
          }
        },
        title: {
          display: true,
          text: 'Fecha'
        },
        ticks: {
          source: 'auto' as const,
          maxTicksLimit: 10
        }
      }, 
      y: { 
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: `Valor (${currency})`
        }
      } 
    },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };

  const currentValue = valueHistory[valueHistory.length - 1]?.value || 0;
  const firstValue = valueHistory[0]?.value || 0;
  const change = currentValue - firstValue;
  const changePercentage = firstValue > 0 ? (change / firstValue) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">Evolución del valor total del portafolio en el tiempo</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(currentValue, currency)}</div>
          <div className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{formatCurrency(change, currency)} ({changePercentage >= 0 ? '+' : ''}{changePercentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartData} options={chartOptions} height={240} className="w-full" />
      </div>
    </div>
  );
} 