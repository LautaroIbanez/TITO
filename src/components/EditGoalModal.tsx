'use client';
import { useState, useEffect } from 'react';
import { InvestmentGoal, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';
import { calculateMonthlyInvestment, formatCurrency, calculateEffectiveYield } from '@/utils/goalCalculator';

interface Props {
  goal: InvestmentGoal;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (goal: InvestmentGoal) => void;
  positions: PortfolioPosition[];
  bonds: Bond[];
}

export default function EditGoalModal({ goal, isOpen, onClose, onUpdate, positions, bonds }: Props) {
  const [formData, setFormData] = useState<InvestmentGoal>(goal);
  const [suggestedContribution, setSuggestedContribution] = useState(goal.monthlyContribution);
  const [effectiveYield, setEffectiveYield] = useState(8);

  useEffect(() => {
    setFormData(goal);
  }, [goal]);

  useEffect(() => {
    if (!formData) return;
    
    const yieldRate = calculateEffectiveYield(positions, bonds);
    setEffectiveYield(yieldRate);

    const years = (new Date(formData.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (formData.targetAmount > 0 && years > 0) {
      const contribution = calculateMonthlyInvestment(formData.targetAmount, years, yieldRate, formData.initialDeposit);
      setSuggestedContribution(contribution);
    } else {
      setSuggestedContribution(0);
    }
  }, [formData, positions, bonds]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev!, [name]: name === 'targetAmount' || name === 'initialDeposit' ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...formData, monthlyContribution: Math.round(suggestedContribution) });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Editar Meta</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Objetivo</label>
            <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="p-2 mt-1 border rounded text-gray-900 w-full" />
          </div>
          <div>
            <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700">Monto Objetivo</label>
            <input id="targetAmount" name="targetAmount" type="number" value={formData.targetAmount} onChange={handleChange} className="p-2 mt-1 border rounded text-gray-900 w-full" />
          </div>
          <div>
            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">Fecha Límite</label>
            <input id="targetDate" name="targetDate" type="date" value={new Date(formData.targetDate).toISOString().split('T')[0]} onChange={handleChange} className="p-2 mt-1 border rounded text-gray-900 w-full" />
          </div>
          <div>
            <label htmlFor="initialDeposit" className="block text-sm font-medium text-gray-700">Depósito Inicial</label>
            <input id="initialDeposit" name="initialDeposit" type="number" value={formData.initialDeposit} onChange={handleChange} className="p-2 mt-1 border rounded text-gray-900 w-full" />
          </div>
          
          {suggestedContribution > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Aporte mensual sugerido: <span className="font-bold">{formatCurrency(suggestedContribution)}</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                *Cálculo basado en un rendimiento anual estimado del {effectiveYield.toFixed(2)}% según tu cartera actual.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 