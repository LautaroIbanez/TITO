'use client';
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
import { Fundamentals, Technicals } from '../types/finance';
import { getTradeSignal, TradeSignal } from '@/utils/tradeSignal';
import TradeModal, { TradeModalProps } from './TradeModal';
import TechnicalDisplay from './TechnicalDisplay';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { RatioRow, StockBadges, formatDate } from './StockMetrics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface ScoopCardProps {
  stockData: any;
  fundamentals: Fundamentals;
  technicals: Technicals | null;
  isSuggested: boolean;
  isTrending: boolean;
  inPortfolio: boolean;
  onTrade: () => void; // Renamed from onAddToPortfolio
  availableCash: number;
}

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
  isTrending,
  inPortfolio,
  onTrade,
  availableCash,
}: ScoopCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Prepare chart data
  const prices = stockData?.prices || [];
  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  const signal = getTradeSignal(technicals, currentPrice);
  
  // Compute last price date
  const lastPriceDate = prices.length > 0 ? prices[prices.length - 1].date : null;
  const fundamentalsDate = fundamentals?.updatedAt;
  
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

  const handleBuy: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, commissionPct, purchaseFeePct) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    const res = await fetch('/api/portfolio/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        assetType: 'Stock',
        symbol: stockData.symbol,
        quantity,
        price: currentPrice,
        commissionPct,
        purchaseFeePct,
      }),
    });
    if (res.ok) {
      onTrade(); // Refresh data
      setIsModalOpen(false);
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
        assetName={stockData.symbol}
        assetType="Stock"
        identifier={stockData.symbol}
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
            <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
              Sugerido
            </span>
          )}
          {isTrending && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
              Trending
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
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Valuación</h3>
            <div className="space-y-1 text-xs text-gray-700">
              <RatioRow label="PE" value={fundamentals?.peRatio} metric="peRatio" />
              <RatioRow label="PB" value={fundamentals?.pbRatio} metric="pbRatio" />
              <RatioRow label="EV/EBITDA" value={fundamentals?.evToEbitda} metric="evToEbitda" />
              <RatioRow label="P/FCF" value={fundamentals?.priceToFCF} metric="priceToFCF" />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Rentabilidad</h3>
            <div className="space-y-1 text-xs text-gray-700">
              <RatioRow label="ROE" value={fundamentals?.roe} metric="roe" format="percent" />
              <RatioRow label="ROA" value={fundamentals?.roa} metric="roa" format="percent" />
              <RatioRow label="Net Margin" value={fundamentals?.netMargin} metric="netMargin" format="percent" />
              <RatioRow label="FCF (M)" value={fundamentals?.freeCashFlow} metric="freeCashFlow" format="currency" />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Deuda</h3>
            <div className="space-y-1 text-xs text-gray-700">
              <RatioRow label="D/EBITDA" value={fundamentals?.debtToEbitda} metric="debtToEbitda" />
              <RatioRow label="D/E" value={fundamentals?.debtToEquity} metric="debtToEquity" />
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Crecimiento</h3>
            <div className="space-y-1 text-xs text-gray-700">
              <RatioRow label="Revenue Growth" value={fundamentals?.revenueGrowth} metric="revenueGrowth" format="percent" />
              <RatioRow label="EPS Growth" value={fundamentals?.epsGrowth} metric="epsGrowth" format="percent" />
            </div>
          </div>
        </div>

        {/* Technicals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Técnicos</h3>
          <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-700">
            <TechnicalDisplay label="RSI" indicatorKey="RSI" value={technicals?.rsi} />
            <TechnicalDisplay label="MACD" indicatorKey="MACD" value={technicals?.macd} />
            <TechnicalDisplay label="SMA 200" indicatorKey="SMA" value={technicals?.sma200} currentPrice={currentPrice} />
            <TechnicalDisplay label="EMA 50" indicatorKey="EMA" value={technicals?.ema50} currentPrice={currentPrice} />
            <TechnicalDisplay label="ADX" indicatorKey="ADX" value={technicals?.adx} />
          </div>
        </div>

        {/* Data Update Footer */}
        <div className="border-t pt-2 mt-2">
          <div className="text-xs text-gray-500 flex justify-between">
            <span>Precio: {lastPriceDate ? formatDate(lastPriceDate) : '—'}</span>
            <span>Fundamentales: {fundamentalsDate ? formatDate(fundamentalsDate) : '—'}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={inPortfolio}
          className={`mt-4 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
            inPortfolio
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {inPortfolio ? 'Ya en Portafolio' : 'Comprar'}
        </button>
      </div>
    </>
  );
} 