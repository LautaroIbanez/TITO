'use client';
import { ReactNode, useState } from 'react';
import { formatCurrency } from '@/utils/goalCalculator';

interface SummaryCardTooltipProps {
  children: ReactNode;
  capitalInvertidoARS: number;
  capitalInvertidoUSD: number;
  gananciaNetaARS: number;
  gananciaNetaUSD: number;
  efectivoDisponibleARS: number;
  efectivoDisponibleUSD: number;
}

export default function SummaryCardTooltip({
  children,
  capitalInvertidoARS,
  capitalInvertidoUSD,
  gananciaNetaARS,
  gananciaNetaUSD,
  efectivoDisponibleARS,
  efectivoDisponibleUSD,
}: SummaryCardTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const totalARS = capitalInvertidoARS + gananciaNetaARS + efectivoDisponibleARS;
  const totalUSD = capitalInvertidoUSD + gananciaNetaUSD + efectivoDisponibleUSD;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
    >
      {children}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap">
          <div className="font-semibold mb-1">Fórmula: Capital + Ganancias + Efectivo</div>
          <div className="space-y-1 text-xs">
            <div>ARS: {formatCurrency(capitalInvertidoARS, 'ARS')} + {formatCurrency(gananciaNetaARS, 'ARS')} + {formatCurrency(efectivoDisponibleARS, 'ARS')} = {formatCurrency(totalARS, 'ARS')}</div>
            <div>USD: {formatCurrency(capitalInvertidoUSD, 'USD')} + {formatCurrency(gananciaNetaUSD, 'USD')} + {formatCurrency(efectivoDisponibleUSD, 'USD')} = {formatCurrency(totalUSD, 'USD')}</div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
} 