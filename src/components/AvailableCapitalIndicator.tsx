'use client';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/goalCalculator';

interface AvailableCapitalIndicatorProps {
  assetClass: 'stocks' | 'bonds' | 'deposits';
  currency?: 'ARS' | 'USD';
}

export default function AvailableCapitalIndicator({ assetClass, currency = 'ARS' }: AvailableCapitalIndicatorProps) {
  const { portfolioData, strategy } = usePortfolio();

  if (!portfolioData || !strategy || !portfolioData.cash) {
    return null;
  }

  const { cash } = portfolioData;
  const targetAllocation = strategy.targetAllocation[assetClass];
  const capital = (cash[currency] || 0) * (targetAllocation / 100);

  return (
    <div className="text-sm text-gray-600">
      Capital disponible ({currency}): {formatCurrency(capital, currency)}
    </div>
  );
} 