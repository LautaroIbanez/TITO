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
import { getTickerCurrency, getTickerMarket, ensureBaSuffix } from '@/utils/tickers';

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
  const [nasdaqStocks, setNasdaqStocks] = useState<any[]>([]);
  const [bcbaStocks, setBcbaStocks] = useState<any[]>([]);
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [portfolioSymbols, setPortfolioSymbols] = useState<{ USD: string[]; ARS: string[] }>({ USD: [], ARS: [] });
  const [loading, setLoading] = useState(true);
  const [requiredReturn, setRequiredReturn] = useState(0);
  const { filterMode, currencyFilter } = useScoop();
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

    // Build ticker sets for NASDAQ and BCBA
    const nasdaqTickers: string[] = [];
    const bcbaTickers: string[] = [];

    // Process each category to build ticker sets
    for (const [categoryKey, tickers] of Object.entries(STOCK_CATEGORIES)) {
      // Skip empty categories
      if (tickers.length === 0) continue;
      
      for (const symbol of tickers) {
        // Skip symbols already in portfolio using currency detection
        const currency = getTickerCurrency(symbol);
        if (portfolioSymbols[currency].includes(symbol)) continue;

        if (categoryKey === 'merval') {
          // MERVAL tickers go to BCBA with .BA suffix
          bcbaTickers.push(ensureBaSuffix(symbol));
        } else {
          // Non-MERVAL tickers go to both NASDAQ and BCBA
          nasdaqTickers.push(symbol);
          bcbaTickers.push(ensureBaSuffix(symbol));
        }
      }
    }

    // Ensure all BCBA tickers end with .BA
    const validatedBcbaTickers = bcbaTickers.map(ticker => {
      if (!ticker.endsWith('.BA')) {
        return `${ticker}.BA`;
      }
      return ticker;
    });

    // Fetch data separately for each set using the new caching structure
    // Maintain separate caches for fundamentals (by base ticker) and prices/technicals (by full symbol)
    const fundamentalsCache = new Map<string, any>();
    const pricesCache = new Map<string, any[]>();
    const technicalsCache = new Map<string, any>();
    const { getBaseTicker } = await import('@/utils/tickers');

    const enrichStocks = async (tickers: string[]) => {
      return await Promise.all(
        tickers.map(async (symbol: string) => {
          const baseTicker = getBaseTicker(symbol);
          
          // Get fundamentals from cache or fetch if not available
          let fundamentals = fundamentalsCache.get(baseTicker);
          if (!fundamentals) {
            fundamentals = await fetch(`/api/stocks/${baseTicker}?type=fundamentals`)
              .then(res => res.ok ? res.json() : null);
            fundamentalsCache.set(baseTicker, fundamentals);
          }
          
          // Always fetch prices and technicals for the specific symbol
          const [prices, technicals] = await Promise.all([
            fetch(`/api/stocks/${symbol}?type=prices`).then(res => res.ok ? res.json() : []),
            fetch(`/api/stocks/${symbol}?type=technicals`).then(res => res.ok ? res.json() : null)
          ]);
          
          // Cache the results
          pricesCache.set(symbol, prices);
          technicalsCache.set(symbol, technicals);
          
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
    };

    // Fetch and process NASDAQ stocks
    const enrichedNasdaqStocks = await enrichStocks(nasdaqTickers);
    const suggestedNasdaqStocks = getSuggestedStocks(userProfile, enrichedNasdaqStocks, requiredReturn);
    setNasdaqStocks(suggestedNasdaqStocks);

    // Fetch and process BCBA stocks
    const enrichedBcbaStocks = await enrichStocks(validatedBcbaTickers);
    const suggestedBcbaStocks = getSuggestedStocks(userProfile, enrichedBcbaStocks, requiredReturn);
    setBcbaStocks(suggestedBcbaStocks);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar según currencyFilter
  const filteredNasdaqStocks = currencyFilter === 'all' ? nasdaqStocks : nasdaqStocks.filter(s => s.currency === currencyFilter);
  const filteredBcbaStocks = currencyFilter === 'all' ? bcbaStocks : bcbaStocks.filter(s => s.currency === currencyFilter);
  const filteredAllSuggestedStocks = currencyFilter === 'all'
    ? [...nasdaqStocks.filter(s => s.isSuggested), ...bcbaStocks.filter(s => s.isSuggested)]
    : [...filteredNasdaqStocks.filter(s => s.isSuggested), ...filteredBcbaStocks.filter(s => s.isSuggested)];

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
          {filterMode === 'suggested' && filteredAllSuggestedStocks.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Sugerencias para ti</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAllSuggestedStocks.map((stock) => (
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

          {filterMode === 'all' && (
            <>
              {/* NASDAQ Stocks Section */}
              {filteredNasdaqStocks.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Acciones NASDAQ (USD)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNasdaqStocks.map((stock) => (
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

              {/* BCBA Stocks Section */}
              {filteredBcbaStocks.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Acciones BCBA (ARS)</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBcbaStocks.map((stock) => (
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
            </>
          )}

          {!loading && filteredNasdaqStocks.length === 0 && filteredBcbaStocks.length === 0 && (
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
