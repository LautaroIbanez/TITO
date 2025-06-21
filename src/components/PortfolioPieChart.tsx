import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  positions: any[];
  prices: Record<string, any[]>;
}

export default function PortfolioPieChart({ positions, prices }: Props) {
  const dataArr = positions.map((pos) => {
    const currPrice = prices[pos.symbol]?.[prices[pos.symbol].length - 1]?.close || 0;
    return { symbol: pos.symbol, value: pos.quantity * currPrice };
  });
  const total = dataArr.reduce((a, b) => a + b.value, 0);
  const chartData = {
    labels: dataArr.map((d) => d.symbol),
    datasets: [
      {
        data: dataArr.map((d) => d.value),
        backgroundColor: [
          '#2563eb', '#f59e42', '#10b981', '#f43f5e', '#6366f1', '#fbbf24', '#14b8a6', '#a21caf', '#eab308', '#0ea5e9'
        ],
      },
    ],
  };
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8 max-w-md mx-auto">
      <h3 className="text-sm font-bold text-gray-900 mb-2">Distribución de Activos</h3>
      {total > 0 ? (
        <Pie data={chartData} />
      ) : (
        <div className="text-gray-700 text-center py-8">No hay datos disponibles</div>
      )}
    </div>
  );
} 