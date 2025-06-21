import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import Link from 'next/link';
import { InvestmentGoal } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  goal: InvestmentGoal | null;
  valueHistory: { date: string; value: number }[];
  currentValue: number;
}

export default function GoalProgress({ goal, valueHistory, currentValue }: Props) {
  if (!goal) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Investment Goals Set</h3>
          <p className="text-gray-600 mb-4">Create your first investment goal to track your portfolio progress.</p>
          <Link 
            href="/dashboard/goals" 
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Goal
          </Link>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.min((currentValue / goal.targetAmount) * 100, 100);
  const remainingAmount = Math.max(goal.targetAmount - currentValue, 0);
  
  // Calculate projected value based on monthly contributions
  const projectedData = valueHistory.map((point, index) => {
    const monthsFromStart = index / 30; // Assuming daily data points
    const projectedValue = goal.initialDeposit + (goal.monthlyContribution * monthsFromStart);
    return projectedValue;
  });

  const chartData = {
    labels: valueHistory.map((d) => d.date),
    datasets: [
      {
        label: 'Portfolio Value',
        data: valueHistory.map((d) => d.value),
        fill: false,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Target Amount',
        data: valueHistory.map(() => goal.targetAmount),
        fill: false,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.1)',
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
      },
      {
        label: 'Projected Value',
        data: projectedData,
        fill: false,
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.1)',
        borderDash: [3, 3],
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
      x: { display: false }, 
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
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Goal Progress: {goal.name}</h3>
          <p className="text-sm text-gray-600">Target: ${goal.targetAmount.toLocaleString()}</p>
        </div>
        <Link 
          href="/dashboard/goals" 
          className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
        >
          Manage Goals
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">${currentValue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Current Value</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{progressPercentage.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Progress</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">${remainingAmount.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Remaining</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
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