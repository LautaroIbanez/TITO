'use client';
import { useEffect, useState } from 'react';
import ScoopCard from '@/components/ScoopCard';
import { InvestorProfile } from '@/types';

const FIXED_LIST = ["AAPL", "MSFT", "TSLA", "AMZN", "NVDA", "BABA", "GOOGL", "JPM", "KO", "PFE"];

function getSuggestedStocks(profile: InvestorProfile, stocks: any[]) {
  // Simple logic: Conservative → low D/E, high ROE, low volatility
  // Moderate → balanced PE and ROA
  // Aggressive → high ROE, high PE
  if (!profile) return [];
  return stocks.map((stock) => {
    const f = stock.fundamentals || {};
    let isSuggested = false;
    if (profile.riskAppetite === 'Conservative') {
      isSuggested = (f.debtToEquity ?? 999) < 1 && (f.roe ?? 0) > 0.15;
    } else if (profile.riskAppetite === 'Balanced') {
      isSuggested = (f.peRatio ?? 0) > 5 && (f.peRatio ?? 0) < 25 && (f.roa ?? 0) > 0.05;
    } else if (profile.riskAppetite === 'Aggressive') {
      isSuggested = (f.roe ?? 0) > 0.2 && (f.peRatio ?? 0) > 20;
    }
    return { ...stock, isSuggested };
  });
}

export default function ScoopPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [portfolioSymbols, setPortfolioSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load portfolio symbols and scoop data
  const loadData = async () => {
    setLoading(true);
    const session = localStorage.getItem('session');
    let username = '';
    if (session) username = JSON.parse(session).username;
    // Fetch user profile and portfolio
    let userProfile = null;
    let userPositions: string[] = [];
    try {
      const res = await fetch(`/api/portfolio/data?username=${username}`);
      const data = await res.json();
      userProfile = data.profile || null;
      userPositions = (data.positions || []).map((p: any) => p.symbol);
      setPortfolioSymbols(userPositions);
      setProfile(userProfile);
    } catch {}
    // Fetch all stocks data
    const res = await fetch('/api/scoop');
    const stocksData = await res.json();
    // Only show stocks not in portfolio
    const filtered = stocksData.filter((s: any) => !userPositions.includes(s.symbol) && FIXED_LIST.includes(s.symbol));
    setStocks(getSuggestedStocks(userProfile, filtered));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddToPortfolio = async (symbol: string) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    try {
      const res = await fetch('/api/portfolio/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, symbol }),
      });
      if (res.ok) {
        await loadData(); // reload to sync scoop/portfolio
      }
    } catch {}
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loading ? (
          <div className="col-span-full text-center text-gray-500">Loading...</div>
        ) : (
          stocks.map((stock) => (
            <ScoopCard
              key={stock.symbol}
              stockData={stock}
              fundamentals={stock.fundamentals}
              technicals={{}}
              isSuggested={stock.isSuggested}
              inPortfolio={portfolioSymbols.includes(stock.symbol)}
              onAddToPortfolio={() => handleAddToPortfolio(stock.symbol)}
            />
          ))
        )}
      </div>
    </div>
  );
} 