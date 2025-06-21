import React, { useState } from 'react';
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
import { Fundamentals, getRatioColor, Technicals } from '../types/finance';
import { getTradeSignal, TradeSignal } from '@/utils/tradeSignal';
import TradeModal from './TradeModal';
import TechnicalDisplay from './TechnicalDisplay';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface ScoopCardProps {
  stockData: any;
  fundamentals: Fundamentals;
  technicals: Technicals | null;
  isSuggested: boolean;
  inPortfolio: boolean;
  onTrade: () => void; // Renamed from onAddToPortfolio
  availableCash: number;
}

const RATIO_TOOLTIPS: Record<keyof Omit<Fundamentals, 'updatedAt' | 'sector' | 'industry'>, string> = {
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
  epsGrowth: "EPS Growth Estimate (Y/Y): Crecimiento estimado de las ganancias por acción. Mayor = mejor."
};

const formatValue = (value: number | null | undefined, format: 'default' | 'currency' | 'percent') => {
  if (value == null) return '—';
  switch(format) {
    case 'currency':
      return `$${(value / 1e6).toFixed(0)}M`; // In millions
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toFixed(2);
  }
}

const RatioRow = ({ label, value, metric, format = 'default' }: { label: string; value: number | null | undefined; metric: keyof typeof RATIO_TOOLTIPS; format?: 'default' | 'currency' | 'percent' }) => (
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

const StockBadges = ({ fundamentals }: { fundamentals: Fundamentals }) => {
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

const SignalBadge = ({ signal }: { signal: TradeSignal }) => {
  const badgeStyles: Record<TradeSignal, string> = {
    buy: 'bg-green-100 text-green-700',
    sell: 'bg-red-100 text-red-700',
    hold: 'bg-gray-100 text-gray-700',
  };
  const signalText: Record<TradeSignal, string> = {
    buy: 'Comprar',
    sell: 'Vender',
    hold: 'Mantener',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${badgeStyles[signal]}`}>
      {signalText[signal]}
    </span>
  );
};

export default function ScoopCard({
  stockData,
  fundamentals,
  technicals,
  isSuggested,
  inPortfolio,
  onTrade,
  availableCash,
}: ScoopCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const signal = getTradeSignal(technicals);
  // Prepare chart data
  const prices = stockData?.prices || [];
  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  const chartData = {
    labels: prices.map((p: any) => p.date),
    datasets: [
      {
        label: 'Close',
        data: prices.map((p: any) => p.close),
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
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: {
      line: { borderWidth: 2 },
    },
    maintainAspectRatio: false,
  };

  const handleBuy = async (quantity: number) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    const res = await fetch('/api/portfolio/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, symbol: stockData.symbol, quantity, price: currentPrice }),
    });
    if (res.ok) {
      onTrade(); // Refresh data
    } else {
      const data = await res.json();
      alert(`Error: ${data.error}`);
    }
  };

  return (
    <>
      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBuy}
        tradeType="Buy"
        symbol={stockData.symbol}
        price={currentPrice}
        availableCash={availableCash}
      />
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 relative">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900">
            {stockData?.companyName || stockData?.symbol || '—'}
          </h2>
          <span className="text-sm font-mono text-gray-900">{stockData?.symbol}</span>
          <SignalBadge signal={signal} />
          {isSuggested && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
              Sugerido
            </span>
          )}
        </div>
        
        {fundamentals?.sector && (
          <div className="text-xs text-gray-700 -mt-3">
            {fundamentals.sector} / {fundamentals.industry}
          </div>
        )}

        <StockBadges fundamentals={fundamentals} />
        
        {/* Price Chart */}
        <div className="h-32 flex items-center justify-center bg-gray-50 rounded">
          {prices.length > 0 ? (
            <Line data={chartData} options={chartOptions} height={100} />
          ) : (
            <span className="text-gray-900 text-sm">[Gráfico de Precios]</span>
          )}
        </div>

        {/* Fundamentals Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {/* Valuation */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Valoración</h3>
            <div className="text-xs text-gray-700">
              <RatioRow label="PE Ratio" value={fundamentals.peRatio} metric="peRatio" />
              <RatioRow label="PB Ratio" value={fundamentals.pbRatio} metric="pbRatio" />
              <RatioRow label="EV/EBITDA" value={fundamentals.evToEbitda} metric="evToEbitda" />
              <RatioRow label="Price/FCF" value={fundamentals.priceToFCF} metric="priceToFCF" />
            </div>
          </div>
          
          {/* Profitability */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Rentabilidad</h3>
            <div className="text-xs text-gray-700">
              <RatioRow label="ROE" value={fundamentals.roe} metric="roe" format="percent" />
              <RatioRow label="ROA" value={fundamentals.roa} metric="roa" format="percent" />
              <RatioRow label="Net Margin" value={fundamentals.netMargin} metric="netMargin" format="percent" />
              <RatioRow label="Deuda/EBITDA" value={fundamentals.debtToEbitda} metric="debtToEbitda" />
            </div>
          </div>

          {/* Growth */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Crecimiento</h3>
            <div className="text-xs text-gray-700">
              <RatioRow label="EBITDA" value={fundamentals.ebitda} metric="ebitda" format="currency" />
              <RatioRow label="FCF" value={fundamentals.freeCashFlow} metric="freeCashFlow" format="currency" />
              <RatioRow label="Crec. Ingresos" value={fundamentals.revenueGrowth} metric="revenueGrowth" format="percent" />
              <RatioRow label="Crec. BPA Est." value={fundamentals.epsGrowth} metric="epsGrowth" format="percent" />
            </div>
          </div>
        </div>

        {/* Technicals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Análisis Técnico</h3>
          <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-700">
            <TechnicalDisplay label="RSI" indicatorKey="RSI" value={technicals?.rsi} />
            <TechnicalDisplay label="MACD" indicatorKey="MACD" value={technicals?.macd} />
            <TechnicalDisplay label="SMA 200" indicatorKey="SMA" value={technicals?.sma200} currentPrice={currentPrice} />
            <TechnicalDisplay label="EMA 50" indicatorKey="EMA" value={technicals?.ema50} currentPrice={currentPrice} />
            <TechnicalDisplay label="ADX" indicatorKey="ADX" value={technicals?.adx} />
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          {!inPortfolio && (
            <button
              className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => setIsModalOpen(true)}
              disabled={currentPrice > availableCash}
            >
              Buy
            </button>
          )}
          {inPortfolio && (
            <span className="px-4 py-1 bg-gray-200 text-gray-600 rounded text-xs">In Portfolio</span>
          )}
        </div>
      </div>
    </>
  );
} 