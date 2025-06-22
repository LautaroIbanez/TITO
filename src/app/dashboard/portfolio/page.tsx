'use client';
import { useEffect, useState, useMemo } from 'react';
import PortfolioCard from '@/components/PortfolioCard';
import ReturnComparison from '@/components/ReturnComparison';
import { compareWithBenchmarks } from '@/utils/returnCalculator';
import PortfolioTable from '@/components/PortfolioTable';
import PortfolioPieChart from '@/components/PortfolioPieChart';
import PortfolioHistoryChart from '@/components/PortfolioHistoryChart';
import PortfolioTransactions from '@/components/PortfolioTransactions';
import { calculatePortfolioValueHistory } from '@/utils/calculatePortfolioValue';
import { StockPosition, PortfolioTransaction } from '@/types';
import { usePortfolio } from '@/contexts/PortfolioContext';

export default function PortfolioPage({ onPortfolioChange }: { onPortfolioChange?: () => void }) {
  const [comparison, setComparison] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');

  const { portfolioData, loading, refreshPortfolio, triggerPortfolioUpdate } = usePortfolio();

  // Calculate portfolio value history using memoization
  const valueHistory = useMemo(() => {
    if (portfolioData?.transactions && portfolioData?.historicalPrices) {
      return calculatePortfolioValueHistory(
        portfolioData.transactions,
        portfolioData.historicalPrices,
        { days: 90 } // Show last 90 days
      );
    }
    return [];
  }, [portfolioData?.transactions, portfolioData?.historicalPrices]);

  // Calculate portfolio return based on invested capital vs current value
  useEffect(() => {
    async function calculateComparison() {
      if (portfolioData?.transactions && portfolioData?.positions && portfolioData?.historicalPrices) {
        try {
          // Calculate total invested capital from deposit transactions
          const totalInvestedCapital = portfolioData.transactions
            .filter((tx: PortfolioTransaction): tx is PortfolioTransaction & { type: 'Deposit'; amount: number } => tx.type === 'Deposit')
            .reduce((sum: number, tx) => sum + tx.amount, 0);

          // Calculate current portfolio value (positions + available cash)
          let currentPortfolioValue = portfolioData.availableCash;

          // Add value of all positions
          for (const position of portfolioData.positions) {
            if (position.type === 'Stock') {
              const prices = portfolioData.historicalPrices[position.symbol];
              if (prices && prices.length > 0) {
                const currentPrice = prices[prices.length - 1].close;
                currentPortfolioValue += position.quantity * currentPrice;
              }
            } else if (position.type === 'Bond') {
              // For bonds, use average price as current value (simplified)
              currentPortfolioValue += position.quantity * position.averagePrice;
            } else if (position.type === 'FixedTermDeposit') {
              // For fixed-term deposits, use the amount as current value
              currentPortfolioValue += position.amount;
            }
          }

          // Calculate gain percentage
          let gainPercent = 0;
          if (totalInvestedCapital > 0) {
            gainPercent = ((currentPortfolioValue - totalInvestedCapital) / totalInvestedCapital) * 100;
          }

          // Fetch benchmarks from API
          const benchmarksResponse = await fetch('/api/benchmarks');
          const benchmarks = await benchmarksResponse.json();
          
          setComparison(compareWithBenchmarks(gainPercent, benchmarks));
        } catch (error) {
          console.error('Error calculating portfolio return:', error);
          // Fallback to default benchmarks with 0% return
          setComparison(compareWithBenchmarks(0));
        }
      }
    }
    
    calculateComparison();
  }, [portfolioData]);

  // Filter positions to only include stocks for the card grid
  const stockPositions = portfolioData?.positions.filter((pos): pos is StockPosition => pos.type === 'Stock') || [];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError('');
    setDepositSuccess('');
    setDepositLoading(true);
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setDepositError('Ingresa un monto válido');
      setDepositLoading(false);
      return;
    }
    const res = await fetch('/api/portfolio/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, amount }),
    });
    const data = await res.json();
    if (res.ok) {
      setDepositSuccess(`Se depositaron $${amount.toFixed(2)}`);
      setDepositAmount('');
      await refreshPortfolio(); // Use context's refresh method
      triggerPortfolioUpdate(); // Trigger portfolio update to notify DashboardSummary
    } else {
      setDepositError(data.error || 'El depósito falló');
    }
    setDepositLoading(false);
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading portfolio...</div>;
  }

  if (!portfolioData) {
    return <div className="text-center text-gray-500">Could not load portfolio data.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Cash balance and deposit */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Efectivo Disponible: <span className="text-blue-700">${portfolioData.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
        </div>
        <form className="flex gap-2 items-center" onSubmit={handleDeposit}>
          <input
            type="number"
            min="0"
            step="0.01"
            className="border rounded px-2 py-1 w-32 text-gray-900"
            placeholder="Monto a depositar"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            disabled={depositLoading}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            disabled={depositLoading}
          >
            {depositLoading ? 'Depositando...' : 'Depositar'}
          </button>
        </form>
        {depositError && <div className="text-red-600 text-sm mt-1">{depositError}</div>}
        {depositSuccess && <div className="text-green-600 text-sm mt-1">{depositSuccess}</div>}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PortfolioPieChart positions={portfolioData.positions} prices={portfolioData.historicalPrices} />
        <PortfolioHistoryChart valueHistory={valueHistory} />
      </div>

      <PortfolioTransactions transactions={portfolioData.transactions} />
      {comparison && <ReturnComparison data={comparison} />}
      <PortfolioTable 
        positions={portfolioData.positions} 
        prices={portfolioData.historicalPrices} 
        fundamentals={portfolioData.fundamentals} 
        technicals={portfolioData.technicals} 
        availableCash={portfolioData.availableCash}
        onPortfolioUpdate={refreshPortfolio}
      />
      
      {/* Stock Cards - Only show stock positions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-700">Cargando...</div>
        ) : stockPositions.length === 0 ? (
          <div className="col-span-full text-center text-gray-700">No hay acciones en tu portafolio.</div>
        ) : (
          stockPositions.map((stock) => (
            <PortfolioCard
              key={stock.symbol}
              symbol={stock.symbol}
              fundamentals={portfolioData.fundamentals[stock.symbol]}
              technicals={portfolioData.technicals[stock.symbol]}
              prices={portfolioData.historicalPrices[stock.symbol]}
              position={stock}
              onTrade={refreshPortfolio}
              availableCash={portfolioData.availableCash}
            />
          ))
        )}
      </div>
    </div>
  );
} 