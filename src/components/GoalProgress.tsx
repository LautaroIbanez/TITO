import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import Link from 'next/link';
import { InvestmentGoal, PortfolioTransaction, DepositTransaction, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';
import { projectFixedIncome } from '@/utils/fixedIncomeProjection';
import { calculateEffectiveYield, projectGoalPlan, formatCurrency, calculateFixedIncomeGains } from '@/utils/goalCalculator';
import dayjs from 'dayjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  goal: InvestmentGoal | null;
  valueHistory: { date: string; value: number }[];
  currentValue: number;
  transactions: PortfolioTransaction[];
  positions: PortfolioPosition[];
  bonds: Bond[];
  actionButtons?: React.ReactNode;
  showManageLink?: boolean;
}

export default function GoalProgress({ goal, valueHistory, currentValue, transactions, positions, bonds, actionButtons, showManageLink }: Props) {
  const fixedIncomeProjection = useMemo(() => {
    if (!goal || !positions || !bonds) return [];
    return projectFixedIncome(currentValue, positions, bonds, [goal]);
  }, [currentValue, positions, bonds, goal]);

  const goalPlanProjection = useMemo(() => {
    if (!goal || valueHistory.length === 0) return [];
    const annualReturn = calculateEffectiveYield(positions, bonds);
    const dates = valueHistory.map(p => p.date);
    return projectGoalPlan(goal, dates, annualReturn);
  }, [goal, valueHistory, positions, bonds]);

  if (!goal) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes metas de inversión</h3>
          <p className="text-gray-700 mb-4">Crea tu primera meta para seguir el progreso de tu portafolio.</p>
          <Link 
            href="/dashboard/goals" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Crear Meta
          </Link>
        </div>
      </div>
    );
  }

  const portfolioGains = calculateFixedIncomeGains(positions, transactions);
  const progressPercentage = (!goal.targetAmount || goal.targetAmount === 0)
    ? 0
    : Math.min((portfolioGains / goal.targetAmount) * 100, 100);
  const remainingAmount = Math.max(goal.targetAmount - portfolioGains, 0);
  
  const chartData = {
    labels: valueHistory.map((d) => d.date),
    datasets: [
      {
        label: 'Valor del Portafolio',
        data: valueHistory.map((d) => d.value),
        fill: true,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Monto Objetivo',
        data: Array(valueHistory.length).fill(goal.targetAmount),
        fill: false,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.1)',
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
      },
      {
        label: 'Proyección (Ingresos Pasivos)',
        data: fixedIncomeProjection.map(p => p.value),
        fill: false,
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.1)',
        borderDash: [3, 3],
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Proyección (Plan de Aportes)',
        data: goalPlanProjection.map(p => p.value),
        fill: false,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { 
      legend: { 
        display: true,
        position: 'top' as const,
      }, 
      tooltip: { enabled: true } 
    },
    scales: { 
      x: { 
        type: 'category' as const,
        labels: valueHistory.map(p => p.date),
        display: false 
      }, 
      y: { 
        display: true,
        beginAtZero: true,
      } 
    },
    elements: { line: { borderWidth: 2 } },
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Progreso de Meta: {goal.name}</h3>
          <p className="text-sm text-gray-700">Objetivo: {formatCurrency(Number(goal.targetAmount || 0), goal.currency)}</p>
        </div>
        <div className="flex items-center space-x-2">
          {actionButtons}
          {showManageLink && (
            <Link href="/dashboard/goals" className="text-blue-600 hover:underline text-sm font-medium ml-2">Gestionar Metas</Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(portfolioGains, goal.currency)}</div>
          <div className="text-sm text-gray-700">Ganancias del Portafolio</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{progressPercentage.toFixed(1)}%</div>
          <div className="text-sm text-gray-700">Progreso</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(remainingAmount, goal.currency)}</div>
          <div className="text-sm text-gray-700">Restante</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-700 mb-1">
          <span>Progreso</span>
          <span>{progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="h-64">
        <Line data={chartData} options={chartOptions} height={240} />
      </div>
    </div>
  );
} 