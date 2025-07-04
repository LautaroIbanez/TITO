import React from 'react';
import { Fundamentals, getRatioColor } from '../types/finance';
import { formatValue } from './StockMetrics';

interface FundamentalsCompactProps {
  fundamentals: Fundamentals | null;
  showSector?: boolean;
}

export default function FundamentalsCompact({ fundamentals, showSector = true }: FundamentalsCompactProps) {
  if (!fundamentals) {
    return <span className="text-gray-500 text-sm">Datos no disponibles</span>;
  }

  // Define the key metrics to display in compact format
  const keyMetrics = [
    { key: 'peRatio', label: 'PE', format: 'default' as const },
    { key: 'pbRatio', label: 'PB', format: 'default' as const },
    { key: 'roe', label: 'ROE', format: 'percent' as const },
    { key: 'netMargin', label: 'Margin', format: 'percent' as const },
    { key: 'debtToEquity', label: 'D/E', format: 'default' as const },
  ];

  // Build the compact metrics string
  const metricsString = keyMetrics
    .map(({ key, label, format }) => {
      const value = fundamentals[key as keyof Fundamentals] as number | null;
      if (value == null) return null;
      return `${label}: ${formatValue(value, format)}`;
    })
    .filter(Boolean)
    .join(' | ');

  return (
    <div className="text-xs text-gray-700">
      {showSector && fundamentals.sector && (
        <div className="mb-1">
          <span className="text-gray-600">Sector:</span>
          <span className="ml-1 font-medium">{fundamentals.sector}</span>
        </div>
      )}
      <div className="font-mono">
        {metricsString || 'Sin datos'}
      </div>
    </div>
  );
} 