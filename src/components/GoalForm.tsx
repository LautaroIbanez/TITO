'use client';
import { useState } from 'react';
import { InvestmentGoal } from '@/types';

interface Props {
  onSubmit: (goal: Omit<InvestmentGoal, 'id'>) => void;
}

export default function GoalForm({ onSubmit }: Props) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(10000);
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [initialDeposit, setInitialDeposit] = useState(1000);
  const [monthlyContribution, setMonthlyContribution] = useState(100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      targetAmount,
      targetDate,
      initialDeposit,
      monthlyContribution,
    });
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
        <div>
          <label htmlFor="monthlyContribution" className="block text-sm font-medium text-gray-700 mb-1">
            Aporte Mensual
          </label>
          <input
            id="monthlyContribution"
            type="number"
            value={monthlyContribution}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            placeholder="100"
            className="p-2 border rounded text-gray-900 placeholder:text-gray-500 w-full"
          />
        </div>
      </div>
      <button type="submit" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Agregar Meta
      </button>
    </form>
  );
}
