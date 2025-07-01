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
import { getTickerCurrency, getTickerMarket } from '@/utils/tickers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface ScoopCardProps {
  stockData: any;
  fundamentals: Fundamentals | null;
  technicals: Technicals | null;
  isSuggested: boolean;
  isTrending: boolean;
  inPortfolioUSD: boolean;
  inPortfolioARS: boolean;
  onTrade: () => void;
  cash: { ARS: number; USD: number };
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
  inPortfolioUSD,
  inPortfolioARS,
  onTrade,
  cash,
}: ScoopCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [market, setMarket] = useState<'NASDAQ' | 'BCBA'>(getTickerMarket(stockData.symbol));
  const [localPrice, setLocalPrice] = useState<number | null>(null);
  
  // Display states for current market data
  const [displayPrices, setDisplayPrices] = useState<any[]>(stockData?.prices || []);
  const [displayFundamentals, setDisplayFundamentals] = useState<Fundamentals | null>(fundamentals);
  const [displayTechnicals, setDisplayTechnicals] = useState<Technicals | null>(technicals);
  
  // BCBA caches
  const [bcbaPrices, setBcbaPrices] = useState<any[]>([]);
  const [bcbaFundamentals, setBcbaFundamentals] = useState<Fundamentals | null>(null);
  const [bcbaTechnicals, setBcbaTechnicals] = useState<Technicals | null>(null);
  const [bcbaDataLoaded, setBcbaDataLoaded] = useState(false);

  const currentPrice = displayPrices.length > 0 ? displayPrices[displayPrices.length - 1].close : 0;
  const signal = getTradeSignal(displayTechnicals, currentPrice);
  
  const lastPriceDate = displayPrices.length > 0 ? displayPrices[displayPrices.length - 1].date : null;
  const fundamentalsDate = displayFundamentals?.updatedAt;
  
  // Get currency and market info
  const currency = getTickerCurrency(stockData.symbol);
  const tickerMarket = getTickerMarket(stockData.symbol);
  
  const chartData = {
    labels: displayPrices.map((p: any) => p.date),
    datasets: [
      {
        label: 'Close',
        data: displayPrices.map((p: any) => p.close),
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

  const handleMarketChange = async (newMarket: 'NASDAQ' | 'BCBA') => {
    setMarket(newMarket);
    
    if (newMarket === 'BCBA') {
      // Use cached BCBA data if available
      if (bcbaDataLoaded) {
        setDisplayPrices(bcbaPrices);
        setDisplayFundamentals(bcbaFundamentals || fundamentals);
        setDisplayTechnicals(bcbaTechnicals);
        return;
      }
      
      // Fetch BCBA data for the first time
      try {
        const [pricesRes, fundamentalsRes, technicalsRes] = await Promise.all([
          fetch(`/api/stocks/${stockData.symbol}.BA?type=prices`),
          fetch(`/api/stocks/${stockData.symbol}.BA?type=fundamentals`),
          fetch(`/api/stocks/${stockData.symbol}.BA?type=technicals`)
        ]);
        
        const bcbaPricesData = pricesRes.ok ? await pricesRes.json() : [];
        const bcbaFundamentalsData = fundamentalsRes.ok ? await fundamentalsRes.json() : fundamentals;
        const bcbaTechnicalsData = technicalsRes.ok ? await technicalsRes.json() : null;
        
        // Cache the BCBA data
        setBcbaPrices(bcbaPricesData);
        setBcbaFundamentals(bcbaFundamentalsData);
        setBcbaTechnicals(bcbaTechnicalsData);
        setBcbaDataLoaded(true);
        
        // Update display data
        setDisplayPrices(bcbaPricesData);
        setDisplayFundamentals(bcbaFundamentalsData);
        setDisplayTechnicals(bcbaTechnicalsData);
        
        // Update local price if available
        if (bcbaPricesData.length > 0) {
          setLocalPrice(bcbaPricesData[bcbaPricesData.length - 1].close);
        }
      } catch (error) {
        console.error('Failed to fetch BCBA data for', stockData.symbol, error);
        // Fallback to original data if BCBA fetch fails
        setDisplayPrices(stockData?.prices || []);
        setDisplayFundamentals(fundamentals);
        setDisplayTechnicals(technicals);
      }
    } else {
      // Switch back to NASDAQ data
      setDisplayPrices(stockData?.prices || []);
      setDisplayFundamentals(fundamentals);
      setDisplayTechnicals(technicals);
      setLocalPrice(null);
    }
  };

  const handleBuy: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency, commissionPct, purchaseFeePct) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    
    const symbol = market === 'BCBA' ? `${stockData.symbol}.BA` : stockData.symbol;

    const res = await fetch('/api/portfolio/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        assetType: 'Stock',
        symbol,
        quantity,
        price: currentPrice,
        currency,
        market,
        commissionPct,
        purchaseFeePct,
      }),
    });
    if (res.ok) {
      onTrade();
      setIsModalOpen(false);
    } else {
      const data = await res.json();
      alert(`Error: ${data.error}`);
    }
  };

  // Check if data is available
  const hasPriceData = displayPrices.length > 0;
  const hasFundamentals = displayFundamentals !== null;
  const hasTechnicals = displayTechnicals !== null;

  return (
    <>
      <TradeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBuy}
        tradeType="Buy"
        assetName={stockData.companyName || stockData.symbol}
        assetType="Stock"
        identifier={stockData.symbol}
        price={currentPrice}
        cash={cash}
        currency={market === 'BCBA' ? 'ARS' : 'USD'}
      />
      
      <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 relative">
        {/* Header */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{stockData.symbol}</h2>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              currency === 'ARS' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {currency}
            </span>
            {isSuggested && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">Sugerido</span>}
            {isTrending && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-semibold">Trending</span>}
            {inPortfolioUSD && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">USD</span>}
            {inPortfolioARS && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">ARS</span>}
          </div>
          <button onClick={() => setIsModalOpen(true)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700">
            Comprar
          </button>
        </div>

        {/* Market Selector - Only show if symbol ends with .BA or getTickerMarket(symbol) === 'BCBA' */}
        {(stockData.symbol.endsWith('.BA') || getTickerMarket(stockData.symbol) === 'BCBA') && (
          <div className="flex gap-2">
            <button
              onClick={() => handleMarketChange('NASDAQ')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                market === 'NASDAQ' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              NASDAQ
            </button>
            <button
              onClick={() => handleMarketChange('BCBA')}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                market === 'BCBA' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              BCBA
            </button>
          </div>
        )}

        {/* Company Name */}
        <p className="text-sm text-gray-600">{stockData.companyName || 'Nombre no disponible'}</p>

        {/* Price Chart */}
        <div className="h-24 flex items-center justify-center bg-gray-50 rounded">
          {hasPriceData ? (
            <Line data={chartData} options={chartOptions} height={80} />
          ) : (
            <span className="text-gray-500 text-sm">Datos no disponibles</span>
          )}
        </div>

        {/* Current Price and Signal */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-gray-900">
              {hasPriceData ? `$${currentPrice.toFixed(2)}` : 'Datos no disponibles'}
            </span>
          </div>
          {hasTechnicals && <SignalBadge signal={signal} />}
        </div>

        {/* Fundamentals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Fundamentales</h3>
          {hasFundamentals ? (
            <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-700">
              <RatioRow label="PE" value={displayFundamentals?.peRatio} metric="peRatio" />
              <RatioRow label="PB" value={displayFundamentals?.pbRatio} metric="pbRatio" />
              <RatioRow label="EV/EBITDA" value={displayFundamentals?.evToEbitda} metric="evToEbitda" />
              <RatioRow label="P/FCF" value={displayFundamentals?.priceToFCF} metric="priceToFCF" />
              <RatioRow label="ROE" value={displayFundamentals?.roe} metric="roe" />
              <RatioRow label="ROA" value={displayFundamentals?.roa} metric="roa" />
              <RatioRow label="Net Margin" value={displayFundamentals?.netMargin} metric="netMargin" />
              <RatioRow label="D/EBITDA" value={displayFundamentals?.debtToEbitda} metric="debtToEbitda" />
              <RatioRow label="D/E" value={displayFundamentals?.debtToEquity} metric="debtToEquity" />
              <RatioRow label="FCF (M)" value={displayFundamentals?.freeCashFlow} metric="freeCashFlow" />
            </div>
          ) : (
            <span className="text-gray-500 text-sm">Datos no disponibles</span>
          )}
        </div>

        {/* Technicals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Técnicos</h3>
          {hasTechnicals ? (
            <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-700">
              <TechnicalDisplay label="RSI" indicatorKey="RSI" value={displayTechnicals?.rsi} />
              <TechnicalDisplay label="MACD" indicatorKey="MACD" value={displayTechnicals?.macd} />
              <TechnicalDisplay label="SMA 200" indicatorKey="SMA" value={displayTechnicals?.sma200} currentPrice={currentPrice} />
              <TechnicalDisplay label="EMA 50" indicatorKey="EMA" value={displayTechnicals?.ema50} currentPrice={currentPrice} />
              <TechnicalDisplay label="ADX" indicatorKey="ADX" value={displayTechnicals?.adx} />
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
