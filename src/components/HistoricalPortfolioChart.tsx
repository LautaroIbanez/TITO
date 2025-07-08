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
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-dayjs-4';
import dayjs from 'dayjs';
import type { DailyPortfolioRecord } from '@/utils/portfolioHistory';

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

export default function HistoricalPortfolioChart({ records }: Props) {
  if (!records || records.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico del Portafolio</h3>
        <p className="text-gray-500 text-center py-8">No hay datos históricos disponibles</p>
      </div>
    );
  }

  const labels = records.map((r) => dayjs(r.fecha).toDate());

  const chartData = {
    labels,
    datasets: [
      // ARS
      {
        label: 'Total ARS',
        data: records.map((r) => r.total_portfolio_ars),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        fill: false,
        yAxisID: 'ARS',
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Invertido ARS',
        data: records.map((r) => r.capital_invertido_ars),
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.08)',
        fill: false,
        yAxisID: 'ARS',
        pointRadius: 0,
        borderDash: [4, 2],
        tension: 0.2,
      },
      {
        label: 'Ganancia Neta ARS',
        data: records.map((r) => r.ganancias_netas_ars),
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.08)',
        fill: false,
        yAxisID: 'ARS',
        pointRadius: 0,
        borderDash: [2, 2],
        tension: 0.2,
      },
      {
        label: 'Efectivo ARS',
        data: records.map((r) => r.efectivo_disponible_ars),
        borderColor: '#f59e42',
        backgroundColor: 'rgba(245,158,66,0.08)',
        fill: false,
        yAxisID: 'ARS',
        pointRadius: 0,
        borderDash: [1, 2],
        tension: 0.2,
      },
      // USD
      {
        label: 'Total USD',
        data: records.map((r) => r.total_portfolio_usd),
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129,140,248,0.08)',
        fill: false,
        yAxisID: 'USD',
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Invertido USD',
        data: records.map((r) => r.capital_invertido_usd),
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244,114,182,0.08)',
        fill: false,
        yAxisID: 'USD',
        pointRadius: 0,
        borderDash: [4, 2],
        tension: 0.2,
      },
      {
        label: 'Ganancia Neta USD',
        data: records.map((r) => r.ganancias_netas_usd),
        borderColor: '#facc15',
        backgroundColor: 'rgba(250,204,21,0.08)',
        fill: false,
        yAxisID: 'USD',
        pointRadius: 0,
        borderDash: [2, 2],
        tension: 0.2,
      },
      {
        label: 'Efectivo USD',
        data: records.map((r) => r.efectivo_disponible_usd),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14,165,233,0.08)',
        fill: false,
        yAxisID: 'USD',
        pointRadius: 0,
        borderDash: [1, 2],
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: { enabled: true },
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
      },
      USD: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: { display: true, text: 'USD' },
        grid: { drawOnChartArea: false },
      },
    },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico del Portafolio</h3>
      <div className="h-96">
        <Line data={chartData} options={chartOptions} height={360} className="w-full" />
      </div>
    </div>
  );
} 