'use client';
import { useEffect, useState } from 'react';
import ScoopCard from '@/components/ScoopCard';
import { InvestorProfile, InvestmentGoal } from '@/types';
import { calculateRequiredReturn } from '@/utils/goalCalculator';
import dayjs from 'dayjs';

const FIXED_LIST = ["AAPL", "MSFT", "TSLA", "AMZN", "NVDA", "BABA", "GOOGL", "JPM", "KO", "PFE"];

function getSuggestedStocks(
  profile: InvestorProfile,
  stocks: any[],
  requiredReturn: number
) {
  if (!profile) return [];

  const riskScores: Record<string, number> = {};
  stocks.forEach(stock => {
    const f = stock.fundamentals || {};
    // Simplified risk score: high PE/beta is risky, high ROE is good
    const peRisk = Math.min((f.peRatio ?? 20) / 40, 1);
    const betaRisk = Math.min((f.beta ?? 1) / 2, 1);
    const qualityFactor = Math.max(1 - (f.roe ?? 0), 0); // lower roe is "riskier"
    riskScores[stock.symbol] = (peRisk + betaRisk + qualityFactor) / 3;
  });

  // Target risk from 0 (low) to 1 (high)
  let targetRisk = 0.5;
  if (profile.riskAppetite === 'Conservador') targetRisk = 0.3;
  if (profile.riskAppetite === 'Agresivo') targetRisk = 0.7;

  // Adjust risk based on knowledge and holding period
  if (profile.knowledgeLevels?.['stocks'] === 'Alto') targetRisk += 0.1;
  if (profile.holdingPeriod === 'Largo plazo (> 5 años)') targetRisk += 0.1;

  targetRisk = Math.min(1, Math.max(0, targetRisk));

  return stocks.map(stock => {
    const score = riskScores[stock.symbol];
    const diff = Math.abs(score - targetRisk);
    const f = stock.fundamentals || {};
    // Suggest if risk is acceptable AND return is high enough
    const meetsReturn = (f.roe ?? 0) * 100 > requiredReturn;
    const isSuggested = diff < 0.2 && meetsReturn;
    return { ...stock, isSuggested };
  });
}

export default function ScoopPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [portfolioSymbols, setPortfolioSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiredReturn, setRequiredReturn] = useState(0);
  const [availableCash, setAvailableCash] = useState(0);

  // Load portfolio symbols and scoop data
  const loadData = async () => {
    setLoading(true);
    const session = localStorage.getItem('session');
    let username = '';
    if (session) username = JSON.parse(session).username;
    // Fetch user profile and portfolio
    let userProfile = null;
    let userPositions: string[] = [];
    let userAvailableCash = 0;
    try {
      const res = await fetch(`/api/portfolio/data?username=${username}`);
      const data = await res.json();
      userProfile = data.profile || null;
      userPositions = (data.positions || []).map((p: any) => p.symbol);
      setPortfolioSymbols(userPositions);
      setProfile(userProfile);
      userAvailableCash = data.availableCash ?? 0;
      setAvailableCash(userAvailableCash);

      const goalsRes = await fetch(`/api/goals?username=${username}`);
      const goals: InvestmentGoal[] = await goalsRes.json();
      
      if (goals && goals.length > 0) {
        const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
        const totalInitial = goals.reduce((sum, g) => sum + g.initialDeposit, 0);
        const totalMonthly = goals.reduce((sum, g) => sum + g.monthlyContribution, 0);
        const maxDate = new Date(Math.max(...goals.map(g => new Date(g.targetDate).getTime())));
        const years = dayjs(maxDate).diff(dayjs(), 'year', true);

        if (years > 0) {
          const reqReturn = calculateRequiredReturn(totalTarget, years, totalInitial, totalMonthly);
          setRequiredReturn(reqReturn);
        }
      }
    } catch {}
    // Fetch all stocks data
    const res = await fetch('/api/scoop');
    const stocksData = await res.json();
    // Only show stocks not in portfolio
    const filtered = stocksData.filter((s: any) => !userPositions.includes(s.symbol) && FIXED_LIST.includes(s.symbol));
    setStocks(getSuggestedStocks(userProfile, filtered, requiredReturn));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [requiredReturn]); // Reload if requiredReturn changes

  return (
    <div>
      {requiredReturn > 0 && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-800">
          To meet your goals, you need an estimated annual return of <strong>{requiredReturn.toFixed(2)}%</strong>.
          Suggestions are filtered based on this requirement.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {loading ? (
          <div className="col-span-full text-center text-gray-500">Loading...</div>
        ) : (
          stocks.map((stock) => (
            <ScoopCard
              key={stock.symbol}
              stockData={stock}
              fundamentals={stock.fundamentals}
              technicals={stock.technicals}
              isSuggested={stock.isSuggested}
              inPortfolio={portfolioSymbols.includes(stock.symbol)}
              onTrade={loadData}
              availableCash={availableCash}
            />
          ))
        )}
      </div>
    </div>
  );
} 