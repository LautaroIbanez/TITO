import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { PortfolioPosition } from '@/types';
import { convertCurrency } from '@/utils/currency';
import { formatCurrency } from '@/utils/goalCalculator';

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
  positions: PortfolioPosition[];
  cash: { ARS: number; USD: number };
}

export default function CurrencyDistributionChart({ positions, cash }: Props) {
  let totalARS = cash.ARS || 0;
  let totalUSD = cash.USD || 0;

  positions.forEach((pos) => {
    let value = 0;
    if (pos.type === 'Stock') {
      // This is a simplification. For a real app, you'd fetch current prices.
      value = pos.quantity * pos.averagePrice; 
    } else if (pos.type === 'Bond') {
      value = pos.quantity * pos.averagePrice;
    } else if (pos.type === 'FixedTermDeposit') {
      value = pos.amount;
    }

    if (pos.currency === 'ARS') {
      totalARS += value;
    } else {
      totalUSD += value;
    }
  });

  const totalValueInARS = totalARS + convertCurrency(totalUSD, 'USD', 'ARS');

  if (totalValueInARS === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <h3 className="text-sm font-bold text-gray-900 mb-2">Distribución por Moneda</h3>
        <div className="text-gray-700 text-center py-8">No hay datos disponibles</div>
      </div>
    );
  }

  const arsPercentage = (totalARS / totalValueInARS) * 100;
  const usdPercentage = (convertCurrency(totalUSD, 'USD', 'ARS') / totalValueInARS) * 100;

  const chartData = {
    labels: [
      `ARS (${arsPercentage.toFixed(1)}%)`, 
      `USD (${usdPercentage.toFixed(1)}%)`
    ],
    datasets: [
      {
        data: [totalARS, convertCurrency(totalUSD, 'USD', 'ARS')],
        backgroundColor: ['#2563eb', '#10b981'],
        hoverBackgroundColor: ['#1d4ed8', '#059669'],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              if(context.label.startsWith('ARS')) {
                label += formatCurrency(totalARS, 'ARS');
              } else {
                label += formatCurrency(totalUSD, 'USD');
              }
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-8">
      <h3 className="text-sm font-bold text-gray-900 mb-2 text-center">Distribución por Moneda (en ARS)</h3>
      <div className="max-w-xs mx-auto">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
} 