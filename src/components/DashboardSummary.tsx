'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InvestmentGoal, UserData, DepositTransaction } from '@/types';
import { calculatePortfolioValueHistory } from '@/utils/calculatePortfolioValue';
import GoalProgress from './GoalProgress';

export default function DashboardSummary() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [valueHistory, setValueHistory] = useState<{ date: string; value: number }[]>([]);
  const [firstGoal, setFirstGoal] = useState<InvestmentGoal | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const session = localStorage.getItem('session');
      if (!session) {
        setLoading(false);
        return;
      }
      const sessionData = JSON.parse(session);
      const username = sessionData.username;
      
      if (sessionData.firstTime) {
        setShowOnboarding(true);
      }

      // Fetch all data in parallel
      const [portfolioRes, goalsRes] = await Promise.all([
        fetch(`/api/portfolio/data?username=${username}`),
        fetch(`/api/goals?username=${username}`),
      ]);

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setUser(portfolioData);

        const history = calculatePortfolioValueHistory(
          portfolioData.transactions || [],
          portfolioData.historicalPrices || {},
          { days: 90 }
        );
        setValueHistory(history);

        const latestValue = history.length > 0 ? history[history.length - 1].value : 0;
        setPortfolioValue(latestValue);
      }

      if (goalsRes.ok) {
        const goals = await goalsRes.json();
        if (goals.length > 0) {
          setFirstGoal(goals[0]);
        }
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    const session = localStorage.getItem('session');
    if (session) {
      const sessionData = JSON.parse(session);
      delete sessionData.firstTime;
      localStorage.setItem('session', JSON.stringify(sessionData));
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="text-center text-gray-500">Could not load user data.</div>;
  }
  
  const investedCapital = user.transactions
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
          <p className="text-2xl font-semibold text-blue-600">${user.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-700">Listo para invertir</p>
        </div>
      </div>

      {firstGoal && user ? (
        <GoalProgress goal={firstGoal} valueHistory={valueHistory} currentValue={portfolioValue} transactions={user.transactions} />
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