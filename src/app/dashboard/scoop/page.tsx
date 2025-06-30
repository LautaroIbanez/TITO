'use client';
import { useEffect, useState } from 'react';
import ScoopCard from '@/components/ScoopCard';
import AvailableCapitalIndicator from '@/components/AvailableCapitalIndicator';
import { InvestorProfile, InvestmentGoal } from '@/types';
import { calculateRequiredReturn } from '@/utils/goalCalculator';
import dayjs from 'dayjs';
import { useScoop } from '@/contexts/ScoopContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { STOCK_CATEGORIES } from '@/utils/assetCategories';
import { getTickerCurrency, getTickerMarket } from '@/utils/tickers';

// Category display names
const CATEGORY_NAMES: Record<string, string> = {
  etfs: 'ETFs',
  tech: 'Tecnología',
  semiconductors: 'Semiconductores',
  communication: 'Comunicaciones',
  industrials: 'Industriales',
  defensive: 'Defensivas',
  materials: 'Materiales',
  healthcare: 'Salud',
  financials: 'Financieros',
  cyclical: 'Cíclicas',
  merval: 'Merval'
};

function getSuggestedStocks(
  profile: InvestorProfile | null,
  stocks: any[],
  requiredReturn: number
) {
  if (!profile || !stocks) return stocks.map(s => ({ ...s, isSuggested: false }));

  // Cap the required return for suggestions to a more realistic number (e.g., 30%)
  // A very high required return from user goals makes it impossible to find suggestions.
  const realisticRequiredReturn = Math.min(requiredReturn, 30);

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
    const meetsReturn = (f.roe ?? 0) * 100 > realisticRequiredReturn;
    const isSuggested = diff < 0.2 && meetsReturn;
    return { ...stock, isSuggested };
  });
}

export default function ScoopPage() {
  const [stocksByCategory, setStocksByCategory] = useState<Record<string, any[]>>({});
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [portfolioSymbols, setPortfolioSymbols] = useState<{ USD: string[]; ARS: string[] }>({ USD: [], ARS: [] });
  const [loading, setLoading] = useState(true);
  const [requiredReturn, setRequiredReturn] = useState(0);
  const { filterMode } = useScoop();
  const { portfolioData } = usePortfolio();

  // Load portfolio symbols and scoop data
  const loadData = async () => {
    setLoading(true);
    const session = localStorage.getItem('session');
    let username = '';
    if (session) username = JSON.parse(session).username;
    
    let userProfile: InvestorProfile | null = null;
    let userPositions: any[] = [];
    
    try {
      const res = await fetch(`/api/portfolio/data?username=${username}`);
      const data = await res.json();
      userProfile = data.profile || null;
      userPositions = data.positions || [];
      // Clasificar símbolos por moneda usando getTickerCurrency
      const symbolsByCurrency: { USD: string[]; ARS: string[] } = { USD: [], ARS: [] };
      userPositions.forEach((p: any) => {
        if (p.symbol) {
          const currency = getTickerCurrency(p.symbol);
          symbolsByCurrency[currency].push(p.symbol);
        }
      });
      setPortfolioSymbols(symbolsByCurrency);
      setProfile(userProfile);

      const goalsRes = await fetch(`/api/goals?username=${username}`);
      if(goalsRes.ok) {
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
      }
    } catch(e) {
      console.error("Failed to load user data or goals", e);
    }

    // Fetch trending stocks just to add a badge
    const trendingRes = await fetch('/api/scoop');
    const trendingData = await trendingRes.json();
    const trendingSymbols = (trendingData.quotes || []).map((q: any) => q.symbol);

    // Process each category
    const stocksByCategoryData: Record<string, any[]> = {};
    
    for (const [categoryKey, tickers] of Object.entries(STOCK_CATEGORIES)) {
      // Skip empty categories
      if (tickers.length === 0) continue;
      
      // Filter out symbols already in portfolio using currency detection
      const stocksToShowSymbols = tickers.filter(symbol => {
        const currency = getTickerCurrency(symbol);
        return !portfolioSymbols[currency].includes(symbol);
      });
      
      // Skip categories with no available stocks
      if (stocksToShowSymbols.length === 0) continue;

      // Enrich the stocks with all necessary data
      const enrichedStocks = await Promise.all(
        stocksToShowSymbols.map(async (symbol: string) => {
          const [fundamentals, technicals, prices] = await Promise.all([
            fetch(`/api/stocks/${symbol}?type=fundamentals`).then(res => res.ok ? res.json() : null),
            fetch(`/api/stocks/${symbol}?type=technicals`).then(res => res.ok ? res.json() : null),
            fetch(`/api/stocks/${symbol}?type=prices`).then(res => res.ok ? res.json() : [])
          ]);
          return {
            symbol,
            companyName: fundamentals?.longName || symbol,
            prices,
            fundamentals,
            technicals,
            isTrending: trendingSymbols.includes(symbol),
            currency: getTickerCurrency(symbol),
            market: getTickerMarket(symbol)
          };
        })
      );
      
      stocksByCategoryData[categoryKey] = getSuggestedStocks(userProfile, enrichedStocks, requiredReturn);
    }
    
    setStocksByCategory(stocksByCategoryData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get all suggested stocks across all categories
  const allSuggestedStocks = Object.values(stocksByCategory).flat().filter(s => s.isSuggested);

  return (
    <div className="space-y-8">
      <div className="flex gap-4 justify-end">
        <AvailableCapitalIndicator assetClass="stocks" currency="ARS" />
        <AvailableCapitalIndicator assetClass="stocks" currency="USD" />
      </div>
      
      {requiredReturn > 0 && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-lg text-sm text-blue-800">
          Para alcanzar tus metas, necesitas un retorno anual estimado de <strong>{(requiredReturn * 100).toFixed(2)}%</strong>.
          Las sugerencias se basan en un retorno más realista.
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-700 py-10">Cargando Oportunidades...</div>
      ) : (
        <>
          {filterMode === 'all' && allSuggestedStocks.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sugerencias para ti</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {allSuggestedStocks.map((stock) => (
                  <ScoopCard
                    key={stock.symbol}
                    stockData={stock}
                    fundamentals={stock.fundamentals}
                    technicals={stock.technicals}
                    isSuggested={stock.isSuggested}
                    isTrending={stock.isTrending}
                    inPortfolioUSD={portfolioSymbols.USD.includes(stock.symbol)}
                    inPortfolioARS={portfolioSymbols.ARS.includes(stock.symbol)}
                    onTrade={loadData}
                    cash={portfolioData?.cash ?? { ARS: 0, USD: 0 }}
                  />
                ))}
              </div>
            </div>
          )}

          {filterMode === 'suggested' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sugerencias para ti</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {allSuggestedStocks.map((stock) => (
                  <ScoopCard
                    key={stock.symbol}
                    stockData={stock}
                    fundamentals={stock.fundamentals}
                    technicals={stock.technicals}
                    isSuggested={stock.isSuggested}
                    isTrending={stock.isTrending}
                    inPortfolioUSD={portfolioSymbols.USD.includes(stock.symbol)}
                    inPortfolioARS={portfolioSymbols.ARS.includes(stock.symbol)}
                    onTrade={loadData}
                    cash={portfolioData?.cash ?? { ARS: 0, USD: 0 }}
                  />
                ))}
              </div>
            </div>
          )}
          
          {filterMode === 'all' && Object.keys(stocksByCategory).length > 0 && (
            <div className="mt-12 space-y-12">
              {Object.entries(stocksByCategory).map(([categoryKey, stocks]) => {
                const categoryName = CATEGORY_NAMES[categoryKey] || categoryKey;
                const categoryStocks = stocks.filter(s => !s.isSuggested);
                
                if (categoryStocks.length === 0) return null;
                
                return (
                  <div key={categoryKey}>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">{categoryName}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categoryStocks.map((stock) => (
                        <ScoopCard
                          key={stock.symbol}
                          stockData={stock}
                          fundamentals={stock.fundamentals}
                          technicals={stock.technicals}
                          isSuggested={stock.isSuggested}
                          isTrending={stock.isTrending}
                          inPortfolioUSD={portfolioSymbols.USD.includes(stock.symbol)}
                          inPortfolioARS={portfolioSymbols.ARS.includes(stock.symbol)}
                          onTrade={loadData}
                          cash={portfolioData?.cash ?? { ARS: 0, USD: 0 }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && Object.keys(stocksByCategory).length === 0 && (
            <div className="text-center text-gray-700 py-10">
              <h3 className="text-xl font-semibold">
                {filterMode === 'suggested' ? 'No hay sugerencias por ahora.' : 'No hay nuevas oportunidades por ahora.'}
              </h3>
              <p>
                {filterMode === 'suggested'
                  ? 'Ajusta tus metas o perfil de riesgo para ver nuevas sugerencias.'
                  : 'Todas las acciones analizadas ya están en tu portafolio.'}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
} 
