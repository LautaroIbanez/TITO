'use client';

import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PortfolioPosition } from '@/types';
import getPurchasePrice from '../utils/getPurchasePrice';
import { convertCurrencySync } from '@/utils/currency';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  positions: PortfolioPosition[];
  prices: Record<string, Array<{ close?: number }>>;
  bondPrices?: Record<string, number>;
}

export default function PortfolioPieChart({ positions, prices, bondPrices }: Props) {
  const chartOptions = {};
  
  // Group assets by type and convert all values to ARS
  const assetGroups: Record<string, number> = {
    'Acciones': 0,
    'Bonos': 0,
    'Plazos Fijos': 0,
    'Cauciones': 0,
    'Cripto': 0,
    'Otros': 0
  };

  positions.forEach((pos) => {
    let value = 0;
    
    if (pos.type === 'Stock') {
      const currPrice = prices[pos.symbol]?.[prices[pos.symbol].length - 1]?.close || 0;
      value = pos.quantity * currPrice;
      // Convert to ARS if needed
      if (pos.currency === 'USD') {
        value = convertCurrencySync(value, 'USD', 'ARS');
      }
      assetGroups['Acciones'] += value;
    } else if (pos.type === 'Bond') {
      // Use bondPrices if available, otherwise fall back to purchase price
      let currentPrice = getPurchasePrice(pos);
      if (bondPrices && bondPrices[pos.ticker]) {
        currentPrice = bondPrices[pos.ticker];
      }
      value = pos.quantity * currentPrice;
      // Convert to ARS if needed
      if (pos.currency === 'USD') {
        value = convertCurrencySync(value, 'USD', 'ARS');
      }
      assetGroups['Bonos'] += value;
    } else if (pos.type === 'FixedTermDeposit') {
      value = pos.amount;
      // Convert to ARS if needed
      if (pos.currency === 'USD') {
        value = convertCurrencySync(value, 'USD', 'ARS');
      }
      assetGroups['Plazos Fijos'] += value;
    } else if (pos.type === 'Caucion') {
      value = pos.amount;
      // Convert to ARS if needed
      if (pos.currency === 'USD') {
        value = convertCurrencySync(value, 'USD', 'ARS');
      }
      assetGroups['Cauciones'] += value;
    } else if (pos.type === 'Crypto') {
      const currPrice = prices[pos.symbol]?.[prices[pos.symbol].length - 1]?.close || 0;
      value = pos.quantity * currPrice;
      // Convert to ARS if needed
      if (pos.currency === 'USD') {
        value = convertCurrencySync(value, 'USD', 'ARS');
      }
      assetGroups['Cripto'] += value;
    } else {
      assetGroups['Otros'] += 0;
    }
  });

  // Convert to array format for chart
  const dataArr = Object.entries(assetGroups)
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value }));
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
        <Pie data={chartData} options={chartOptions} />
      ) : (
        <div className="text-gray-700 text-center py-8">No hay datos disponibles</div>
      )}
    </div>
  );
} 