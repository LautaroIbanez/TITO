'use client';
import { useEffect, useState } from 'react';
import PortfolioCard from '@/components/PortfolioCard';
import ReturnComparison from '@/components/ReturnComparison';
import { calculatePortfolioReturn, compareWithBenchmarks } from '@/utils/returnCalculator';
import PortfolioTable from '@/components/PortfolioTable';
import PortfolioPieChart from '@/components/PortfolioPieChart';
import PortfolioTransactions from '@/components/PortfolioTransactions';

export default function PortfolioPage({ onPortfolioChange }: { onPortfolioChange?: () => void }) {
  const [positions, setPositions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [comparison, setComparison] = useState<any>(null);
  const [fundamentals, setFundamentals] = useState<Record<string, any>>({});
  const [technicals, setTechnicals] = useState<Record<string, any>>({});
  const [availableCash, setAvailableCash] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState('');

  async function fetchPortfolio() {
    setLoading(true);
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    // Fetch portfolio data
    const res = await fetch(`/api/portfolio/data?username=${username}`);
    const data = await res.json();
    setPositions(data.positions || []);
    setTransactions(data.transactions || []);
    setPrices(data.historicalPrices || {});
    setFundamentals(data.fundamentals || {});
    setTechnicals(data.technicals || {});
    setAvailableCash(data.availableCash ?? 0);
    
    // Calculate returns
    const prices: Record<string, any[]> = {};
    Object.entries(data.historicalPrices || {}).forEach(([symbol, arr]) => {
      prices[symbol] = arr as any[];
    });
    const portReturn = calculatePortfolioReturn(prices, '1y');
    setComparison(compareWithBenchmarks(portReturn));
    setLoading(false);
  }

  useEffect(() => {
    fetchPortfolio();
  }, []);

  // handleRemove is no longer needed as sell action is in the modal
  
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
      fetchPortfolio();
    } else {
      setDepositError(data.error || 'El depósito falló');
    }
    setDepositLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Cash balance and deposit */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-gray-900">Efectivo Disponible: <span className="text-blue-700">${availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PortfolioPieChart positions={positions} prices={prices} />
      </div>

      <PortfolioTransactions transactions={transactions} />
      {comparison && <ReturnComparison data={comparison} />}
      <PortfolioTable positions={positions} prices={prices} fundamentals={fundamentals} technicals={technicals} availableCash={availableCash} />
      
      {/* Stock Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center text-gray-700">Cargando...</div>
        ) : positions.length === 0 ? (
          <div className="col-span-full text-center text-gray-700">No hay acciones en tu portafolio.</div>
        ) : (
          positions.map((stock) => (
            <PortfolioCard
              key={stock.symbol}
              symbol={stock.symbol}
              fundamentals={fundamentals[stock.symbol]}
              technicals={technicals[stock.symbol]}
              prices={prices[stock.symbol]}
              position={stock}
              onTrade={fetchPortfolio}
              availableCash={availableCash}
            />
          ))
        )}
      </div>
    </div>
  );
} 