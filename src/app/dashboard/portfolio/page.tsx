'use client';
import { useEffect, useState } from 'react';
import PortfolioCard from '@/components/PortfolioCard';
import ReturnComparison from '@/components/ReturnComparison';
import PortfolioTable from '@/components/PortfolioTable';
import PortfolioPieChart from '@/components/PortfolioPieChart';
import PortfolioCategoryChart from '@/components/PortfolioCategoryChart';
import PortfolioTransactions from '@/components/PortfolioTransactions';
import { calculateCategoryValueHistory } from '@/utils/categoryValueHistory';
import { calculateInvestedCapital } from '@/utils/investedCapital';
import { StockPosition, PortfolioTransaction, DepositTransaction } from '@/types';
import { usePortfolio } from '@/contexts/PortfolioContext';
import EditDepositModal from '@/components/EditDepositModal';
import { formatCurrency } from '@/utils/goalCalculator';
import { trimCategoryValueHistory } from '@/utils/history';

export default function PortfolioPage({ onPortfolioChange }: { onPortfolioChange?: () => void }) {
  const [comparison, setComparison] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositCurrency, setDepositCurrency] = useState<'ARS' | 'USD'>('ARS');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');
  const [editingDeposit, setEditingDeposit] = useState<DepositTransaction | null>(null);
  const [depositActionError, setDepositActionError] = useState<string | null>(null);
  const [categoryValueHistoryARS, setCategoryValueHistoryARS] = useState<any[]>([]);
  const [categoryValueHistoryUSD, setCategoryValueHistoryUSD] = useState<any[]>([]);

  const { portfolioData, loading, refreshPortfolio } = usePortfolio();

  useEffect(() => {
    async function fetchCategoryValueHistory() {
      if (portfolioData?.transactions && portfolioData?.historicalPrices) {
        // Calculate category value histories
        const categoryHistoryARS = await calculateCategoryValueHistory(
          portfolioData.transactions,
          portfolioData.historicalPrices,
          'ARS',
          { days: 90 }
        );
        setCategoryValueHistoryARS(categoryHistoryARS);
        
        const categoryHistoryUSD = await calculateCategoryValueHistory(
          portfolioData.transactions,
          portfolioData.historicalPrices,
          'USD',
          { days: 90 }
        );
        setCategoryValueHistoryUSD(categoryHistoryUSD);
      } else {
        setCategoryValueHistoryARS([]);
        setCategoryValueHistoryUSD([]);
      }
    }
    fetchCategoryValueHistory();
  }, [portfolioData?.transactions, portfolioData?.historicalPrices]);

  useEffect(() => {
    async function calculateComparison() {
      if (portfolioData?.transactions && portfolioData?.positions && portfolioData?.historicalPrices) {
        try {
          // Calculate invested capital per currency
          const investedCapitalARS = calculateInvestedCapital(portfolioData.transactions, 'ARS');
          const investedCapitalUSD = calculateInvestedCapital(portfolioData.transactions, 'USD');

          // Calculate current investments value per currency (positions only, no cash)
          let currentInvestmentsValueARS = 0;
          let currentInvestmentsValueUSD = 0;

          for (const position of portfolioData.positions) {
            if (position.type === 'Stock') {
              const prices = portfolioData.historicalPrices[position.symbol];
              if (prices && prices.length > 0) {
                const currentPrice = prices[prices.length - 1].close;
                if (position.currency === 'ARS') {
                  currentInvestmentsValueARS += position.quantity * currentPrice;
                } else if (position.currency === 'USD') {
                  currentInvestmentsValueUSD += position.quantity * currentPrice;
                }
              }
            } else if (position.type === 'Bond') {
              if (position.currency === 'ARS') {
                currentInvestmentsValueARS += position.quantity * position.averagePrice;
              } else if (position.currency === 'USD') {
                currentInvestmentsValueUSD += position.quantity * position.averagePrice;
              }
            } else if (position.type === 'FixedTermDeposit') {
              if (position.currency === 'ARS') {
                currentInvestmentsValueARS += position.amount;
              } else if (position.currency === 'USD') {
                currentInvestmentsValueUSD += position.amount;
              }
            }
          }

          // Calculate gain percentages, guard against division by zero
          let gainPercentARS = 0;
          let gainPercentUSD = 0;
          if (investedCapitalARS > 0) {
            const netGainARS = currentInvestmentsValueARS - investedCapitalARS;
            gainPercentARS = (netGainARS / investedCapitalARS) * 100;
          }
          if (investedCapitalUSD > 0) {
            const netGainUSD = currentInvestmentsValueUSD - investedCapitalUSD;
            gainPercentUSD = (netGainUSD / investedCapitalUSD) * 100;
          }

          // Fetch benchmarks from API
          const benchmarksResponse = await fetch('/api/benchmarks');
          const benchmarks = await benchmarksResponse.json();

          // Use the new dual-currency comparison helper
          setComparison(
            require('@/utils/returnCalculator').compareWithBenchmarksDual(
              gainPercentARS,
              gainPercentUSD,
              benchmarks
            )
          );
        } catch (error) {
          console.error('Error calculating portfolio return:', error);
          setComparison(require('@/utils/returnCalculator').compareWithBenchmarksDual(0, 0, {}));
        }
      }
    }
    calculateComparison();
  }, [portfolioData]);

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
      setDepositError('Por favor, ingrese un monto válido');
      setDepositLoading(false);
      return;
    }
    const res = await fetch('/api/portfolio/deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, amount, date: depositDate, currency: depositCurrency }),
    });
    const data = await res.json();
    if (res.ok) {
      setDepositSuccess(`Se depositaron ${formatCurrency(amount, depositCurrency)}`);
      setDepositAmount('');
      await refreshPortfolio();
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
  
  // Provide a default for cash to prevent runtime errors
  const cash = portfolioData.cash || { ARS: 0, USD: 0 };

  const stockPositions = portfolioData.positions.filter((pos): pos is StockPosition => pos.type === 'Stock') || [];
  
  const depositTransactions: DepositTransaction[] = portfolioData.transactions.filter(
    (tx): tx is DepositTransaction => tx.type === 'Deposit'
  );

  // Handlers for editing and deleting deposits
  const handleEditDeposit = (deposit: DepositTransaction) => {
    setEditingDeposit(deposit);
    setDepositActionError(null);
  };

  const handleUpdateDeposit = async (deposit: DepositTransaction) => {
    setDepositActionError(null);
    const session = localStorage.getItem('session');
    const username = session ? JSON.parse(session).username : null;
    if (!username) {
      setDepositActionError('You must be logged in.');
      return;
    }
    try {
      const res = await fetch(`/api/portfolio/deposit/${deposit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, amount: deposit.amount, date: deposit.date, currency: deposit.currency }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update deposit');
      }
      await refreshPortfolio();
      setEditingDeposit(null);
    } catch (err: any) {
      setDepositActionError(err.message);
    }
  };

  const handleDeleteDeposit = async (depositId: string) => {
    if (!window.confirm('Are you sure you want to delete this deposit?')) return;
    setDepositActionError(null);
    const session = localStorage.getItem('session');
    const username = session ? JSON.parse(session).username : null;
    if (!username) {
      setDepositActionError('You must be logged in.');
      return;
    }
    try {
      const res = await fetch(`/api/portfolio/deposit/${depositId}?username=${username}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete deposit');
      }
      await refreshPortfolio();
    } catch (err: any) {
      setDepositActionError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Cash balance and deposit */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-gray-900">Efectivo Disponible (ARS): <span className="text-blue-700">{formatCurrency(cash.ARS)}</span></div>
              <div className="text-lg font-semibold text-gray-900">Efectivo Disponible (USD): <span className="text-blue-700">{formatCurrency(cash.USD, 'USD')}</span></div>
            </div>
            <form className="flex gap-2 items-center flex-wrap" onSubmit={handleDeposit}>
              <select 
                value={depositCurrency}
                onChange={(e) => setDepositCurrency(e.target.value as 'ARS' | 'USD')}
                className="border rounded px-2 py-1 text-gray-900 bg-white"
                disabled={depositLoading}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
              <input
                type="date"
                className="border rounded px-2 py-1 text-gray-900"
                value={depositDate}
                onChange={e => setDepositDate(e.target.value)}
                disabled={depositLoading}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className="border rounded px-2 py-1 w-36 text-gray-900"
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
        </div>
        {depositError && <div className="text-red-600 text-sm">{depositError}</div>}
        {depositSuccess && <div className="text-green-600 text-sm">{depositSuccess}</div>}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PortfolioPieChart positions={portfolioData.positions} prices={portfolioData.historicalPrices} />
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Categorías del Portafolio (ARS)</h3>
          <PortfolioCategoryChart 
            history={trimCategoryValueHistory(categoryValueHistoryARS)}
          />
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Categorías del Portafolio (USD)</h3>
          <PortfolioCategoryChart 
            history={trimCategoryValueHistory(categoryValueHistoryUSD)}
          />
        </div>
      </div>

      <PortfolioTransactions transactions={portfolioData.transactions} />
      {comparison && <ReturnComparison data={comparison} />}
      <PortfolioTable 
        positions={portfolioData.positions} 
        prices={portfolioData.historicalPrices} 
        fundamentals={portfolioData.fundamentals} 
        technicals={portfolioData.technicals} 
        cash={cash}
        onPortfolioUpdate={refreshPortfolio}
      />
      
      {/* Stock Cards - Only show stock positions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stockPositions.map((stock) => (
          <PortfolioCard
            key={stock.symbol}
            symbol={stock.symbol}
            fundamentals={portfolioData.fundamentals[stock.symbol]}
            technicals={portfolioData.technicals[stock.symbol]}
            prices={portfolioData.historicalPrices[stock.symbol]}
            position={stock}
            onTrade={refreshPortfolio}
            cash={cash}
          />
        ))}
      </div>

      {/* Deposit Transactions List */}
      {depositTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-md font-semibold text-gray-900 mb-2">Depósitos de Efectivo</h3>
          {depositActionError && <div className="text-red-600 text-sm mb-2">{depositActionError}</div>}
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-right">Monto</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {depositTransactions.map((tx) => (
                <tr key={tx.id} className="even:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-gray-800">{new Date(tx.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right text-gray-800">{formatCurrency(tx.amount, tx.currency)}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleEditDeposit(tx)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-2">Editar</button>
                    <button onClick={() => handleDeleteDeposit(tx.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editingDeposit && (
        <EditDepositModal
          deposit={editingDeposit}
          isOpen={!!editingDeposit}
          onClose={() => { setEditingDeposit(null); setDepositActionError(null); }}
          onUpdate={handleUpdateDeposit}
          error={depositActionError}
        />
      )}
    </div>
  );
} 