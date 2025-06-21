'use client';

import { useState, useEffect } from 'react';
import { InvestmentGoal } from '@/types';
import GoalForm from '../../../components/GoalForm';
import GoalList from '../../../components/GoalList';
import EditGoalModal from '../../../components/EditGoalModal';
import { calculateMonthlyInvestment } from '@/utils/goalCalculator';

export default function GoalsPage() {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<InvestmentGoal | null>(null);

  const fetchGoals = async () => {
    const session = localStorage.getItem('session');
    if (!session) {
      setError('You must be logged in to see your goals.');
      setLoading(false);
      return;
    }
    const username = JSON.parse(session).username;

    try {
      const res = await fetch(`/api/goals?username=${username}`);
      if (!res.ok) {
        throw new Error('Failed to fetch goals.');
      }
      const data = await res.json();
      setGoals(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async (goal: Omit<InvestmentGoal, 'id' | 'monthlyContribution'>) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    const years = (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
    const monthlyContribution = calculateMonthlyInvestment(goal.targetAmount, years > 0 ? years : 1, 8, goal.initialDeposit);

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
      await fetchGoals(); // Refresh list after adding
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
      
      await fetchGoals();
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

      await fetchGoals();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Metas de Inversión</h1>
      
      <GoalForm onSubmit={handleAddGoal} />

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tus Metas</h2>
        {loading ? (
          <p className="text-gray-700">Cargando metas...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <>
            {goals.length === 0 ? (
              <p className="text-gray-700">Aún no has definido ninguna meta. Utiliza el formulario de arriba para añadir la primera.</p>
            ) : (
              <GoalList goals={goals} onEdit={handleEdit} onDelete={handleDelete} />
            )}
          </>
        )}
      </div>

      {isEditModalOpen && editingGoal && (
        <EditGoalModal
          goal={editingGoal}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onUpdate={handleUpdateGoal}
        />
      )}
    </div>
  );
} 