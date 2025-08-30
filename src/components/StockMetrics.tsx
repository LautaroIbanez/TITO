'use client';
import React from 'react';
import { Fundamentals, getRatioColor } from '../types/finance';
import dayjs from 'dayjs';

// Shared constants
export const RATIO_TOOLTIPS: Record<keyof Omit<Fundamentals, 'updatedAt' | 'sector' | 'industry'>, string> = {
  peRatio: "Price to Earnings: Compara el precio de la acción con las ganancias por acción. Menor = más barata.",
  pbRatio: "Price to Book: Compara el precio con el valor contable. Menor = más barata.",
  evToEbitda: "Enterprise Value to EBITDA: Valuation múltiple que considera la deuda. Menor = más barata.",
  priceToFCF: "Price to Free Cash Flow: Similar al PE pero usando el flujo de caja. Menor = más barata.",
  roe: "Return on Equity: Rentabilidad sobre el capital propio. Mayor = mejor.",
  roa: "Return on Assets: Rentabilidad sobre los activos totales. Mayor = mejor.",
  netMargin: "Net Margin: Margen de ganancia neta. Mayor = mejor.",
  debtToEquity: "Debt to Equity: Nivel de apalancamiento. Menor = menos riesgo.",
  debtToEbitda: "Debt to EBITDA: Capacidad de pago de deuda. Menor = menos riesgo.",
  freeCashFlow: "Free Cash Flow: Flujo de caja libre en millones. Positivo = mejor.",
  ebitda: "EBITDA: Ganancias antes de intereses, impuestos, depreciación y amortización. Mayor = mejor.",
  revenueGrowth: "Revenue Growth (Y/Y): Crecimiento de los ingresos año contra año. Mayor = mejor.",
  epsGrowth: "EPS Growth Estimate (Y/Y): Crecimiento estimado de las ganancias por acción. Mayor = mejor.",
  beta: "Beta: Volatilidad relativa al mercado. 1 = mercado, >1 = más volátil, <1 = menos volátil."
};

// Shared utility functions
export const formatValue = (value: number | null | undefined, format: 'default' | 'currency' | 'percent') => {
  if (value == null) return '—';
  switch(format) {
    case 'currency':
      return `$${(value / 1e6).toFixed(0)}M`; // In millions
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toFixed(2);
  }
};

export const formatDate = (dateString: string) => {
  return dayjs(dateString).format('DD/MM/YYYY');
};

// Shared RatioRow component
export const RatioRow = ({ 
  label, 
  value, 
  metric, 
  format = 'default' 
}: { 
  label: string; 
  value: number | null | undefined; 
  metric: keyof typeof RATIO_TOOLTIPS; 
  format?: 'default' | 'currency' | 'percent' 
}) => (
  <div className="group relative">
    <div className="flex justify-between py-1">
      <span>{label}</span>
      <span className={`font-mono ${getRatioColor(value ?? null, metric)}`}>
        {formatValue(value, format)}
      </span>
    </div>
    <div className="hidden group-hover:block absolute z-10 bg-gray-800 text-white text-xs p-2 rounded shadow-lg -top-2 left-full ml-2 w-64">
      {RATIO_TOOLTIPS[metric]}
    </div>
  </div>
);

// Shared StockBadges component
export const StockBadges = ({ 
  fundamentals 
}: { 
  fundamentals: Fundamentals | null | undefined 
}) => {
  const badges = [];
  
  if (fundamentals?.priceToFCF != null && fundamentals?.pbRatio != null &&
      fundamentals.priceToFCF < 15 && fundamentals.pbRatio < 1.5) {
    badges.push({ text: "Infravalorada", color: "bg-green-100 text-green-700" });
  }
  
  if (fundamentals?.roe != null && fundamentals?.netMargin != null &&
      fundamentals.roe > 0.15 && fundamentals.netMargin > 0.1) {
    badges.push({ text: "Rentable", color: "bg-blue-100 text-blue-700" });
  }
  
  if (fundamentals?.debtToEbitda != null && fundamentals.debtToEbitda > 4) {
    badges.push({ text: "Endeudada", color: "bg-red-100 text-red-700" });
  }
  
  return (
    <div className="flex gap-2 mb-2">
      {badges.map((badge, idx) => (
        <span key={idx} className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
          {badge.text}
        </span>
      ))}
    </div>
  );
}; 