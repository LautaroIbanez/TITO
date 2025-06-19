import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Fundamentals, getRatioColor } from '../types/finance';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface PortfolioCardProps {
  symbol: string;
  fundamentals?: Fundamentals | null;
  technicals: any;
  prices: any[];
  onRemove: () => void;
}

// Reuse the same tooltip descriptions and RatioRow component from ScoopCard
const RATIO_TOOLTIPS = {
  peRatio: "Price to Earnings: Compara el precio de la acción con las ganancias por acción. Menor = más barata.",
  pbRatio: "Price to Book: Compara el precio con el valor contable. Menor = más barata.",
  evToEbitda: "Enterprise Value to EBITDA: Valuation múltiple que considera la deuda. Menor = más barata.",
  roe: "Return on Equity: Rentabilidad sobre el capital propio. Mayor = mejor.",
  roa: "Return on Assets: Rentabilidad sobre los activos totales. Mayor = mejor.",
  debtToEquity: "Debt to Equity: Nivel de apalancamiento. Menor = menos riesgo.",
  debtToEbitda: "Debt to EBITDA: Capacidad de pago de deuda. Menor = menos riesgo.",
  netMargin: "Net Margin: Margen de ganancia neta. Mayor = mejor.",
  freeCashFlow: "Free Cash Flow: Flujo de caja libre en millones. Positivo = mejor.",
  priceToFCF: "Price to Free Cash Flow: Similar al PE pero usando el flujo de caja. Menor = más barata."
};

const RatioRow = ({ label, value, metric }: { label: string; value: number | null | undefined; metric: keyof Omit<Fundamentals, 'updatedAt'> }) => (
  <div className="group relative">
    <div className="flex justify-between py-1">
      <span>{label}</span>
      <span className={`font-mono ${getRatioColor(value ?? null, metric)}`}>
        {value == null ? '—' : value.toFixed(2)}
      </span>
    </div>
    <div className="hidden group-hover:block absolute z-10 bg-gray-800 text-white text-xs p-2 rounded shadow-lg -top-2 left-full ml-2 w-64">
      {RATIO_TOOLTIPS[metric]}
    </div>
  </div>
);

const StockBadges = ({ fundamentals }: { fundamentals: Fundamentals | null | undefined }) => {
  const badges = [];
  
  if (fundamentals?.priceToFCF != null && fundamentals?.pbRatio != null &&
      fundamentals.priceToFCF < 15 && fundamentals.pbRatio < 1.5) {
    badges.push({ text: "Infravalorada", color: "bg-green-100 text-green-700" });
  }
  
  if (fundamentals?.roe != null && fundamentals?.netMargin != null &&
      fundamentals.roe > 15 && fundamentals.netMargin > 10) {
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

export default function PortfolioCard({ symbol, fundamentals, technicals, prices, onRemove }: PortfolioCardProps) {
  // Chart: last 90 days
  const last90 = prices?.slice(-90) || [];
  const chartData = {
    labels: last90.map((p: any) => p.date),
    datasets: [
      {
        label: 'Close',
        data: last90.map((p: any) => p.close),
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.08)',
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: { x: { display: false }, y: { display: false } },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 relative">
      <div className="flex items-center gap-2 justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{symbol}</h2>
        </div>
        <button
          className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold hover:bg-red-200"
          onClick={onRemove}
        >
          Remove from Portfolio
        </button>
      </div>

      {fundamentals && <StockBadges fundamentals={fundamentals} />}

      {/* Price Chart */}
      <div className="h-24 flex items-center justify-center bg-gray-50 rounded">
        {last90.length > 0 ? (
          <Line data={chartData} options={chartOptions} height={80} />
        ) : (
          <span className="text-gray-900 text-sm">[Price Chart]</span>
        )}
      </div>

      {/* Fundamentals */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Fundamentals</h3>
        <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-900">
          <RatioRow label="PE" value={fundamentals?.peRatio} metric="peRatio" />
          <RatioRow label="PB" value={fundamentals?.pbRatio} metric="pbRatio" />
          <RatioRow label="EV/EBITDA" value={fundamentals?.evToEbitda} metric="evToEbitda" />
          <RatioRow label="P/FCF" value={fundamentals?.priceToFCF} metric="priceToFCF" />
          <RatioRow label="ROE" value={fundamentals?.roe} metric="roe" />
          <RatioRow label="ROA" value={fundamentals?.roa} metric="roa" />
          <RatioRow label="Net Margin" value={fundamentals?.netMargin} metric="netMargin" />
          <RatioRow label="D/EBITDA" value={fundamentals?.debtToEbitda} metric="debtToEbitda" />
          <RatioRow label="D/E" value={fundamentals?.debtToEquity} metric="debtToEquity" />
          <RatioRow label="FCF (M)" value={fundamentals?.freeCashFlow} metric="freeCashFlow" />
        </div>
      </div>

      {/* Technicals */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Technicals</h3>
        <div className="flex flex-wrap gap-4 text-xs text-gray-900">
          <div>RSI: <span className="font-mono">{technicals?.RSI ?? '—'}</span></div>
          <div>MACD: <span className="font-mono">{technicals?.MACD ?? '—'}</span></div>
          <div>Trend: <span className="font-mono">{technicals?.trend ?? '—'}</span></div>
        </div>
      </div>
    </div>
  );
} 