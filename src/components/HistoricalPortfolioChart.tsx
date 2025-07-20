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
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

interface Props {
  records: DailyPortfolioRecord[];
}

function isValidRecord(r: DailyPortfolioRecord) {
  // Check that fecha exists and is a valid string
  if (!r.fecha || typeof r.fecha !== 'string') {
    return false;
  }

  // Only require fecha, totals, invested, and cash to be finite
  // Allow ganancias_netas to be null/undefined
  return [
    r.total_portfolio_ars,
    r.total_portfolio_usd,
    r.capital_invertido_ars,
    r.capital_invertido_usd,
    r.efectivo_disponible_ars,
    r.efectivo_disponible_usd,
  ].every(
    (v) => v !== null && v !== undefined && Number.isFinite(v)
  );
}

export default function HistoricalPortfolioChart({ records }: Props) {
  // Sort records by fecha and filter out invalid ones
  const sortedAndFilteredRecords = (records || [])
    .filter(isValidRecord)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  if (!sortedAndFilteredRecords || sortedAndFilteredRecords.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico del Portafolio</h3>
        <p className="text-gray-500 text-center py-8">No hay datos históricos disponibles</p>
      </div>
    );
  }

  const labels = sortedAndFilteredRecords.map((r) => dayjs(r.fecha).toDate());

  // Compute gains as total_portfolio - capital_invertido instead of reading ganancias_netas
  const computedGainsARS = sortedAndFilteredRecords.map((r) => 
    r.total_portfolio_ars - r.capital_invertido_ars
  );
  const computedGainsUSD = sortedAndFilteredRecords.map((r) => 
    r.total_portfolio_usd - r.capital_invertido_usd
  );

  // Check if all computed gains are zero
  const allGainsZero = computedGainsARS.every(gain => gain === 0) && 
                      computedGainsUSD.every(gain => gain === 0);

  // Calculate Y-axis ranges with ±10% padding
  const arsValues = [
    ...sortedAndFilteredRecords.map(r => r.total_portfolio_ars),
    ...sortedAndFilteredRecords.map(r => r.capital_invertido_ars),
    ...computedGainsARS,
    ...sortedAndFilteredRecords.map(r => r.efectivo_disponible_ars)
  ].filter(v => Number.isFinite(v));
  
  const usdValues = [
    ...sortedAndFilteredRecords.map(r => r.total_portfolio_usd),
    ...sortedAndFilteredRecords.map(r => r.capital_invertido_usd),
    ...computedGainsUSD,
    ...sortedAndFilteredRecords.map(r => r.efectivo_disponible_usd)
  ].filter(v => Number.isFinite(v));

  const arsMin = Math.min(...arsValues);
  const arsMax = Math.max(...arsValues);
  const arsRange = arsMax - arsMin;
  const arsPadding = arsRange * 0.1;

  const usdMin = Math.min(...usdValues);
  const usdMax = Math.max(...usdValues);
  const usdRange = usdMax - usdMin;
  const usdPadding = usdRange * 0.1;

  // ARS datasets
  const arsChartData = {
    labels,
    datasets: [
      {
        label: 'Total ARS',
        data: sortedAndFilteredRecords.map((r) => r.total_portfolio_ars),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'ARS',
      },
      {
        label: 'Invertido ARS',
        data: sortedAndFilteredRecords.map((r) => r.capital_invertido_ars),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [4, 2],
        tension: 0.2,
        yAxisID: 'ARS',
      },
      {
        label: 'Ganancia Neta ARS',
        data: computedGainsARS,
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [2, 2],
        tension: 0.2,
        yAxisID: 'ARS',
      },
      {
        label: 'Efectivo ARS',
        data: sortedAndFilteredRecords.map((r) => r.efectivo_disponible_ars),
        borderColor: '#f59e42',
        backgroundColor: 'rgba(245,158,66,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [1, 2],
        tension: 0.2,
        yAxisID: 'ARS',
      },
    ],
  };

  // USD datasets
  const usdChartData = {
    labels,
    datasets: [
      {
        label: 'Total USD',
        data: sortedAndFilteredRecords.map((r) => r.total_portfolio_usd),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129,140,248,0.08)',
        fill: false,
        pointRadius: 0,
        tension: 0.2,
        yAxisID: 'USD',
      },
      {
        label: 'Invertido USD',
        data: sortedAndFilteredRecords.map((r) => r.capital_invertido_usd),
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244,114,182,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [4, 2],
        tension: 0.2,
        yAxisID: 'USD',
      },
      {
        label: 'Ganancia Neta USD',
        data: computedGainsUSD,
        borderColor: '#facc15',
        backgroundColor: 'rgba(250,204,21,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [2, 2],
        tension: 0.2,
        yAxisID: 'USD',
      },
      {
        label: 'Efectivo USD',
        data: sortedAndFilteredRecords.map((r) => r.efectivo_disponible_usd),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.08)',
        fill: false,
        pointRadius: 0,
        borderDash: [1, 2],
        tension: 0.2,
        yAxisID: 'USD',
      },
    ],
  };

  const arsChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: TooltipItem<'line'>) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y, 'ARS')}`,
          title: (context: TooltipItem<'line'>[]) =>
            `Fecha: ${dayjs(context[0]?.parsed.x).format('YYYY-MM-DD')}`,
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'day' as const },
        title: { display: true, text: 'Fecha' },
      },
      ARS: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'ARS' },
        min: arsMin - arsPadding,
        max: arsMax + arsPadding,
      },
    },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };

  const usdChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context: TooltipItem<'line'>) =>
            `${context.dataset.label}: ${formatCurrency(context.parsed.y, 'USD')}`,
          title: (context: TooltipItem<'line'>[]) =>
            `Fecha: ${dayjs(context[0]?.parsed.x).format('YYYY-MM-DD')}`,
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: { unit: 'day' as const },
        title: { display: true, text: 'Fecha' },
      },
      USD: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: { display: true, text: 'USD' },
        min: usdMin - usdPadding,
        max: usdMax + usdPadding,
      },
    },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico del Portafolio</h3>
      <div className="flex flex-col gap-8">
        <div className="h-80" data-testid="ars-chart-container">
          <h4 className="text-md font-semibold text-blue-700 mb-2">ARS</h4>
          <Line data={arsChartData} options={arsChartOptions} height={300} className="w-full" data-testid="ars-line-chart" />
        </div>
        <div className="h-80" data-testid="usd-chart-container">
          <h4 className="text-md font-semibold text-indigo-700 mb-2">USD</h4>
          <Line data={usdChartData} options={usdChartOptions} height={300} className="w-full" data-testid="usd-line-chart" />
        </div>
      </div>
      {allGainsZero && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            <strong>Advertencia:</strong> No se detectaron ganancias en este período. Verificá si los precios están actualizados.
          </p>
        </div>
      )}
    </div>
  );
} 