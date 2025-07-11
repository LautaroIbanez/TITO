'use client';
import React, { useState, useEffect } from 'react';
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
import TradeModal, { TradeModalProps } from './TradeModal';
import TechnicalDisplay from './TechnicalDisplay';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { RatioRow, StockBadges, formatDate } from './StockMetrics';
import FundamentalsCompact from './FundamentalsCompact';
import { getTickerCurrency, getTickerMarket, ensureBaSuffix } from '@/utils/tickers';
import { formatCurrency } from '@/utils/goalCalculator';
import SignalBadge from './SignalBadge';

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
  // Calculate initial currentPrice before useState calls
  const initialPrices = stockData?.prices || [];
  const initialCurrentPrice = initialPrices.length > 0 ? initialPrices[initialPrices.length - 1].close : 0;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [market, setMarket] = useState<'NASDAQ' | 'BCBA'>(getTickerMarket(stockData.symbol));
  const [modalPrice, setModalPrice] = useState(initialCurrentPrice);
  
  // Display states for current market data
  const [displayPrices, setDisplayPrices] = useState<any[]>(initialPrices);
  const [displayFundamentals, setDisplayFundamentals] = useState<Fundamentals | null>(fundamentals);
  const [displayTechnicals, setDisplayTechnicals] = useState<Technicals | null>(technicals);
  
  // BCBA caches
  const [bcbaPrices, setBcbaPrices] = useState<any[]>([]);
  const [bcbaFundamentals, setBcbaFundamentals] = useState<Fundamentals | null>(null);
  const [bcbaTechnicals, setBcbaTechnicals] = useState<Technicals | null>(null);
  const [bcbaDataLoaded, setBcbaDataLoaded] = useState(false);

  // Calculate currentPrice from displayPrices
  const currentPrice = displayPrices.length > 0 ? displayPrices[displayPrices.length - 1].close : 0;
  
  // Update modalPrice when currentPrice changes
  useEffect(() => {
    setModalPrice(currentPrice);
  }, [currentPrice]);
  
  const signal = getTradeSignal(displayTechnicals, currentPrice);
  
  const lastPriceDate = displayPrices.length > 0 ? displayPrices[displayPrices.length - 1].date : null;
  const fundamentalsDate = displayFundamentals?.updatedAt;
  
  // Get currency based on current market
  const currency = market === 'BCBA' ? 'ARS' : 'USD';
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
        // Update modalPrice with BCBA price
        const bcbaCurrentPrice = bcbaPrices.length > 0 ? bcbaPrices[bcbaPrices.length - 1].close : 0;
        setModalPrice(bcbaCurrentPrice);
        return;
      }
      
      // Fetch BCBA data for the first time
      try {
        const [pricesRes, fundamentalsRes, technicalsRes] = await Promise.all([
          fetch(`/api/stocks/${ensureBaSuffix(stockData.symbol)}?type=prices`),
          fetch(`/api/stocks/${ensureBaSuffix(stockData.symbol)}?type=fundamentals`),
          fetch(`/api/stocks/${ensureBaSuffix(stockData.symbol)}?type=technicals`)
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
        
        // Update modalPrice with BCBA price
        const bcbaCurrentPrice = bcbaPricesData.length > 0 ? bcbaPricesData[bcbaPricesData.length - 1].close : 0;
        setModalPrice(bcbaCurrentPrice);
        
      } catch (error) {
        console.error('Failed to fetch BCBA data for', stockData.symbol, error);
        // Fallback to original data if BCBA fetch fails
        setDisplayPrices(stockData?.prices || []);
        setDisplayFundamentals(fundamentals);
        setDisplayTechnicals(technicals);
        // Reset modalPrice to original price
        const originalPrice = stockData?.prices?.length > 0 ? stockData.prices[stockData.prices.length - 1].close : 0;
        setModalPrice(originalPrice);
      }
    } else {
      // Switch back to NASDAQ data
      setDisplayPrices(stockData?.prices || []);
      setDisplayFundamentals(fundamentals);
      setDisplayTechnicals(technicals);
      // Update modalPrice with NASDAQ price
      const nasdaqCurrentPrice = stockData?.prices?.length > 0 ? stockData.prices[stockData.prices.length - 1].close : 0;
      setModalPrice(nasdaqCurrentPrice);
    }
  };

  const handleBuy: TradeModalProps['onSubmit'] = async (quantity, assetType, identifier, currency, commissionPct, purchaseFeePct, purchasePrice) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    const symbol = market === 'BCBA' ? ensureBaSuffix(stockData.symbol) : stockData.symbol;
    const res = await fetch('/api/portfolio/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        assetType: 'Stock',
        symbol,
        quantity,
        price: purchasePrice ?? modalPrice,
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
        price={modalPrice}
        cash={cash}
        currency={currency}
        assetClass="stocks"
        market={market}
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

        {/* Market Selector - Only show if symbol has both NASDAQ and BCBA variants */}
        {(() => {
          // Si el símbolo termina en .BA, verificamos si existe el símbolo base (sin .BA) en el universo de acciones
          const baseSymbol = stockData.symbol.endsWith('.BA') ? stockData.symbol.replace(/\.BA$/, '') : stockData.symbol;
          // Suponemos que si el stockData tiene un campo hasNasdaqVariant o similar, lo usamos. Si no, solo mostramos el selector si el símbolo no termina en .BA
          // Aquí puedes adaptar la lógica según tu fuente de datos
          const hasBothMarkets = stockData.hasNasdaqVariant || stockData.hasBcbaVariant;
          if (hasBothMarkets) {
            return (
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
            );
          }
          return null;
        })()}

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
              {hasPriceData ? formatCurrency(currentPrice, currency) : 'Datos no disponibles'}
            </span>
          </div>
          {hasTechnicals && <SignalBadge signal={signal} />}
        </div>

        {/* Fundamentals */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Fundamentales</h3>
          {hasFundamentals ? (
            <FundamentalsCompact fundamentals={displayFundamentals} symbol={stockData.symbol} showSector={true} />
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
