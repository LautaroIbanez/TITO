"use client";
import React, { useEffect, useState } from 'react';
import CryptoCard from '@/components/CryptoCard';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { PriceData, Technicals } from '@/types/finance';

const CRYPTOS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', name: 'Ethereum' },
  { symbol: 'BNBUSDT', name: 'BNB' },
  { symbol: 'SOLUSDT', name: 'Solana' },
  { symbol: 'ADAUSDT', name: 'Cardano' },
  { symbol: 'MATICUSDT', name: 'Polygon' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin' },
];

export default function CryptoDashboardPage() {
  const { portfolioData, refreshPortfolio } = usePortfolio();
  const cash = portfolioData?.cash || { ARS: 0, USD: 0 };
  const [cryptoData, setCryptoData] = useState<Record<string, { prices: PriceData[]; technicals: Technicals | null }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all(
      CRYPTOS.map(async ({ symbol }) => {
        const [pricesRes, technicalsRes] = await Promise.all([
          fetch(`/api/crypto/${symbol}?type=prices`),
          fetch(`/api/crypto/${symbol}?type=technicals`),
        ]);
        const prices = pricesRes.ok ? await pricesRes.json() : [];
        const technicals = technicalsRes.ok ? await technicalsRes.json() : null;
        return { symbol, prices, technicals };
      })
    ).then((results) => {
      const data: Record<string, { prices: PriceData[]; technicals: Technicals | null }> = {};
      results.forEach(({ symbol, prices, technicals }) => {
        data[symbol] = { prices, technicals };
      });
      setCryptoData(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Criptomonedas</h1>
      {loading ? (
        <div className="text-center text-gray-600">Cargando datos de criptomonedas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CRYPTOS.map(({ symbol, name }) => (
            <CryptoCard
              key={symbol}
              symbol={symbol}
              prices={cryptoData[symbol]?.prices || []}
              technicals={cryptoData[symbol]?.technicals || null}
              cash={cash}
              onTrade={refreshPortfolio}
            />
          ))}
        </div>
      )}
    </div>
  );
} 