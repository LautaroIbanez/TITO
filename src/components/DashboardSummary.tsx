'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InvestmentGoal, PortfolioTransaction, StrategyRecommendation, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';
import { calculatePortfolioValueHistory, PortfolioValueHistory } from '@/utils/calculatePortfolioValue';
import { calculateInvestedCapital } from '@/utils/investedCapital';
import { usePortfolio } from '@/contexts/PortfolioContext';
import GoalProgress from './GoalProgress';
import { formatCurrency } from '@/utils/goalCalculator';

export default function DashboardSummary() {
  const [portfolioValueARS, setPortfolioValueARS] = useState(0);
  const [portfolioValueUSD, setPortfolioValueUSD] = useState(0);
  const [firstGoal, setFirstGoal] = useState<InvestmentGoal | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bonds, setBonds] = useState<Bond[]>([]);
  
  const { portfolioData, strategy, loading, error, portfolioVersion } = usePortfolio();

  useEffect(() => {
    async function fetchData() {
      const session = localStorage.getItem('session');
      if (!session) return;
      const sessionData = JSON.parse(session);
      const username = sessionData.username;
      
      if (sessionData.firstTime) {
        setShowOnboarding(true);
      }

      const [goalsRes, bondsRes] = await Promise.all([
        fetch(`/api/goals?username=${username}`),
        fetch('/api/bonds')
      ]);

      if (goalsRes.ok) {
        const goals = await goalsRes.json();
        if (goals.length > 0) {
          setFirstGoal(goals[0]);
        }
      }

      if (bondsRes.ok) {
        const bondsData = await bondsRes.json();
        setBonds(bondsData);
      }
    }

    if (portfolioData) {
      // Calculate portfolio value history
      const history = calculatePortfolioValueHistory(
        portfolioData.transactions || [],
        portfolioData.historicalPrices || {},
        { days: 90 }
      );
      
      const latestValue = history.length > 0 ? history[history.length - 1] : { valueARS: 0, valueUSD: 0 };
      setPortfolioValueARS(latestValue.valueARS);
      setPortfolioValueUSD(latestValue.valueUSD);
    }

    fetchData();
  }, [portfolioData, portfolioVersion]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    const session = localStorage.getItem('session');
    if (session) {
      const sessionData = JSON.parse(session);
      delete sessionData.firstTime;
      localStorage.setItem('session', JSON.stringify(sessionData));
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getActionLabel = (recommendation: StrategyRecommendation) => {
    switch (recommendation.action) {
      case 'buy': return 'Comprar';
      case 'sell': return 'Vender';
      case 'hold': return 'Mantener';
      case 'rotate': return 'Rotar';
      case 'increase': return 'Aumentar';
      case 'decrease': return 'Reducir';
      default: return recommendation.action;
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  if (!portfolioData) {
    return <div className="text-center text-gray-500">Could not load user data.</div>;
  }
  
  const investedCapitalARS = calculateInvestedCapital(portfolioData.transactions, 'ARS');
  const investedCapitalUSD = calculateInvestedCapital(portfolioData.transactions, 'USD');
    
  const netGainsARS = portfolioValueARS - investedCapitalARS;
  const gainsColorARS = netGainsARS >= 0 ? 'text-green-600' : 'text-red-600';

  const netGainsUSD = portfolioValueUSD - investedCapitalUSD;
  const gainsColorUSD = netGainsUSD >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-8">
       {/* Onboarding Banner */}
       {showOnboarding && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-lg shadow-md relative">
          <button
            onClick={handleDismissOnboarding}
            className="absolute top-2 right-2 text-blue-600 hover:text-blue-800"
          >
            &times;
          </button>
          <h4 className="font-bold mb-2">¡Bienvenido a TITO!</h4>
          <p className="mb-4">Tu perfil está completo. Aquí tienes algunos pasos para empezar:</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/portfolio" className="text-sm font-semibold bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              Deposita Fondos
            </Link>
            <Link href="/dashboard/scoop" className="text-sm font-semibold bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              Revisa Recomendaciones
            </Link>
            <Link href="/dashboard/goals" className="text-sm font-semibold bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              Define tus Metas
            </Link>
          </div>
        </div>
      )}

      {/* Strategy Recommendations */}
      {strategy && strategy.recommendations.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Sugerencias de Estrategia</h3>
            <span className="text-sm text-gray-500">Perfil: {strategy.riskLevel}</span>
          </div>
          
          <div className="space-y-3 mb-4">
            {strategy.recommendations.map((recommendation) => (
              <div key={recommendation.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(recommendation.priority)}`}>
                  {getActionLabel(recommendation)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{recommendation.reason}</p>
                  {recommendation.symbol && recommendation.targetSymbol && (
                    <p className="text-xs text-gray-600 mt-1">
                      {recommendation.symbol} → {recommendation.targetSymbol}
                    </p>
                  )}
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  recommendation.expectedImpact === 'positive' ? 'bg-green-100 text-green-700' :
                  recommendation.expectedImpact === 'negative' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {recommendation.expectedImpact === 'positive' ? 'Positivo' :
                   recommendation.expectedImpact === 'negative' ? 'Negativo' : 'Neutral'}
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-xs text-gray-600 text-center border-t pt-3">
            Esta información es orientativa y no constituye asesoramiento financiero.
          </div>
        </div>
      )}

      {/* Portfolio Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow col-span-1 lg:col-span-3">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Valor Total del Portafolio</h3>
          <div className="flex items-baseline gap-x-6">
            <p className="text-3xl font-semibold text-gray-900">{formatCurrency(portfolioValueARS, 'ARS')}</p>
            <p className="text-xl font-medium text-gray-600">{formatCurrency(portfolioValueUSD, 'USD')}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Capital Invertido (ARS)</h3>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(investedCapitalARS, 'ARS')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Ganancias / Pérdidas (ARS)</h3>
          <p className={`text-2xl font-semibold ${gainsColorARS}`}> 
            {netGainsARS >= 0 ? '+' : ''}{formatCurrency(netGainsARS, 'ARS')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Capital Invertido (USD)</h3>
          <p className="text-2xl font-semibold text-gray-900">{formatCurrency(investedCapitalUSD, 'USD')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Ganancias / Pérdidas (USD)</h3>
          <p className={`text-2xl font-semibold ${gainsColorUSD}`}> 
            {netGainsUSD >= 0 ? '+' : ''}{formatCurrency(netGainsUSD, 'USD')}
          </p>
        </div>
         <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Efectivo Disponible</h3>
          <p className="text-xl font-semibold text-blue-600">{formatCurrency(portfolioData.cash?.ARS ?? 0, 'ARS')}</p>
          <p className="text-xl font-semibold text-green-600">{formatCurrency(portfolioData.cash?.USD ?? 0, 'USD')}</p>
        </div>
      </div>

      {firstGoal && (
        <GoalProgress 
          goal={firstGoal} 
          valueHistory={
            calculatePortfolioValueHistory(
              portfolioData.transactions || [],
              portfolioData.historicalPrices || {},
              { days: 90 }
            ).map(h => ({ date: h.date, value: h.valueARS }))
          }
          currentValue={portfolioValueARS} 
          transactions={portfolioData.transactions}
          positions={portfolioData.positions}
          bonds={bonds}
        />
      )}
      
    </div>
  );
} 