'use client';
import { usePortfolio } from '@/contexts/PortfolioContext';

interface AvailableCapitalIndicatorProps {
  assetClass: 'stocks' | 'bonds' | 'deposits';
}

export default function AvailableCapitalIndicator({ assetClass }: AvailableCapitalIndicatorProps) {
  const { portfolioData, strategy } = usePortfolio();

  if (!portfolioData || !strategy) {
    return null;
  }

  const availableCash = portfolioData.availableCash;
  const targetAllocation = strategy.targetAllocation[assetClass];
  const capital = availableCash * (targetAllocation / 100);

  return (
    <div className="text-sm text-gray-600">
      Capital disponible: ${capital.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}
    </div>
  );
} 