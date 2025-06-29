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
  valueHistory: { date: string; invested: number; total: number }[];
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
        label: `Valor del Portafolio Invertido (${currency})`,
        data: valueHistory.map((d) => ({
          x: dayjs(d.date).toDate(),
          y: d.invested
        })),
        fill: false,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.1)',
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: `Valor Total del Portafolio (${currency})`,
        data: valueHistory.map((d) => ({
          x: dayjs(d.date).toDate(),
          y: d.total
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

  const currentTotal = valueHistory[valueHistory.length - 1]?.total || 0;
  const currentInvested = valueHistory[valueHistory.length - 1]?.invested || 0;
  const firstTotal = valueHistory[0]?.total || 0;
  const firstInvested = valueHistory[0]?.invested || 0;
  const totalChange = currentTotal - firstTotal;
  const investedChange = currentInvested - firstInvested;
  const totalChangePercentage = firstTotal > 0 ? (totalChange / firstTotal) * 100 : 0;
  const investedChangePercentage = firstInvested > 0 ? (investedChange / firstInvested) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">Evolución del valor del portafolio en el tiempo</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(currentTotal, currency)}</div>
          <div className={`text-sm ${totalChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange, currency)} ({totalChangePercentage >= 0 ? '+' : ''}{totalChangePercentage.toFixed(2)}%)
          </div>
          <div className="text-sm text-gray-600">
            Invertido: {formatCurrency(currentInvested, currency)}
            <span className={`ml-2 ${investedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({investedChangePercentage >= 0 ? '+' : ''}{investedChangePercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartData} options={chartOptions} height={240} className="w-full" />
      </div>
    </div>
  );
} 