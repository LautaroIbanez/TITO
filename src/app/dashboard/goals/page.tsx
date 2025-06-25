'use client';

import { useState, useEffect } from 'react';
import { InvestmentGoal, PortfolioPosition, PortfolioTransaction } from '@/types';
import { Bond } from '@/types/finance';
import GoalListWithProgress from '../../../components/GoalList';
import EditGoalModal from '../../../components/EditGoalModal';
import { calculateMonthlyInvestment, calculateEffectiveYield } from '@/utils/goalCalculator';
import GoalModal from '@/components/GoalModal';

export default function GoalsPage() {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);

  const fetchData = async () => {
    const session = localStorage.getItem('session');
    if (!session) {
      setError('You must be logged in to see your goals.');
      setLoading(false);
      return;
    }
    const username = JSON.parse(session).username;

    try {
      const [goalsRes, portfolioRes, bondsRes] = await Promise.all([
        fetch(`/api/goals?username=${username}`),
        fetch(`/api/portfolio/data?username=${username}`),
        fetch('/api/bonds'),
      ]);

      if (!goalsRes.ok) throw new Error('Failed to fetch goals.');
      const goalsData = await goalsRes.json();
      setGoals(goalsData);

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json();
        setPositions(portfolioData.positions || []);
        setTransactions(portfolioData.transactions || []);
      }
      
      if (bondsRes.ok) {
        const bondsData = await bondsRes.json();
        setBonds(bondsData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddGoal = async (goal: Omit<InvestmentGoal, 'id' | 'monthlyContribution'>) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;
    
    const effectiveYield = calculateEffectiveYield(positions, bonds);
    const years = (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
    const monthlyContribution = calculateMonthlyInvestment(goal.targetAmount, years > 0 ? years : 1, effectiveYield, goal.initialDeposit);

    const fullGoal: Omit<InvestmentGoal, 'id'> = {
      ...goal,
      monthlyContribution: Math.round(monthlyContribution),
    };

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, goal: fullGoal }),
      });
      if (!res.ok) {
        throw new Error('Failed to save goal.');
      }
      await fetchData(); // Refresh list after adding
      setIsAddModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (goal: InvestmentGoal) => {
    setEditingGoal(goal);
    setIsEditModalOpen(true);
  };

  const handleUpdateGoal = async (updatedGoal: InvestmentGoal) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    try {
      const res = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, goal: updatedGoal }),
      });
      if (!res.ok) throw new Error('Failed to update goal.');
      
      await fetchData();
      setIsEditModalOpen(false);
      setEditingGoal(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta meta?')) return;

    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    try {
      const res = await fetch(`/api/goals?username=${username}&goalId=${goalId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete goal.');

      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Metas de Inversión</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Agregar Meta
        </button>
      </div>
      
      <div className="mt-8">
        {loading ? (
          <p className="text-gray-700">Cargando metas...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <>
            {goals.length === 0 ? (
              <div className='flex flex-col gap-4 items-center'>
                <p className="text-gray-700">Aún no has definido ninguna meta.</p>
              </div>
            ) : (
              <GoalListWithProgress
                goals={goals}
                transactions={transactions}
                positions={positions}
                bonds={bonds}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>

      {isAddModalOpen && (
        <GoalModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddGoal}
          positions={positions}
          bonds={bonds}
        />
      )}

      {isEditModalOpen && editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateGoal}
          positions={positions}
          bonds={bonds}
        />
      )}
    </div>
  );
} 