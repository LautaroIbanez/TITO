import React from 'react';
import { getTechnicalColor } from '@/utils/tradeSignal';

type TechnicalIndicatorKey = 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'ADX';

const TECHNICAL_TOOLTIPS: Record<TechnicalIndicatorKey, { title: string; description: string }> = {
  RSI: {
    title: "Índice de Fuerza Relativa (RSI)",
    description: "Mide la velocidad y el cambio de los movimientos de precios. Por encima de 70 se considera sobrecompra, por debajo de 30 sobreventa."
  },
  MACD: {
    title: "Convergencia/Divergencia de Medias Móviles (MACD)",
    description: "Muestra la relación entre dos medias móviles. Se usa para identificar cambios en el momentum."
  },
  SMA: {
    title: "Media Móvil Simple (SMA)",
    description: "Promedio de precios de cierre en un período. Suaviza la volatilidad y muestra la tendencia."
  },
  EMA: {
    title: "Media Móvil Exponencial (EMA)",
    description: "Da más peso a los precios recientes que la SMA. Reacciona más rápido a los cambios."
  },
  ADX: {
    title: "Índice Direccional Medio (ADX)",
    description: "Indica la fuerza de una tendencia (no su dirección). Un valor alto sugiere una tendencia fuerte."
  },
};

interface TechnicalDisplayProps {
  label: string;
  indicatorKey: TechnicalIndicatorKey;
  value: number | null | undefined;
  currentPrice?: number;
  className?: string;
}

const TechnicalDisplay = ({ label, indicatorKey, value, currentPrice, className }: TechnicalDisplayProps) => {
  const tooltip = TECHNICAL_TOOLTIPS[indicatorKey];
  const colorClass = value != null ? getTechnicalColor(label, value, currentPrice) : 'text-gray-600';
  
  return (
    <div className="group relative">
      <div className="flex items-center gap-1">
          <span className='font-medium'>{label}:</span>
          <span className={`font-mono ${className ? className : colorClass}`}>
            {value?.toFixed(2) ?? '—'}
          </span>
      </div>
      <div className="hidden group-hover:block absolute z-20 bg-gray-800 text-white text-xs p-2 rounded shadow-lg bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 text-left">
        <p className='font-bold mb-1'>{tooltip.title}</p>
        <p>{tooltip.description}</p>
      </div>
    </div>
  );
};

export default TechnicalDisplay; 