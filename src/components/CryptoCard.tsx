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
import { Technicals, PriceData } from '../types/finance';
import { getTradeSignal, TradeSignal } from '@/utils/tradeSignal';
import TradeModal, { TradeModalProps } from './TradeModal';
import TechnicalDisplay from './TechnicalDisplay';
import { usePortfolio } from '@/contexts/PortfolioContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface CryptoCardProps {
  symbol: string;
  prices: PriceData[];
  technicals: Technicals | null;
  cash: { ARS: number; USD: number };
  onTrade: () => void;
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

export default function CryptoCard({ symbol, prices, technicals, cash, onTrade }: CryptoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
  const [selectedCurrency, setSelectedCurrency] = useState<'ARS' | 'USD'>('USD');
  const { refreshPortfolio } = usePortfolio();

  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;
  const signal = getTradeSignal(technicals, currentPrice);

  const chartData = {
    labels: prices.map((p) => p.date),
    datasets: [
      {
        label: 'Close',
        data: prices.map((p) => p.close),
        fill: true,
        borderColor: '#f59e42',
        backgroundColor: 'rgba(245,158,66,0.08)',
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

  const handleTrade: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency, commissionPct, purchaseFeePct, purchasePrice) => {
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
        commissionPct,
        purchaseFeePct,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `La ${tradeType.toLowerCase()} falló`);
    }
    onTrade();
    setIsModalOpen(false);
    await refreshPortfolio();
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 max-w-xl mx-auto text-black">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-black">{symbol}</h2>
          <SignalBadge signal={signal} />
        </div>
        <div className="flex gap-2">
          {tradeType === 'Buy' && (
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as 'ARS' | 'USD')}
              className="px-2 py-1 border border-gray-300 rounded text-xs bg-white text-black"
            >
              <option value="USD">USD</option>
              <option value="ARS">ARS</option>
            </select>
          )}
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold"
            onClick={() => { setTradeType('Buy'); setIsModalOpen(true); }}
          >Comprar</button>
          <button
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold"
            onClick={() => { setTradeType('Sell'); setIsModalOpen(true); }}
          >Vender</button>
        </div>
      </div>
      <div className="mb-2">
        <span className="text-black text-sm">Precio actual: </span>
        <span className="font-mono text-lg text-black">US${currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        {selectedCurrency === 'ARS' && (
          <div className="text-xs text-black mt-1">
            💱 Las compras en ARS se convertirán automáticamente a USD
          </div>
        )}
      </div>
      <div className="h-32 mb-4">
        <Line data={chartData} options={chartOptions} height={120} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TechnicalDisplay label="RSI" indicatorKey="RSI" value={technicals?.rsi} currentPrice={currentPrice} />
        <TechnicalDisplay label="MACD" indicatorKey="MACD" value={technicals?.macd} currentPrice={currentPrice} />
        <TechnicalDisplay label="SMA 200" indicatorKey="SMA" value={technicals?.sma200} currentPrice={currentPrice} />
        <TechnicalDisplay label="EMA 12" indicatorKey="EMA" value={technicals?.ema12} currentPrice={currentPrice} />
        <TechnicalDisplay label="EMA 26" indicatorKey="EMA" value={technicals?.ema26} currentPrice={currentPrice} />
        <TechnicalDisplay label="EMA 50" indicatorKey="EMA" value={technicals?.ema50} currentPrice={currentPrice} />
        <TechnicalDisplay label="ADX" indicatorKey="ADX" value={technicals?.adx} currentPrice={currentPrice} />
      </div>
      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleTrade}
        tradeType={tradeType}
        assetName={symbol}
        assetType="Crypto"
        identifier={symbol}
        price={currentPrice}
        cash={cash}
        currency={selectedCurrency}
      />
    </div>
  );
} 