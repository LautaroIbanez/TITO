'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InvestmentGoal, StrategyRecommendation } from '@/types';
import { Bond } from '@/types/finance';
import { calculatePortfolioValueHistory, PortfolioValueHistory, calculateCurrentValueByCurrency } from '@/utils/calculatePortfolioValue';
import { calculateCategoryValueHistory } from '@/utils/categoryValueHistory';
import { calculateInvestedCapital } from '@/utils/investedCapital';
import { calculatePortfolioPerformance, fetchInflationData, formatPerformance, PerformanceMetrics, InflationData } from '@/utils/portfolioPerformance';
import { usePortfolio } from '@/contexts/PortfolioContext';
import GoalProgress from './GoalProgress';
import PortfolioCategoryChart from './PortfolioCategoryChart';
import { formatCurrency, calculateFixedIncomeGains, calculateFixedIncomeValueHistory } from '@/utils/goalCalculator';
import { trimHistory, trimCategoryValueHistory } from '@/utils/history';
import { generatePortfolioHash } from '@/utils/priceDataHash';

export default function DashboardSummary() {
  const [portfolioValueARS, setPortfolioValueARS] = useState(0);
  const [portfolioValueUSD, setPortfolioValueUSD] = useState(0);
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [inflationData, setInflationData] = useState<InflationData | null>(null);
  const [goalValueHistories, setGoalValueHistories] = useState<Record<string, { date: string, value: number }[]>>({});
  const [categoryValueHistoryARS, setCategoryValueHistoryARS] = useState<any[]>([]);
  const [categoryValueHistoryUSD, setCategoryValueHistoryUSD] = useState<any[]>([]);
  
  const { portfolioData, strategy, loading, error, portfolioVersion } = usePortfolio();

  // Generate portfolio hash for dependency tracking
  const portfolioHash = generatePortfolioHash(
    portfolioVersion, 
    portfolioData?.historicalPrices || {}
  );

  // 1. Fetch goals and bonds only when portfolioData or portfolioVersion changes
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
          setGoals(goals);
        }
      }

      if (bondsRes.ok) {
        const bondsData = await bondsRes.json();
        setBonds(bondsData);
      }
    }
    fetchData();
  }, [portfolioData, portfolioVersion]);

  // 2. Fetch inflation data only on mount
  useEffect(() => {
    fetchInflationData().then((inflationRes) => {
      if (inflationRes) setInflationData(inflationRes);
    });
  }, []);

  // 3. Calculate values and performance when portfolioData, portfolioVersion, or price data changes
  useEffect(() => {
    async function calculateValues() {
      if (portfolioData) {
        const { ARS, USD } = calculateCurrentValueByCurrency(
          portfolioData.positions || [],
          portfolioData.cash || { ARS: 0, USD: 0 },
          portfolioData.historicalPrices || {}
        );
        setPortfolioValueARS(ARS);
        setPortfolioValueUSD(USD);

        const valueHistory = await calculatePortfolioValueHistory(
          portfolioData.transactions || [],
          portfolioData.historicalPrices || {},
          { days: 365 }
        );
        
        // Calculate category value histories
        const categoryHistoryARS = await calculateCategoryValueHistory(
          portfolioData.transactions || [],
          portfolioData.historicalPrices || {},
          'ARS',
          { days: 365 }
        );
        setCategoryValueHistoryARS(categoryHistoryARS);
        
        const categoryHistoryUSD = await calculateCategoryValueHistory(
          portfolioData.transactions || [],
          portfolioData.historicalPrices || {},
          'USD',
          { days: 365 }
        );
        setCategoryValueHistoryUSD(categoryHistoryUSD);
        
        // Verify that the last value in history matches current portfolio value
        if (valueHistory.length > 0) {
          const lastEntry = valueHistory[valueHistory.length - 1];
          const arsDifference = Math.abs(lastEntry.valueARS - ARS);
          const usdDifference = Math.abs(lastEntry.valueUSD - USD);
          
          // Log warning if there's a significant difference (more than 1 peso/dollar)
          if (arsDifference > 1 || usdDifference > 1) {
            console.warn('Portfolio value mismatch detected:', {
              currentARS: ARS,
              historyARS: lastEntry.valueARS,
              differenceARS: arsDifference,
              currentUSD: USD,
              historyUSD: lastEntry.valueUSD,
              differenceUSD: usdDifference
            });
          }
        }
        
        const performance = calculatePortfolioPerformance(valueHistory, inflationData || undefined);
        setPerformanceMetrics(performance);
      }
    }
    calculateValues();
  }, [portfolioData, portfolioVersion, portfolioHash, inflationData]);

  useEffect(() => {
    async function fetchGoalValueHistories() {
      if (!portfolioData || goals.length === 0) return;
      const histories: Record<string, { date: string, value: number }[]> = {};
      for (const goal of goals) {
        // Use fixed-income value history for consistent goal progress tracking
        const valueHistory = calculateFixedIncomeValueHistory(
          portfolioData.positions || [],
          portfolioData.transactions || [],
          90
        );
        histories[goal.id] = valueHistory;
      }
      setGoalValueHistories(histories);
    }
    fetchGoalValueHistories();
  }, [goals, portfolioData, portfolioVersion, portfolioHash]);

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

  // Current value of invested positions only (exclude cash)
  const investedValues = calculateCurrentValueByCurrency(
    portfolioData.positions || [],
    { ARS: 0, USD: 0 },
    portfolioData.historicalPrices || {}
  );

  const netGainsARS = investedValues.ARS - investedCapitalARS;
  const gainsColorARS = netGainsARS >= 0 ? 'text-green-600' : 'text-red-600';

  const netGainsUSD = investedValues.USD - investedCapitalUSD;
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



      {/* Portfolio Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorías del Portafolio (ARS) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Categorías del Portafolio (ARS)</h3>
          <PortfolioCategoryChart 
            history={trimCategoryValueHistory(categoryValueHistoryARS)}
          />
        </div>
        {/* Categorías del Portafolio (USD) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Categorías del Portafolio (USD)</h3>
          <PortfolioCategoryChart 
            history={trimCategoryValueHistory(categoryValueHistoryUSD)}
          />
        </div>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Rendimiento Mensual (ARS)</h3>
            <div className="space-y-1">
              <p className={`text-xl font-semibold ${formatPerformance(performanceMetrics.monthlyReturnARS).color}`}>
                {formatPerformance(performanceMetrics.monthlyReturnARS).formatted}
              </p>
              {inflationData && (
                <p className={`text-sm ${formatPerformance(performanceMetrics.monthlyReturnARSReal, true).color}`}>
                  Real: {formatPerformance(performanceMetrics.monthlyReturnARSReal, true).formatted}
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Rendimiento Mensual (USD)</h3>
            <div className="space-y-1">
              <p className={`text-xl font-semibold ${formatPerformance(performanceMetrics.monthlyReturnUSD).color}`}>
                {formatPerformance(performanceMetrics.monthlyReturnUSD).formatted}
              </p>
              {inflationData && (
                <p className={`text-sm ${formatPerformance(performanceMetrics.monthlyReturnUSDReal, true).color}`}>
                  Real: {formatPerformance(performanceMetrics.monthlyReturnUSDReal, true).formatted}
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Rendimiento Anual (ARS)</h3>
            <div className="space-y-1">
              <p className={`text-xl font-semibold ${formatPerformance(performanceMetrics.annualReturnARS).color}`}>
                {formatPerformance(performanceMetrics.annualReturnARS).formatted}
              </p>
              {inflationData && (
                <p className={`text-sm ${formatPerformance(performanceMetrics.annualReturnARSReal, true).color}`}>
                  Real: {formatPerformance(performanceMetrics.annualReturnARSReal, true).formatted}
                </p>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Rendimiento Anual (USD)</h3>
            <div className="space-y-1">
              <p className={`text-xl font-semibold ${formatPerformance(performanceMetrics.annualReturnUSD).color}`}>
                {formatPerformance(performanceMetrics.annualReturnUSD).formatted}
              </p>
              {inflationData && (
                <p className={`text-sm ${formatPerformance(performanceMetrics.annualReturnUSDReal, true).color}`}>
                  Real: {formatPerformance(performanceMetrics.annualReturnUSDReal, true).formatted}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inflation Data */}
      {inflationData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Inflación Argentina</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Mensual</p>
                <p className="text-2xl font-semibold text-red-600">+{inflationData.argentina.monthly.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Anual</p>
                <p className="text-2xl font-semibold text-red-600">+{inflationData.argentina.annual.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Inflación EE.UU.</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Mensual</p>
                <p className="text-2xl font-semibold text-orange-600">+{inflationData.usa.monthly.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Anual</p>
                <p className="text-2xl font-semibold text-orange-600">+{inflationData.usa.annual.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {goals.length > 0 && (
        <div className="space-y-8">
          {goals.map(goal => {
            // Calculate fixed-income value for consistent goal progress tracking
            const fixedIncomeGains = calculateFixedIncomeGains(
              portfolioData.positions || [],
              portfolioData.transactions || []
            );
            const totalDeposits = (portfolioData.transactions || [])
              .filter(t => t.type === 'Deposit')
              .reduce((sum, t) => sum + t.amount, 0);
            const currentFixedIncomeValue = totalDeposits + fixedIncomeGains;
            
            return (
              <GoalProgress
                key={goal.id}
                goal={goal}
                valueHistory={goalValueHistories[goal.id] || []}
                currentValue={currentFixedIncomeValue}
                transactions={portfolioData.transactions}
                positions={portfolioData.positions}
                bonds={bonds}
                allGoals={goals}
                showManageLink={true}
              />
            );
          })}
        </div>
      )}
      
    </div>
  );
} 