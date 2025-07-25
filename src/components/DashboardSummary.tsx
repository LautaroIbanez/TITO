'use client';
import { useEffect, useState } from 'react';
import { StrategyRecommendation } from '@/types';
import { Bond } from '@/types/finance';
import { calculatePortfolioValueHistory, calculateCurrentValueByCurrency } from '@/utils/calculatePortfolioValue';
import { calculatePortfolioPerformance, fetchInflationData, formatPerformance, PerformanceMetrics, InflationData } from '@/utils/portfolioPerformance';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/goalCalculator';
import { generatePortfolioHash } from '@/utils/priceDataHash';
import { getPortfolioNetGains } from '@/utils/positionGains';
import { calculateInvestedCapitalFromPositions } from '@/utils/calculateInvestedCapitalFromPositions';

import { getPositionDisplayName } from '@/utils/priceValidation';
import { getRecommendationLabel } from '@/utils/assetClassLabels';
import { usePortfolioHistory } from './usePortfolioHistory';
import { getLatestPortfolioSnapshot } from '@/utils/portfolioHistoryClient';
import HistoricalPortfolioChart from './HistoricalPortfolioChart';
import DailyGainChart from './DailyGainChart';
import { getSessionData, setSessionData } from '@/utils/sessionStorage';
import EconomicIndicators from './EconomicIndicators';
import SummaryCardTooltip from './SummaryCardTooltip';

export default function DashboardSummary() {
  const [portfolioValueARS, setPortfolioValueARS] = useState(0);
  const [portfolioValueUSD, setPortfolioValueUSD] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [, setBonds] = useState<Bond[]>([]);
  const [bondPrices, setBondPrices] = useState<Record<string, number>>({});
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [inflationData, setInflationData] = useState<InflationData | null>(null);
  
  const { portfolioData, strategy, loading, error, portfolioVersion } = usePortfolio();

  // Get username from session/localStorage
  const [, setUsername] = useState<string | null>(null);
  useEffect(() => {
    const sessionData = getSessionData();
    if (sessionData) {
      setUsername(sessionData.username);
    }
  }, []);

  // Fetch portfolio history
  const { history: portfolioHistory } = usePortfolioHistory(undefined);

  // Get the latest portfolio snapshot from history
  const latestSnapshot = getLatestPortfolioSnapshot(portfolioHistory || []);

  // Generate portfolio hash for dependency tracking
  const portfolioHash = generatePortfolioHash(
    portfolioVersion, 
    portfolioData?.historicalPrices || {}
  );

  // 1. Fetch goals and bonds only when portfolioData or portfolioVersion changes
  useEffect(() => {
    async function fetchData() {
      const sessionData = getSessionData();
      if (!sessionData) return;
      const username = sessionData.username;
      
      if (sessionData.firstTime) {
        setShowOnboarding(true);
      }

      const bondsRes = await fetch('/api/bonds');

      if (bondsRes.ok) {
        const bondsData = await bondsRes.json();
        setBonds(bondsData);
        
        // Create bondPrices map for current price calculations
        const pricesMap: Record<string, number> = {};
        bondsData.forEach((bond: Bond) => {
          if (bond.price) {
            pricesMap[bond.ticker] = bond.price;
          }
        });
        setBondPrices(pricesMap);
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
          portfolioData.historicalPrices || {},
          bondPrices
        );
        if (Number.isFinite(ARS)) {
          setPortfolioValueARS(ARS);
        } else {
          console.warn('portfolioValueARS is not finite:', ARS);
        }
        if (Number.isFinite(USD)) {
          setPortfolioValueUSD(USD);
        } else {
          console.warn('portfolioValueUSD is not finite:', USD);
        }

        const valueHistory = await calculatePortfolioValueHistory(
          portfolioData.transactions || [],
          portfolioData.historicalPrices || {},
          { days: 365 }
        );
        
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
        if (performance &&
          Object.values(performance).every((v) => Number.isFinite(v))) {
          setPerformanceMetrics(performance);
        } else {
          console.warn('Performance metrics contain non-finite values:', performance);
        }
      }
    }
    calculateValues();
  }, [portfolioData, portfolioVersion, portfolioHash, inflationData]);



  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    const sessionData = getSessionData();
    if (sessionData) {
      delete sessionData.firstTime;
      setSessionData(sessionData);
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
  
  const { totals, excludedPositions } =
      getPortfolioNetGains(portfolioData.positions, portfolioData.historicalPrices);

  const invested = calculateInvestedCapitalFromPositions(portfolioData.positions);
  const capitalInvertidoARS = invested.ARS;
  const capitalInvertidoUSD = invested.USD;
  const gananciaNetaARS = totals.ARS;
  const gananciaNetaUSD = totals.USD;
  const valorTotalPortafolioARS = capitalInvertidoARS + gananciaNetaARS + (portfolioData.cash?.ARS ?? 0);
  const valorTotalPortafolioUSD = capitalInvertidoUSD + gananciaNetaUSD + (portfolioData.cash?.USD ?? 0);
  
  // Basic validation for non-finite values
  if (!Number.isFinite(valorTotalPortafolioARS) || !Number.isFinite(valorTotalPortafolioUSD)) {
    console.warn('Portfolio total contains non-finite values:', {
      valorTotalPortafolioARS,
      valorTotalPortafolioUSD,
      components: {
        capitalInvertidoARS,
        gananciaNetaARS,
        cashARS: portfolioData.cash?.ARS ?? 0,
        capitalInvertidoUSD,
        gananciaNetaUSD,
        cashUSD: portfolioData.cash?.USD ?? 0
      }
    });
  }
  
  const gainsColorARS = gananciaNetaARS >= 0 ? 'text-green-600' : 'text-red-600';
  const gainsColorUSD = gananciaNetaUSD >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md mx-4">
            <h2 className="text-2xl font-bold mb-4 text-black">¡Bienvenido a TITO!</h2>
            <p className="text-black mb-6">
              TITO es tu asistente personal de inversiones. Te ayudará a:
            </p>
            <ul className="list-disc list-inside text-black mb-6 space-y-2">
              <li>Gestionar tu portafolio de inversiones</li>
              <li>Establecer y alcanzar metas financieras</li>
              <li>Recibir recomendaciones personalizadas</li>
              <li>Analizar el rendimiento de tus inversiones</li>
            </ul>
            <button
              onClick={handleDismissOnboarding}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              ¡Empezar!
            </button>
          </div>
        </div>
      )}

      {/* Strategy Recommendations */}
      {strategy && strategy.recommendations && strategy.recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recomendaciones de Estrategia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategy.recommendations.map((recommendation, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {recommendation.symbol || getRecommendationLabel(recommendation.assetClass, recommendation.id)}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(recommendation.priority)}`}>
                    {recommendation.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{recommendation.reason}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">
                    {getActionLabel(recommendation)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {recommendation.expectedImpact || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <SummaryCardTooltip
          capitalInvertidoARS={capitalInvertidoARS}
          capitalInvertidoUSD={capitalInvertidoUSD}
          gananciaNetaARS={gananciaNetaARS}
          gananciaNetaUSD={gananciaNetaUSD}
          efectivoDisponibleARS={portfolioData.cash?.ARS ?? 0}
          efectivoDisponibleUSD={portfolioData.cash?.USD ?? 0}
        >
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700">Valor Total del Portafolio (ARS)</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(Number.isFinite(valorTotalPortafolioARS) ? valorTotalPortafolioARS : 0, 'ARS')}</p>
          </div>
        </SummaryCardTooltip>
        <SummaryCardTooltip
          capitalInvertidoARS={capitalInvertidoARS}
          capitalInvertidoUSD={capitalInvertidoUSD}
          gananciaNetaARS={gananciaNetaARS}
          gananciaNetaUSD={gananciaNetaUSD}
          efectivoDisponibleARS={portfolioData.cash?.ARS ?? 0}
          efectivoDisponibleUSD={portfolioData.cash?.USD ?? 0}
        >
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700">Valor Total del Portafolio (USD)</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(Number.isFinite(valorTotalPortafolioUSD) ? valorTotalPortafolioUSD : 0, 'USD')}</p>
          </div>
        </SummaryCardTooltip>
        <SummaryCardTooltip
          capitalInvertidoARS={capitalInvertidoARS}
          capitalInvertidoUSD={capitalInvertidoUSD}
          gananciaNetaARS={gananciaNetaARS}
          gananciaNetaUSD={gananciaNetaUSD}
          efectivoDisponibleARS={portfolioData.cash?.ARS ?? 0}
          efectivoDisponibleUSD={portfolioData.cash?.USD ?? 0}
        >
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700">Capital Invertido (ARS)</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(capitalInvertidoARS, 'ARS')}</p>
          </div>
        </SummaryCardTooltip>
        {/* Net Gains Warning */}
        {excludedPositions.length > 0 && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded mb-4">
            <strong>Advertencia:</strong> Algunos activos no se incluyeron en el cálculo de ganancias por falta de precio actual:
            <ul className="list-disc ml-6 mt-1">
              {excludedPositions.map(({ position, reason }, i: number) => (
                <li key={i}>
                  {position.type} {getPositionDisplayName(position)}: {reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        <SummaryCardTooltip
          capitalInvertidoARS={capitalInvertidoARS}
          capitalInvertidoUSD={capitalInvertidoUSD}
          gananciaNetaARS={gananciaNetaARS}
          gananciaNetaUSD={gananciaNetaUSD}
          efectivoDisponibleARS={portfolioData.cash?.ARS ?? 0}
          efectivoDisponibleUSD={portfolioData.cash?.USD ?? 0}
        >
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700">Ganancias Netas (ARS)</h3>
            <p className={`text-2xl font-semibold ${gainsColorARS}`}> 
              {gananciaNetaARS >= 0 ? '+' : ''}{formatCurrency(gananciaNetaARS, 'ARS')}
            </p>
          </div>
        </SummaryCardTooltip>
        <SummaryCardTooltip
          capitalInvertidoARS={capitalInvertidoARS}
          capitalInvertidoUSD={capitalInvertidoUSD}
          gananciaNetaARS={gananciaNetaARS}
          gananciaNetaUSD={gananciaNetaUSD}
          efectivoDisponibleARS={portfolioData.cash?.ARS ?? 0}
          efectivoDisponibleUSD={portfolioData.cash?.USD ?? 0}
        >
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700">Capital Invertido (USD)</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(capitalInvertidoUSD, 'USD')}</p>
          </div>
        </SummaryCardTooltip>
        <SummaryCardTooltip
          capitalInvertidoARS={capitalInvertidoARS}
          capitalInvertidoUSD={capitalInvertidoUSD}
          gananciaNetaARS={gananciaNetaARS}
          gananciaNetaUSD={gananciaNetaUSD}
          efectivoDisponibleARS={portfolioData.cash?.ARS ?? 0}
          efectivoDisponibleUSD={portfolioData.cash?.USD ?? 0}
        >
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700">Ganancias Netas (USD)</h3>
            <p className={`text-2xl font-semibold ${gainsColorUSD}`}> 
              {gananciaNetaUSD >= 0 ? '+' : ''}{formatCurrency(gananciaNetaUSD, 'USD')}
            </p>
          </div>
        </SummaryCardTooltip>
        <SummaryCardTooltip
          capitalInvertidoARS={capitalInvertidoARS}
          capitalInvertidoUSD={capitalInvertidoUSD}
          gananciaNetaARS={gananciaNetaARS}
          gananciaNetaUSD={gananciaNetaUSD}
          efectivoDisponibleARS={portfolioData.cash?.ARS ?? 0}
          efectivoDisponibleUSD={portfolioData.cash?.USD ?? 0}
        >
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-700">Efectivo Disponible</h3>
            <p className="text-xl font-semibold text-blue-600">{formatCurrency(portfolioData.cash?.ARS ?? 0, 'ARS')}</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrency(portfolioData.cash?.USD ?? 0, 'USD')}</p>
          </div>
        </SummaryCardTooltip>
      </div>

      {/* Performance Metrics */}
      {performanceMetrics && 
       Object.values(performanceMetrics).every((v) => Number.isFinite(v)) && (
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




      
      {/* Insert the historical portfolio chart below the main summary */}
      <div className="mt-8">
        {portfolioHistory && portfolioHistory.length > 0 ? (
          <>
            <HistoricalPortfolioChart records={portfolioHistory} />
            <div className="mt-8">
              <DailyGainChart records={portfolioHistory} currency="ARS" />
            </div>
            <div className="mt-8">
              <DailyGainChart records={portfolioHistory} currency="USD" />
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">No hay historial de portafolio disponible.</div>
        )}
      </div>

      {/* Economic Indicators Section */}
      <div className="mt-12">
        <EconomicIndicators />
      </div>
    </div>
  );
} 