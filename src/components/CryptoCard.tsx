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

export default function CryptoCard({ symbol, prices, technicals, cash, onTrade }: CryptoCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<'Buy' | 'Sell'>('Buy');
  const { refreshPortfolio } = usePortfolio();

  const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : 0;

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

  const handleTrade: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency, commissionPct, purchaseFeePct) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    const res = await fetch(`/api/portfolio/${tradeType.toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        assetType: 'Crypto',
        symbol,
        quantity,
        price: currentPrice,
        currency,
        commissionPct,
        purchaseFeePct,
      }),
    });
    if (res.ok) {
      onTrade();
      setIsModalOpen(false);
      await refreshPortfolio();
    } else {
      const data = await res.json();
      alert(`Error: ${data.error}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-900">{symbol}</h2>
        <div className="flex gap-2">
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
        <span className="text-gray-700 text-sm">Precio actual: </span>
        <span className="font-mono text-lg text-gray-900">US${currentPrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
        currency="USD"
      />
    </div>
  );
} 