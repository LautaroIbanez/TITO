import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import { InvestmentGoal, PortfolioTransaction, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';
import { projectFixedIncome } from '@/utils/fixedIncomeProjection';
import { 
  calculateEffectiveYield, 
  projectGoalPlan, 
  formatCurrency, 
  calculateFixedIncomeGains,
  calculateIntersectionDate,
  distributeFixedIncomeReturns,
  calculateEstimatedCompletionDate
} from '@/utils/goalCalculator';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface Props {
  goal: InvestmentGoal | null;
  valueHistory: { date: string; value: number }[];
  currentValue: number;
  transactions: PortfolioTransaction[];
  positions: PortfolioPosition[];
  bonds: Bond[];
  allGoals?: InvestmentGoal[]; // Add all goals for equitable distribution
  actionButtons?: React.ReactNode;
}

export default function GoalProgress({ 
  goal, 
  valueHistory, 
  currentValue, 
  transactions, 
  positions, 
  bonds, 
  allGoals = [], 
  actionButtons 
}: Props) {
  // Calculate distributed fixed income returns if we have all goals
  const distributedProjections = useMemo(() => {
    if (allGoals.length === 0) return {};
    return distributeFixedIncomeReturns(positions, bonds, allGoals, currentValue);
  }, [positions, bonds, allGoals, currentValue]);

  // Use distributed projection for this goal if available, otherwise fall back to original
  const fixedIncomeProjection = useMemo(() => {
    if (!goal) return [];
    
    if (allGoals.length > 0 && distributedProjections[goal.id]) {
      return distributedProjections[goal.id];
    }
    
    // Fall back to original calculation
    return projectFixedIncome(currentValue, positions, bonds, [goal]);
  }, [goal, currentValue, positions, bonds, allGoals, distributedProjections]);

  // Calculate intersection date to determine chart range
  const intersectionDate = useMemo(() => {
    if (!goal || fixedIncomeProjection.length === 0) return null;
    return calculateIntersectionDate(fixedIncomeProjection, goal.targetAmount);
  }, [goal, fixedIncomeProjection]);

  // Create unified date array from earliest value history date through intersection date or goal target date
  const unifiedDates = useMemo(() => {
    if (!goal || valueHistory.length === 0) return [];
    
    const earliestDate = valueHistory.reduce((earliest, current) => {
      return dayjs(current.date).isBefore(dayjs(earliest)) ? current.date : earliest;
    }, valueHistory[0].date);
    
    // Use intersection date if available, otherwise use goal target date
    const endDate = intersectionDate ? dayjs(intersectionDate) : dayjs(goal.targetDate);
    const startDate = dayjs(earliestDate);
    
    if (!startDate.isValid() || !endDate.isValid()) return [];
    
    const dates: string[] = [];
    let currentDate = startDate;
    
    while (currentDate.isSameOrBefore(endDate)) {
      dates.push(currentDate.format('YYYY-MM-DD'));
      currentDate = currentDate.add(1, 'day');
    }
    
    return dates;
  }, [goal, valueHistory, intersectionDate]);

  const goalPlanProjection = useMemo(() => {
    if (!goal || valueHistory.length === 0) return [];
    const annualReturn = calculateEffectiveYield(positions, bonds);
    const dates = valueHistory.map(p => p.date);
    return projectGoalPlan(goal, dates, annualReturn);
  }, [goal, valueHistory, positions, bonds]);

  // Calculate estimated completion date
  const estimatedCompletionDate = useMemo(() => {
    if (!goal || !distributedProjections[goal.id]) return null;
    return calculateEstimatedCompletionDate(goal, distributedProjections[goal.id]);
  }, [goal, distributedProjections]);

  // Calculate today's value from distributed projections when allGoals is provided
  const todaysValue = useMemo(() => {
    if (!goal) return 0;
    
    if (allGoals.length > 1 && distributedProjections[goal.id]) {
      const today = dayjs().format('YYYY-MM-DD');
      const todaysProjection = distributedProjections[goal.id].find(p => p.date === today);
      return todaysProjection ? todaysProjection.value : 0;
    }
    
    // Fall back to original calculation
    return calculateFixedIncomeGains(positions, transactions);
  }, [goal, allGoals, distributedProjections, positions, transactions]);

  // Apply currency conversion if goal uses USD
  const convertedTodaysValue = useMemo(() => {
    if (!goal || goal.currency !== 'USD') return todaysValue;
    
    // For USD goals, we need to convert from ARS to USD
    // This is a simplified conversion - in a real app, you'd use current exchange rates
    const exchangeRate = 1000; // Simplified ARS to USD rate
    return todaysValue / exchangeRate;
  }, [todaysValue, goal]);

  // Determine if we're using distributed projections
  const isUsingDistributedProjections = useMemo(() => {
    if (allGoals.length <= 1) return false;
    const arr = distributedProjections[goal?.id || ''];
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const today = dayjs().format('YYYY-MM-DD');
    const todayEntry = arr.find(p => p.date === today);
    return todayEntry && todayEntry.value > 0;
  }, [allGoals.length, distributedProjections, goal]);

  if (!goal) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tienes metas de inversión</h3>
          <p className="text-gray-700 mb-4">Las metas se gestionan automáticamente según tu perfil de inversión.</p>
        </div>
      </div>
    );
  }

  const progressPercentage = (!goal.targetAmount || goal.targetAmount === 0)
    ? 0
    : Math.min((convertedTodaysValue / goal.targetAmount) * 100, 100);
  const remainingAmount = Math.max(goal.targetAmount - convertedTodaysValue, 0);
  
  // Create value arrays that match the unified timeline
  const createValueArray = (projection: { date: string; value: number }[]) => {
    return unifiedDates.map(date => {
      const projectionEntry = projection.find(p => p.date === date);
      return projectionEntry ? projectionEntry.value : 0;
    });
  };
  
  // Progreso actual: accumulated value up to today, null after today
  const todayStr = dayjs().format('YYYY-MM-DD');
  const progresoActualData = unifiedDates.map(date => {
    if (dayjs(date).isAfter(todayStr)) return null;
    const entry = valueHistory.find(v => v.date === date);
    return entry ? entry.value : 0;
  });

  const chartData = {
    labels: unifiedDates,
    datasets: [
      {
        label: 'Monto Objetivo',
        data: Array(unifiedDates.length).fill(goal.targetAmount),
        fill: false,
        borderColor: '#dc2626',
        backgroundColor: 'rgba(220,38,38,0.1)',
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
      },
      {
        label: 'Retorno estimado por renta fija',
        data: createValueArray(fixedIncomeProjection),
        fill: false,
        borderColor: '#059669',
        backgroundColor: 'rgba(5,150,105,0.1)',
        borderDash: [3, 3],
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Inversión mensual programada',
        data: createValueArray(goalPlanProjection),
        fill: false,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        borderDash: [4, 4],
        pointRadius: 0,
        tension: 0.2,
      },
      {
        label: 'Progreso actual',
        data: progresoActualData,
        fill: false,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37,99,235,0.1)',
        borderDash: [],
        pointRadius: 2,
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
      tooltip: { 
        enabled: true,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const currency = goal?.currency || 'ARS';
            return `${label}: ${formatCurrency(value, currency)}`;
          }
        }
      }
    },
    scales: { 
      x: { 
        type: 'category' as const,
        display: true,
        ticks: {
          callback: function(value: any, index: number) {
            const date = unifiedDates[index];
            return date ? dayjs(date).format('YYYY-MM-DD') : '';
          }
        }
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
          {estimatedCompletionDate && (
            <p className="text-sm text-green-600">
              Fecha estimada de cumplimiento: {dayjs(estimatedCompletionDate).format('DD/MM/YYYY')}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {actionButtons}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(convertedTodaysValue, goal.currency)}</div>
          <div className="text-sm text-gray-700">
            {isUsingDistributedProjections ? 'Valor actual' : 'Ganancias del Portafolio'}
          </div>
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
      <div className="mt-2 text-xs text-gray-600">
        <div><span className="font-semibold" style={{color: '#059669'}}>Retorno estimado por renta fija</span>: Proyección de crecimiento del portafolio solo por intereses de plazos fijos y cauciones {allGoals.length > 1 ? '(distribuido equitativamente entre todas las metas)' : ''}.</div>
        <div><span className="font-semibold" style={{color: '#f59e0b'}}>Inversión mensual programada</span>: Proyección considerando aportes mensuales según tu plan de inversión.</div>
        <div><span className="font-semibold" style={{color: '#dc2626'}}>Monto Objetivo</span>: Meta de capital a alcanzar para la fecha objetivo.</div>
      </div>
    </div>
  );
} 