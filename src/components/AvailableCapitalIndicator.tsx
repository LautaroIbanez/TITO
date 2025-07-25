'use client';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { formatCurrency } from '@/utils/goalCalculator';

interface AvailableCapitalIndicatorProps {
  assetClass: 'stocks' | 'bonds' | 'deposits' | 'mutualFunds';
  currency?: 'ARS' | 'USD';
}

export default function AvailableCapitalIndicator({ assetClass, currency = 'ARS' }: AvailableCapitalIndicatorProps) {
  const { portfolioData, strategy } = usePortfolio();

  if (!portfolioData || !strategy || !portfolioData.cash) {
    return null;
  }

  const { cash } = portfolioData;
  // For mutualFunds, use the deposits allocation
  const allocationKey = assetClass === 'mutualFunds' ? 'deposits' : assetClass;
  const targetAllocation = strategy.targetAllocation[allocationKey];
  const capital = (cash[currency] || 0) * (targetAllocation / 100);

  return (
    <div className="text-sm text-gray-600">
      Capital disponible ({currency}): {formatCurrency(capital, currency)}
    </div>
  );
} 