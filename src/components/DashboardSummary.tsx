'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InvestmentGoal, UserData } from '@/types';
import { calculatePortfolioValueHistory } from '@/utils/calculatePortfolioValue';
import GoalProgress from './GoalProgress';
import PortfolioHistoryChart from './PortfolioHistoryChart';

export default function DashboardSummary() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [valueHistory, setValueHistory] = useState<{ date: string; value: number }[]>([]);
  const [firstGoal, setFirstGoal] = useState<InvestmentGoal | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const session = localStorage.getItem('session');
      if (!session) {
        setLoading(false);
        return;
      }
      const username = JSON.parse(session).username;

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

  if (loading) {
    return <div className="text-center text-gray-500">Loading dashboard...</div>;
  }

  if (!user) {
    return <div className="text-center text-gray-500">Could not load user data.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Portfolio Value</h3>
          <p className="text-3xl font-semibold text-gray-900">${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Available Cash</h3>
          <p className="text-3xl font-semibold text-gray-900">${user.availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow flex flex-col items-center justify-center">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Tax Simulator</h3>
            <Link href="/dashboard/taxes" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-semibold">
                Estimate Your Taxes
            </Link>
        </div>
      </div>

      {firstGoal ? (
        <GoalProgress goal={firstGoal} valueHistory={valueHistory} currentValue={portfolioValue} />
      ) : (
        <div className="bg-white p-6 rounded-lg shadow text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Goals Yet</h3>
            <p className="text-gray-600 mb-4">Set an investment goal to start tracking your progress.</p>
            <Link href="/dashboard/goals" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                Create a Goal
            </Link>
        </div>
      )}
      
      <PortfolioHistoryChart valueHistory={valueHistory} />
    </div>
  );
} 