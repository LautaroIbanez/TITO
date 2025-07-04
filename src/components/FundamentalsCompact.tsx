import React, { useState, useEffect } from 'react';
import { Fundamentals, getRatioColor } from '../types/finance';
import { formatValue } from './StockMetrics';

interface FundamentalsCompactProps {
  fundamentals: Fundamentals | null;
  symbol: string;
  showSector?: boolean;
}

interface SectorData {
  averages: Record<string, number | null>;
  percentiles: Record<string, { p20: number | null; p80: number | null } | null>;
}

export default function FundamentalsCompact({ fundamentals, symbol, showSector = true }: FundamentalsCompactProps) {
  const [sectorData, setSectorData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSectorData = async () => {
      if (!fundamentals?.sector) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/sector-comparison?symbol=${encodeURIComponent(symbol)}&sector=${encodeURIComponent(fundamentals.sector)}`);
        if (response.ok) {
          const data = await response.json();
          setSectorData(data);
        } else {
          console.error('Error fetching sector data:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching sector data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSectorData();
  }, [symbol, fundamentals?.sector]);

  if (!fundamentals) {
    return <span className="text-gray-500 text-sm">Datos no disponibles</span>;
  }

  // Helper function to get variation percentage
  const getVariationPercentage = (stockValue: number | null, sectorValue: number | null): number | null => {
    if (stockValue === null || sectorValue === null || sectorValue === 0) return null;
    return ((stockValue - sectorValue) / sectorValue) * 100;
  };

  // Helper function to get variation arrow and color
  const getVariationIndicator = (stockValue: number | null, sectorValue: number | null, metric: keyof Fundamentals) => {
    if (stockValue === null || sectorValue === null) return { arrow: '', color: 'text-gray-400' };
    const variation = getVariationPercentage(stockValue, sectorValue);
    if (variation === null) return { arrow: '', color: 'text-gray-400' };
    // For metrics where higher is better (ROE, ROA, netMargin)
    const isHigherBetter = metric === 'roe' || metric === 'roa' || metric === 'netMargin';
    if (isHigherBetter) {
      if (variation > 0) return { arrow: '↑', color: 'text-green-600' };
      if (variation < 0) return { arrow: '↓', color: 'text-red-600' };
    } else {
      if (variation < 0) return { arrow: '↑', color: 'text-green-600' };
      if (variation > 0) return { arrow: '↓', color: 'text-red-600' };
    }
    return { arrow: '→', color: 'text-gray-600' };
  };

  // Helper function to get percentile indicator using p20/p80
  const getPercentileIndicator = (value: number | null, p20: number | null, p80: number | null): string => {
    if (value == null) return '';
    if (p80 != null && value > p80) return '⭐';
    if (p20 != null && value < p20) return '⚠️';
    return '';
  };

  // Define the metrics to display in the grid
  const metrics = [
    { key: 'peRatio' as keyof Fundamentals, label: 'PE Ratio', format: 'default' as const },
    { key: 'netMargin' as keyof Fundamentals, label: 'Net Margin', format: 'percent' as const },
    { key: 'pbRatio' as keyof Fundamentals, label: 'PB Ratio', format: 'default' as const },
    { key: 'roe' as keyof Fundamentals, label: 'ROE', format: 'percent' as const },
    { key: 'debtToEquity' as keyof Fundamentals, label: 'D/E', format: 'default' as const },
  ];

  return (
    <div className="text-xs text-gray-700">
      {/* Sector line */}
      {showSector && fundamentals.sector && (
        <div className="mb-2">
          <span className="text-gray-600">Sector:</span>
          <span className="ml-1 font-medium">{fundamentals.sector}</span>
        </div>
      )}
      {/* Metrics grid */}
      <div className="space-y-1">
        {metrics.map(({ key, label, format }) => {
          const value = fundamentals[key] as number | null;
          const sectorValue = sectorData?.averages[key] || null;
          const p20 = sectorData?.percentiles[key]?.p20 ?? null;
          const p80 = sectorData?.percentiles[key]?.p80 ?? null;
          const variation = getVariationPercentage(value, sectorValue);
          const { arrow, color } = getVariationIndicator(value, sectorValue, key);
          const percentileIndicator = getPercentileIndicator(value, p20, p80);
          return (
            <div key={key} className="flex justify-between items-center">
              <span className="text-gray-600">{label}:</span>
              <div className="flex items-center space-x-1">
                <span title="Valor de la empresa" className={`font-mono ${getRatioColor(value, key as keyof Omit<Fundamentals, 'updatedAt' | 'sector' | 'industry'>)}`}>
                  {formatValue(value, format)}
                </span>
                {sectorValue !== null && (
                  <span title="Mejor/peor que el sector" className={`text-xs ${color}`}>
                    {arrow} {variation !== null ? `${Math.abs(variation).toFixed(1)}%` : ''}
                  </span>
                )}
                {percentileIndicator && (
                  <span
                    className="text-xs"
                    title={percentileIndicator === '⭐' ? 'Por encima del percentil 80 del sector' : percentileIndicator === '⚠️' ? 'Por debajo del percentil 20 del sector' : 'Promedio del sector'}
                  >
                    {percentileIndicator}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {loading && (
        <div className="text-xs text-gray-500 mt-1">Cargando datos del sector...</div>
      )}
      {/* Leyenda explicativa */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full align-middle"></span>
          <span>Mejor que el sector</span>
          <span className="inline-block w-3 h-3 bg-red-500 rounded-full align-middle ml-4"></span>
          <span>Peor que el sector</span>
        </div>
        <div className="text-gray-500 mt-1">
          <span className="font-mono">Valor</span>: Empresa &nbsp;|&nbsp; <span className="font-mono">Promedio</span>: Sector &nbsp;|&nbsp; <span className="font-mono">↑/↓</span>: Mejor/peor que el sector
        </div>
      </div>
    </div>
  );
} 