import React from 'react';
import { ComparisonResult } from '@/utils/returnCalculator';

interface Props {
  data: ComparisonResult;
}

const benchmarkLabels: Record<string, string> = {
  'S&P 500': 'S&P 500',
  'Gold': 'Oro',
  'US 10-Year Treasury': 'Bono USA 10 años',
  'NASDAQ': 'NASDAQ',
  'Dow Jones': 'Dow Jones',
  'Russell 2000': 'Russell 2000',
  'VIX': 'VIX',
  'Bitcoin': 'Bitcoin',
  'Ethereum': 'Ethereum',
  'US Dollar Index': 'Índice Dólar USA',
  'fixedDeposit': 'Plazo Fijo',
  'realEstate': 'Bienes Raíces',
  'usTreasury': 'Bono USA',
  'sp500': 'S&P 500',
  'gold': 'Oro'
};

export default function ReturnComparison({ data }: Props) {
  // Extract portfolio return and create items for other benchmarks
  const { portfolioReturn, ...benchmarks } = data;
  
  const items = [
    { label: 'Tu Portafolio', value: portfolioReturn },
    ...Object.entries(benchmarks).map(([key, value]) => ({
      label: benchmarkLabels[key] || key,
      value: value as number
    }))
  ];

  const best = Math.max(...items.map(i => Math.abs(i.value)));
  
  return (
    <div className="mb-8 bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4 text-gray-900">Comparación de Retorno Anualizado</h3>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <div className="w-40 text-gray-800 text-sm font-medium">{item.label}</div>
            <div className={`w-24 font-mono text-base text-right pr-4 ${item.value === best ? 'text-green-600 font-bold' : 'text-gray-900'}`}>
              {item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%
            </div>
            <div className="flex-1 h-3 bg-gray-200 rounded">
              <div
                className={`h-3 rounded ${item.value === best ? 'bg-green-500' : 'bg-gray-400'}`}
                style={{ width: `${best > 0 ? Math.max(0, (item.value / best) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-600 mt-4 text-center">El rendimiento pasado no garantiza resultados futuros.</div>
    </div>
  );
} 