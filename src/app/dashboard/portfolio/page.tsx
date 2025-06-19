'use client';
import { useEffect, useState } from 'react';
import PortfolioCard from '@/components/PortfolioCard';
import ReturnComparison from '@/components/ReturnComparison';
import { calculatePortfolioReturn, compareWithBenchmarks } from '@/utils/returnCalculator';
import PortfolioTable from '@/components/PortfolioTable';
import PortfolioPieChart from '@/components/PortfolioPieChart';
import PortfolioHistoryChart from '@/components/PortfolioHistoryChart';
import PortfolioTransactions from '@/components/PortfolioTransactions';
import { calculatePortfolioValueHistory } from '@/utils/calculatePortfolioValue';

export default function PortfolioPage({ onPortfolioChange }: { onPortfolioChange?: () => void }) {
  const [positions, setPositions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, any[]>>({});
  const [valueHistory, setValueHistory] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);
  const [fundamentals, setFundamentals] = useState<Record<string, any>>({});
  const [technicals, setTechnicals] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchPortfolio() {
      setLoading(true);
      const session = localStorage.getItem('session');
      if (!session) return;
      const username = JSON.parse(session).username;
      const res = await fetch(`/api/portfolio/data?username=${username}`);
      const data = await res.json();
      setPositions(data.positions || []);
      setTransactions(data.transactions || []);
      setPrices(data.historicalPrices || {});
      setValueHistory(calculatePortfolioValueHistory(data.transactions || [], data.historicalPrices || {}, 90));
      setFundamentals(data.fundamentals || {});
      setTechnicals(data.technicals || {});
      // Calculate returns
      const prices: Record<string, any[]> = {};
      Object.entries(data.historicalPrices || {}).forEach(([symbol, arr]) => {
        prices[symbol] = arr as any[];
      });
      const portReturn = calculatePortfolioReturn(prices, '1y');
      setComparison(compareWithBenchmarks(portReturn));
      setLoading(false);
    }
    fetchPortfolio();
  }, []);

  const handleRemove = async (symbol: string) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    const res = await fetch('/api/portfolio/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, symbol }),
    });
    if (res.ok) {
      setPositions((prev) => prev.filter((s) => s.symbol !== symbol));
      if (onPortfolioChange) onPortfolioChange();
    }
  };

  return (
    <div className="space-y-8">
      <PortfolioHistoryChart valueHistory={valueHistory} />
      <PortfolioTransactions transactions={transactions} />
      {comparison && <ReturnComparison data={comparison} />}
      <PortfolioTable positions={positions} prices={prices} fundamentals={fundamentals} technicals={technicals} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-500">Loading...</div>
        ) : positions.length === 0 ? (
          <div className="col-span-full text-center text-gray-500">No stocks in your portfolio.</div>
        ) : (
          positions.map((stock) => (
            <PortfolioCard
              key={stock.symbol}
              symbol={stock.symbol}
              fundamentals={fundamentals[stock.symbol]}
              technicals={technicals[stock.symbol]}
              prices={prices[stock.symbol]}
              onRemove={() => handleRemove(stock.symbol)}
            />
          ))
        )}
      </div>
    </div>
  );
} 