import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  valueHistory: { date: string; value: number }[];
}

export default function PortfolioHistoryChart({ valueHistory }: Props) {
  const chartData = {
    labels: valueHistory.map((d) => d.date),
    datasets: [
      {
        label: 'Valor del Portafolio',
        data: valueHistory.map((d) => d.value),
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: { x: { display: false }, y: { display: true } },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false,
    layout: { padding: 0 },
  };
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-2">Evolución del Valor del Portafolio</h3>
      {valueHistory.length > 0 ? (
        <div className="h-64"><Line data={chartData} options={chartOptions} className="w-full" /></div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-700 text-center py-8">No hay datos disponibles</div>
      )}
    </div>
  );
} 