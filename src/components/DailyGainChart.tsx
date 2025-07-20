import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  TimeScale,
  TooltipItem
} from 'chart.js';
import 'chartjs-adapter-dayjs-4';
import dayjs from 'dayjs';
import type { DailyPortfolioRecord } from '@/utils/portfolioHistory';
import { formatCurrency } from '@/utils/goalCalculator';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  TimeScale
);

interface Props {
  records: DailyPortfolioRecord[];
  currency?: 'ARS' | 'USD';
}

function isValidRecord(r: DailyPortfolioRecord) {
  if (!r.fecha || typeof r.fecha !== 'string') {
    return false;
  }

  return [
    r.total_portfolio_ars,
    r.total_portfolio_usd,
  ].every(
    (v) => v !== null && v !== undefined && Number.isFinite(v)
  );
}

export default function DailyGainChart({ records, currency = 'ARS' }: Props) {
  // Sort records by fecha and filter out invalid ones
  const sortedAndFilteredRecords = (records || [])
    .filter(isValidRecord)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  if (!sortedAndFilteredRecords || sortedAndFilteredRecords.length < 2) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ganancia Diaria</h3>
        <p className="text-gray-500 text-center py-8">Se necesitan al menos 2 días de datos para calcular ganancias diarias</p>
      </div>
    );
  }

  // Calculate daily gains
  const dailyGains: { date: string; gain: number; percentage: number }[] = [];
  
  for (let i = 1; i < sortedAndFilteredRecords.length; i++) {
    const current = sortedAndFilteredRecords[i];
    const previous = sortedAndFilteredRecords[i - 1];
    
    const currentTotal = currency === 'ARS' ? current.total_portfolio_ars : current.total_portfolio_usd;
    const previousTotal = currency === 'ARS' ? previous.total_portfolio_ars : previous.total_portfolio_usd;
    
    const gain = currentTotal - previousTotal;
    const percentage = previousTotal !== 0 ? (gain / previousTotal) * 100 : 0;
    
    dailyGains.push({
      date: current.fecha,
      gain,
      percentage
    });
  }

  const labels = dailyGains.map(d => dayjs(d.date).toDate());
  const gainData = dailyGains.map(d => d.gain);
  const percentageData = dailyGains.map(d => d.percentage);

  // Calculate colors based on positive/negative gains
  const backgroundColor = gainData.map(gain => 
    gain >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
  );
  
  const borderColor = gainData.map(gain => 
    gain >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)'
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: `Ganancia Diaria ${currency}`,
        data: gainData,
        backgroundColor,
        borderColor,
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      },
      {
        label: `Porcentaje Diario (%)`,
        data: percentageData,
        backgroundColor: percentageData.map(p => 
          p >= 0 ? 'rgba(59, 130, 246, 0.7)' : 'rgba(245, 101, 101, 0.7)'
        ),
        borderColor: percentageData.map(p => 
          p >= 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(245, 101, 101, 1)'
        ),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
        yAxisID: 'percentage',
      }
    ],
  };

  // Calculate Y-axis scaling for gains
  const gainValues = gainData.filter(v => Number.isFinite(v));
  const gainMin = Math.min(...gainValues);
  const gainMax = Math.max(...gainValues);
  const gainRange = gainMax - gainMin;
  const gainPadding = gainRange * 0.1;

  // Calculate Y-axis scaling for percentages
  const percentageValues = percentageData.filter(v => Number.isFinite(v));
  const percentageMin = Math.min(...percentageValues);
  const percentageMax = Math.max(...percentageValues);
  const percentageRange = percentageMax - percentageMin;
  const percentagePadding = percentageRange * 0.1;

  const chartOptions = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { 
        display: true, 
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: TooltipItem<'bar'>) => {
            if (context.datasetIndex === 0) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y, currency)}`;
            } else {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}%`;
            }
          },
          title: (context: TooltipItem<'bar'>[]) =>
            `Fecha: ${dayjs(context[0]?.parsed.x).format('YYYY-MM-DD')}`,
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'day' as const },
        title: { display: true, text: 'Fecha' },
        grid: {
          display: false,
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: `Ganancia ${currency}` },
        min: gainMin - gainPadding,
        max: gainMax + gainPadding,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      percentage: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'Porcentaje (%)' },
        min: percentageMin - percentagePadding,
        max: percentageMax + percentagePadding,
        grid: {
          drawOnChartArea: false,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };

  // Calculate summary statistics
  const positiveGains = gainData.filter(g => g > 0);
  const totalGain = gainData.reduce((sum, gain) => sum + gain, 0);
  const avgGain = gainData.length > 0 ? totalGain / gainData.length : 0;
  const winRate = gainData.length > 0 ? (positiveGains.length / gainData.length) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ganancia Diaria</h3>
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Ganancia Total</p>
          <p className={`text-lg font-semibold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalGain, currency)}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Promedio Diario</p>
          <p className={`text-lg font-semibold ${avgGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(avgGain, currency)}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Días Positivos</p>
          <p className="text-lg font-semibold text-green-600">
            {positiveGains.length} / {gainData.length}
          </p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">Tasa de Éxito</p>
          <p className="text-lg font-semibold text-blue-600">
            {winRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <Bar data={chartData} options={chartOptions} height={300} className="w-full" />
      </div>

      {/* Legend */}
      <div className="mt-4 text-sm text-gray-600">
        <p><span className="inline-block w-3 h-3 bg-green-500 rounded mr-2"></span>Días con ganancia</p>
        <p><span className="inline-block w-3 h-3 bg-red-500 rounded mr-2"></span>Días con pérdida</p>
      </div>
    </div>
  );
} 