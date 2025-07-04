'use client';
import React, { useState, useEffect } from 'react';
import { Fundamentals } from '@/types/finance';

interface SectorComparisonProps {
  symbol: string;
  fundamentals: Fundamentals | null;
}

interface SectorAverages {
  peRatio: number | null;
  pbRatio: number | null;
  evToEbitda: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  debtToEbitda: number | null;
  netMargin: number | null;
  priceToFCF: number | null;
}

const SectorComparison: React.FC<SectorComparisonProps> = ({ symbol, fundamentals }) => {
  const [sectorAverages, setSectorAverages] = useState<SectorAverages | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSectorAverages = async () => {
      if (!fundamentals?.sector) return;
      
      setLoading(true);
      try {
        const response = await fetch(`/api/sector-comparison?symbol=${encodeURIComponent(symbol)}&sector=${encodeURIComponent(fundamentals.sector)}`);
        if (response.ok) {
          const data = await response.json();
          setSectorAverages(data.averages);
        } else {
          console.error('Error fetching sector averages:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching sector averages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSectorAverages();
  }, [symbol, fundamentals?.sector]);

  if (!fundamentals?.sector || loading) {
    return null;
  }

  if (!sectorAverages) {
    return (
      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
        Sector: {fundamentals.sector}
      </div>
    );
  }

  const getComparisonColor = (stockValue: number | null, sectorValue: number | null, metric: keyof SectorAverages): string => {
    if (stockValue === null || sectorValue === null) return 'text-gray-400';
    
    // For metrics where higher is better (ROE, ROA, netMargin)
    if (metric === 'roe' || metric === 'roa' || metric === 'netMargin') {
      if (stockValue > sectorValue) return 'text-green-600';
      if (stockValue < sectorValue) return 'text-red-600';
      return 'text-gray-600';
    }
    
    // For metrics where lower is better
    if (stockValue < sectorValue) return 'text-green-600';
    if (stockValue > sectorValue) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatValue = (value: number | null): string => {
    if (value === null) return '—';
    if (value > 1000) return value.toFixed(1);
    if (value > 1) return value.toFixed(2);
    return (value * 100).toFixed(1) + '%';
  };

  const getComparisonIcon = (stockValue: number | null, sectorValue: number | null, metric: keyof SectorAverages): string => {
    if (stockValue === null || sectorValue === null) return '';
    
    // For metrics where higher is better
    if (metric === 'roe' || metric === 'roa' || metric === 'netMargin') {
      if (stockValue > sectorValue) return '↑';
      if (stockValue < sectorValue) return '↓';
      return '→';
    }
    
    // For metrics where lower is better
    if (stockValue < sectorValue) return '↑';
    if (stockValue > sectorValue) return '↓';
    return '→';
  };

  return (
    <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
      <div className="text-xs font-semibold text-blue-800 mb-1">
        Sector: {fundamentals.sector}
      </div>
      <div className="grid grid-cols-2 gap-x-4 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">PE Ratio:</span>
            <span className={getComparisonColor(fundamentals.peRatio, sectorAverages.peRatio, 'peRatio')}>
              {formatValue(fundamentals.peRatio)} 
              {sectorAverages.peRatio && (
                <span className="ml-1">
                  {getComparisonIcon(fundamentals.peRatio, sectorAverages.peRatio, 'peRatio')}
                  <span className="text-gray-500">({formatValue(sectorAverages.peRatio)})</span>
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">PB Ratio:</span>
            <span className={getComparisonColor(fundamentals.pbRatio, sectorAverages.pbRatio, 'pbRatio')}>
              {formatValue(fundamentals.pbRatio)}
              {sectorAverages.pbRatio && (
                <span className="ml-1">
                  {getComparisonIcon(fundamentals.pbRatio, sectorAverages.pbRatio, 'pbRatio')}
                  <span className="text-gray-500">({formatValue(sectorAverages.pbRatio)})</span>
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ROE:</span>
            <span className={getComparisonColor(fundamentals.roe, sectorAverages.roe, 'roe')}>
              {formatValue(fundamentals.roe)}
              {sectorAverages.roe && (
                <span className="ml-1">
                  {getComparisonIcon(fundamentals.roe, sectorAverages.roe, 'roe')}
                  <span className="text-gray-500">({formatValue(sectorAverages.roe)})</span>
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ROA:</span>
            <span className={getComparisonColor(fundamentals.roa, sectorAverages.roa, 'roa')}>
              {formatValue(fundamentals.roa)}
              {sectorAverages.roa && (
                <span className="ml-1">
                  {getComparisonIcon(fundamentals.roa, sectorAverages.roa, 'roa')}
                  <span className="text-gray-500">({formatValue(sectorAverages.roa)})</span>
                </span>
              )}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Net Margin:</span>
            <span className={getComparisonColor(fundamentals.netMargin, sectorAverages.netMargin, 'netMargin')}>
              {formatValue(fundamentals.netMargin)}
              {sectorAverages.netMargin && (
                <span className="ml-1">
                  {getComparisonIcon(fundamentals.netMargin, sectorAverages.netMargin, 'netMargin')}
                  <span className="text-gray-500">({formatValue(sectorAverages.netMargin)})</span>
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">D/E:</span>
            <span className={getComparisonColor(fundamentals.debtToEquity, sectorAverages.debtToEquity, 'debtToEquity')}>
              {formatValue(fundamentals.debtToEquity)}
              {sectorAverages.debtToEquity && (
                <span className="ml-1">
                  {getComparisonIcon(fundamentals.debtToEquity, sectorAverages.debtToEquity, 'debtToEquity')}
                  <span className="text-gray-500">({formatValue(sectorAverages.debtToEquity)})</span>
                </span>
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">P/FCF:</span>
            <span className={getComparisonColor(fundamentals.priceToFCF, sectorAverages.priceToFCF, 'priceToFCF')}>
              {formatValue(fundamentals.priceToFCF)}
              {sectorAverages.priceToFCF && (
                <span className="ml-1">
                  {getComparisonIcon(fundamentals.priceToFCF, sectorAverages.priceToFCF, 'priceToFCF')}
                  <span className="text-gray-500">({formatValue(sectorAverages.priceToFCF)})</span>
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectorComparison; 