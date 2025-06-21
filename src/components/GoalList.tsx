import { InvestmentGoal } from '@/types';
import { formatCurrency } from '@/utils/goalCalculator';

interface Props {
  goals: InvestmentGoal[];
  onEdit: (goal: InvestmentGoal) => void;
  onDelete: (goalId: string) => void;
}

export default function GoalList({ goals, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <div key={goal.id} className="p-4 border rounded shadow-sm bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{goal.name}</h3>
              <div className="text-sm text-gray-700 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1">
                <p><span className="font-medium">Objetivo:</span> {formatCurrency(goal.targetAmount)}</p>
                <p><span className="font-medium">Fecha:</span> {new Date(goal.targetDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Aporte Mensual:</span> {formatCurrency(goal.monthlyContribution)}</p>
              </div>
            </div>
            <div className="flex space-x-2 flex-shrink-0 ml-4">
              <button
                onClick={() => onEdit(goal)}
                className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
              >
                Editar
              </button>
              <button
                onClick={() => onDelete(goal.id)}
                className="px-3 py-1 text-sm font-medium text-red-600 bg-red-100 rounded hover:bg-red-200"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 