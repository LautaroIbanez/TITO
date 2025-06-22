'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InvestmentGoal, DepositTransaction, StrategyRecommendation } from '@/types';
import { calculatePortfolioValueHistory } from '@/utils/calculatePortfolioValue';
import { usePortfolio } from '@/contexts/PortfolioContext';
import GoalProgress from './GoalProgress';

export default function DashboardSummary() {
  const [valueHistory, setValueHistory] = useState<{ date: string; value: number }[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [firstGoal, setFirstGoal] = useState<InvestmentGoal | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  const { portfolioData, strategy, loading, error, portfolioVersion } = usePortfolio();

  useEffect(() => {
    async function fetchGoals() {
      const session = localStorage.getItem('session');
      if (!session) return;
      const sessionData = JSON.parse(session);
      const username = sessionData.username;
      
      if (sessionData.firstTime) {
        setShowOnboarding(true);
      }

      const goalsRes = await fetch(`/api/goals?username=${username}`);
      if (goalsRes.ok) {
        const goals = await goalsRes.json();
        if (goals.length > 0) {
          setFirstGoal(goals[0]);
        }
      }
    }

    if (portfolioData) {
      // Calculate portfolio value history
      const history = calculatePortfolioValueHistory(
        portfolioData.transactions || [],
        portfolioData.historicalPrices || {},
        { days: 90 }
      );
      setValueHistory(history);

      const latestValue = history.length > 0 ? history[history.length - 1].value : 0;
      setPortfolioValue(latestValue);
    }

    fetchGoals();
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
  
  const investedCapital = portfolioData.transactions
    .filter((t): t is DepositTransaction => t.type === 'Deposit')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const netGains = portfolioValue - investedCapital;
  const gainsColor = netGains >= 0 ? 'text-green-600' : 'text-red-600';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Valor del Portafolio</h3>
          <p className="text-2xl font-semibold text-gray-900">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Capital Invertido</h3>
          <p className="text-2xl font-semibold text-gray-900">${investedCapital.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Ganancias / Pérdidas</h3>
          <p className={`text-2xl font-semibold ${gainsColor}`}>
            {netGains >= 0 ? '+' : ''}${netGains.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-700">Efectivo Disponible</h3>
          <p className="text-2xl font-semibold text-blue-600">${portfolioData.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-700">Listo para invertir</p>
        </div>
      </div>

      {firstGoal && portfolioData ? (
        <GoalProgress goal={firstGoal} valueHistory={valueHistory} currentValue={portfolioValue} transactions={portfolioData.transactions} />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aún no tienes metas</h3>
            <p className="text-gray-700 mb-4">Define una meta de inversión para empezar a seguir tu progreso.</p>
            <Link href="/dashboard/goals" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Crear Meta
            </Link>
        </div>
      )}
      
    </div>
  );
} 