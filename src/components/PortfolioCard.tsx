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
import { getTradeSignal } from '@/utils/tradeSignal';
import TradeModal, { TradeType } from './TradeModal';
import type { TradeModalProps } from './TradeModal';
import TechnicalDisplay from './TechnicalDisplay';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { RatioRow, StockBadges, formatDate } from './StockMetrics';
import FundamentalsCompact from './FundamentalsCompact';
import { formatCurrency } from '@/utils/goalCalculator';
import { StockPosition, AssetType } from '@/types';
import { getTickerCurrency } from '@/utils/tickers';
import SectorComparison from './SectorComparison';
import SignalBadge from './SignalBadge';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface PortfolioCardProps {
  symbol: string;
  fundamentals?: Fundamentals | null;
  technicals: Technicals | null;
  prices: any[];
  position: StockPosition;
  onTrade: () => void;
  cash: { ARS: number; USD: number };
}



export default function PortfolioCard({ symbol, fundamentals, technicals, prices, position, onTrade, cash }: PortfolioCardProps) {
  const [isTradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
  
  const { refreshPortfolio } = usePortfolio();
  
  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  const signal = getTradeSignal(technicals, currentPrice);

  // Compute last price date
  const lastPriceDate = prices.length > 0 ? prices[prices.length - 1].date : null;
  const fundamentalsDate = fundamentals?.updatedAt;

  // Check if data is available
  const hasPriceData = prices.length > 0;
  const hasFundamentals = fundamentals !== null;
  const hasTechnicals = technicals !== null;

  // Get currency info
  const currency = getTickerCurrency(symbol);

  const handleOpenModal = (type: 'Buy' | 'Sell') => {
    setTradeType(type);
    setTradeModalOpen(true);
  };

  const handleTradeSubmit: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency, commissionPct, purchaseFeePct, purchasePrice) => {
    const session = localStorage.getItem('session');
    if (!session) throw new Error("Session not found");
    const username = JSON.parse(session).username;
    const url = tradeType === 'Buy' ? '/api/portfolio/buy' : '/api/portfolio/sell';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        assetType,
        symbol: identifier,
        quantity,
        price: purchasePrice ?? currentPrice,
        currency,
        market: position.market,
        commissionPct,
        purchaseFeePct,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `La ${tradeType.toLowerCase()} falló`);
    }
    onTrade();
    setTradeModalOpen(false);
    await refreshPortfolio();
  };
  
  const value = position.quantity * currentPrice;
  const gain = ((currentPrice - position.averagePrice) / position.averagePrice) * 100;

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
    <>
      <TradeModal
        isOpen={isTradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        onSubmit={handleTradeSubmit}
        tradeType={tradeType}
        assetName={symbol}
        assetType={position.type}
        identifier={symbol}
        price={currentPrice}
        cash={cash}
        maxShares={position.quantity}
        currency={position.currency}
      />
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 relative text-black">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{symbol}</h2>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              currency === 'ARS' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {currency}
            </span>
            {hasTechnicals && <SignalBadge signal={signal} />}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleOpenModal('Buy')} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700">Comprar</button>
            <button onClick={() => handleOpenModal('Sell')} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700">Vender</button>
          </div>
        </div>

        {/* Price Chart */}
        <div className="h-24 flex items-center justify-center bg-gray-50 rounded">
          {hasPriceData ? (
            <Line data={chartData} options={chartOptions} height={80} />
          ) : (
            <span className="text-gray-500 text-sm">Datos no disponibles</span>
          )}
        </div>

        {/* Position Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Cantidad:</span>
            <span className="ml-2 font-semibold">{position.quantity}</span>
          </div>
          <div>
            <span className="text-gray-600">Precio Promedio:</span>
            <span className="ml-2 font-semibold">${position.averagePrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600">Precio Actual:</span>
            <span className="ml-2 font-semibold">
              {hasPriceData ? `$${currentPrice.toFixed(2)}` : 'Datos no disponibles'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Valor:</span>
            <span className="ml-2 font-semibold">
              {hasPriceData ? formatCurrency(value, position.currency) : 'Datos no disponibles'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Ganancia:</span>
            <span className={`ml-2 font-semibold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {hasPriceData ? `${gain >= 0 ? '+' : ''}${gain.toFixed(2)}%` : 'Datos no disponibles'}
            </span>
          </div>
        </div>

        {/* Fundamentals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Fundamentales</h3>
          {hasFundamentals ? (
            <FundamentalsCompact fundamentals={fundamentals || null} showSector={true} />
          ) : (
            <span className="text-gray-500 text-sm">Datos no disponibles</span>
          )}
        </div>

        {/* Technicals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Técnicos</h3>
          {hasTechnicals ? (
            <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-700">
              <TechnicalDisplay label="RSI" indicatorKey="RSI" value={technicals?.rsi} />
              <TechnicalDisplay label="MACD" indicatorKey="MACD" value={technicals?.macd} />
              <TechnicalDisplay label="SMA 200" indicatorKey="SMA" value={technicals?.sma200} currentPrice={currentPrice} />
              <TechnicalDisplay label="EMA 50" indicatorKey="EMA" value={technicals?.ema50} currentPrice={currentPrice} />
              <TechnicalDisplay label="ADX" indicatorKey="ADX" value={technicals?.adx} />
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Datos no disponibles</span>
          )}
        </div>

        {/* Data Update Footer */}
        <div className="border-t pt-2 mt-2">
          <div className="text-xs text-gray-500 flex justify-between">
            <span>Precio: {lastPriceDate ? formatDate(lastPriceDate) : '—'}</span>
            <span>Fundamentales: {fundamentalsDate ? formatDate(fundamentalsDate) : '—'}</span>
          </div>
        </div>
      </div>
    </>
  );
} 