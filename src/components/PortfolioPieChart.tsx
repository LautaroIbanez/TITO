import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PortfolioPosition } from '@/types';
import getPurchasePrice from '../utils/getPurchasePrice';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  positions: PortfolioPosition[];
  prices: Record<string, Array<{ close?: number }>>;
}

export default function PortfolioPieChart({ positions, prices }: Props) {
  let cryptoValue = 0;
  const dataArr = positions.map((pos) => {
    if (pos.type === 'Stock') {
      const currPrice = prices[pos.symbol]?.[prices[pos.symbol].length - 1]?.close || 0;
      return { label: pos.symbol, value: pos.quantity * currPrice };
    } else if (pos.type === 'Bond') {
      return { label: pos.ticker, value: pos.quantity * getPurchasePrice(pos) };
    } else if (pos.type === 'FixedTermDeposit') {
      return { label: pos.provider, value: pos.amount };
    } else if (pos.type === 'Caucion') {
      return { label: pos.provider, value: pos.amount };
    } else if (pos.type === 'Crypto') {
      const currPrice = prices[pos.symbol]?.[prices[pos.symbol].length - 1]?.close || 0;
      cryptoValue += pos.quantity * currPrice;
      return null; // We'll add a single 'Cripto' slice later
    } else {
      return { label: 'Otro', value: 0 };
    }
  }).filter(Boolean) as { label: string; value: number }[];
  if (cryptoValue > 0) {
    dataArr.push({ label: 'Cripto', value: cryptoValue });
  }
  const total = dataArr.reduce((a, b) => a + b.value, 0);
  const chartData = {
    labels: dataArr.map((d) => d.label),
    datasets: [
      {
        data: dataArr.map((d) => d.value),
        backgroundColor: [
          '#2563eb', '#f59e42', '#10b981', '#f43f5e', '#6366f1', '#fbbf24', '#14b8a6', '#a21caf', '#eab308', '#0ea5e9', '#6e44ff', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'
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