'use client';
import { useState, useEffect } from 'react';
import { InvestmentGoal } from '@/types';
import { calculateMonthlyInvestment, formatCurrency } from '@/utils/goalCalculator';

interface Props {
  onSubmit: (goal: Omit<InvestmentGoal, 'id' | 'monthlyContribution'>) => void;
}

export default function GoalForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(1000000);
  const [targetDate, setTargetDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 5)).toISOString().split('T')[0]);
  const [initialDeposit, setInitialDeposit] = useState(50000);
  const [suggestedContribution, setSuggestedContribution] = useState(0);

  useEffect(() => {
    const years = (new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (targetAmount > 0 && years > 0) {
      // Assuming an average annual return of 8% for the suggestion
      const contribution = calculateMonthlyInvestment(targetAmount, years, 8, initialDeposit);
      setSuggestedContribution(contribution);
    } else {
      setSuggestedContribution(0);
    }
  }, [targetAmount, targetDate, initialDeposit]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const goalData: Omit<InvestmentGoal, 'id' | 'monthlyContribution'> = {
      name,
      targetAmount,
      targetDate,
      initialDeposit,
    };
    onSubmit(goalData);
    setName('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Crear Nueva Meta</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="goalName" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Objetivo
          </label>
          <input
            id="goalName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Pie para una casa"
            className="p-2 border rounded text-gray-900 placeholder:text-gray-500 w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-1">
            Fecha Límite
          </label>
          <input
            id="targetDate"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="p-2 border rounded text-gray-900 w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Monto Objetivo
          </label>
          <input
            id="targetAmount"
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(Number(e.target.value))}
            placeholder="10000"
            className="p-2 border rounded text-gray-900 placeholder:text-gray-500 w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="initialDeposit" className="block text-sm font-medium text-gray-700 mb-1">
            Depósito Inicial
          </label>
          <input
            id="initialDeposit"
            type="number"
            value={initialDeposit}
            onChange={(e) => setInitialDeposit(Number(e.target.value))}
            placeholder="1000"
            className="p-2 border rounded text-gray-900 placeholder:text-gray-500 w-full"
          />
        </div>
      </div>
      {suggestedContribution > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            Para alcanzar tu meta, te sugerimos un aporte mensual de aproximadamente{' '}
            <span className="font-bold">{formatCurrency(suggestedContribution)}</span>.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            *Cálculo basado en un rendimiento anual estimado del 8%.
          </p>
        </div>
      )}
      <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Agregar Meta
      </button>
    </form>
  );
}
