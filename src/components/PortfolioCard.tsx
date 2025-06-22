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
import TradeModal, { TradeType } from './TradeModal';
import type { TradeModalProps } from './TradeModal';
import TechnicalDisplay from './TechnicalDisplay';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { RatioRow, StockBadges, formatDate } from './StockMetrics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface PortfolioCardProps {
  symbol: string;
  fundamentals?: Fundamentals | null;
  technicals: Technicals | null;
  prices: any[];
  position: { quantity: number; averagePrice: number };
  onTrade: () => void;
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

export default function PortfolioCard({ symbol, fundamentals, technicals, prices, position, onTrade, availableCash }: PortfolioCardProps) {
  const [modalState, setModalState] = useState<{ isOpen: boolean; tradeType: TradeType }>({ isOpen: false, tradeType: 'Buy' });
  
  const { refreshPortfolio } = usePortfolio();
  
  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  const signal = getTradeSignal(technicals, currentPrice);

  // Compute last price date
  const lastPriceDate = prices.length > 0 ? prices[prices.length - 1].date : null;
  const fundamentalsDate = fundamentals?.updatedAt;

  const handleTrade: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    
    const endpoint = modalState.tradeType === 'Buy' ? '/api/portfolio/buy' : '/api/portfolio/sell';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        assetType, 
        symbol: identifier, 
        quantity, 
        price: currentPrice 
      }),
    });

    if (res.ok) {
      onTrade();
      await refreshPortfolio(); // Refresh portfolio data from server
    } else {
      const data = await res.json();
      // Use a more user-friendly notification if available
      alert(`Error: ${data.error || 'Ocurrió un error en la transacción.'}`);
    }
  };
  
  const openModal = (tradeType: TradeType) => {
    setModalState({ isOpen: true, tradeType });
  };

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
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        onSubmit={handleTrade}
        tradeType={modalState.tradeType}
        assetName={symbol}
        assetType={'Stock'}
        identifier={symbol}
        price={currentPrice}
        availableCash={availableCash}
        maxShares={position.quantity}
      />
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 relative">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{symbol}</h2>
            <SignalBadge signal={signal} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => openModal('Buy')} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700">Comprar</button>
            <button onClick={() => openModal('Sell')} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700">Vender</button>
          </div>
        </div>

        {fundamentals && <StockBadges fundamentals={fundamentals} />}

        {/* Price Chart */}
        <div className="h-24 flex items-center justify-center bg-gray-50 rounded">
          {last90.length > 0 ? (
            <Line data={chartData} options={chartOptions} height={80} />
          ) : (
            <span className="text-gray-900 text-sm">[Gráfico de Precios]</span>
          )}
        </div>

        {/* Fundamentals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Fundamentales</h3>
          <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-700">
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

        {/* Position Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Cantidad:</span>
              <span className="font-mono">{position.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span>Precio Promedio:</span>
              <span className="font-mono">${position.averagePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor Actual:</span>
              <span className="font-mono">${(position.quantity * currentPrice).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>P&L:</span>
              <span className={`font-mono ${(currentPrice - position.averagePrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {((currentPrice - position.averagePrice) / position.averagePrice * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 