import React from 'react';
import { ComparisonResult } from '@/utils/returnCalculator';

interface Props {
  data: ComparisonResult;
}

export default function ReturnComparison({ data }: Props) {
  const items = [
    { label: 'Your portfolio', value: data.portfolioReturn },
    { label: 'S&P 500', value: data.sp500 },
    { label: 'Gold', value: data.gold },
    { label: 'Fixed-term', value: data.fixedDeposit },
    { label: 'Real estate', value: data.realEstate },
    { label: 'US bond', value: data.usTreasury },
  ];
  const best = Math.max(...items.map(i => Math.abs(i.value)));
  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold mb-2 text-gray-900">Annualized Return Comparison</h3>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-4">
            <div className="w-40 text-gray-900 text-sm">{item.label}</div>
            <div className={`font-mono text-base ${item.value === best ? 'text-green-600 font-bold' : 'text-gray-700'}`}>
              {item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%
            </div>
            <div className="flex-1 h-2 ml-2 bg-gray-200 rounded">
              <div
                className={`h-2 rounded ${item.value === best ? 'bg-green-400' : 'bg-gray-400'}`}
                style={{ width: `${best > 0 ? Math.max(0, (item.value / best) * 100) : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500 mt-2">Past performance does not guarantee future results.</div>
    </div>
  );
} 