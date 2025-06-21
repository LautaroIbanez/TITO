'use client';

import { useState, useEffect } from 'react';
import { InvestmentGoal } from '@/types';
import GoalForm from '../../../components/GoalForm';
import GoalList from '../../../components/GoalList';

export default function GoalsPage() {
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleAddGoal = async (goal: Omit<InvestmentGoal, 'id'>) => {
    const session = localStorage.getItem('session');
    if (!session) return;
    const username = JSON.parse(session).username;

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, goal }),
      });
      if (!res.ok) {
        throw new Error('Failed to save goal.');
      }
      await fetchGoals(); // Refresh list after adding
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Investment Goals</h1>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <GoalForm onSubmit={handleAddGoal} />
          <div className="mt-8">
            {goals.length === 0 ? (
              <p className="text-gray-900">No investment goals set yet. Use the form above to add your first goal.</p>
            ) : (
              <GoalList goals={goals} />
            )}
          </div>
        </>
      )}
    </div>
  );
} 