import { InvestmentGoal, PortfolioTransaction, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';
import GoalProgress from './GoalProgress';

interface Props {
  goals: InvestmentGoal[];
  transactions: PortfolioTransaction[];
  positions: PortfolioPosition[];
  bonds: Bond[];
  onEdit: (goal: InvestmentGoal) => void;
  onDelete: (goalId: string) => void;
}

export default function GoalListWithProgress({ goals, transactions, positions, bonds, onEdit, onDelete }: Props) {
  return (
    <div className="space-y-8">
      {goals.map((goal) => {
        // For now, use all transactions for valueHistory and currentValue
        // In the future, filter transactions by goal if such linkage exists
        // Compute valueHistory as a simple array with one value: initialDeposit + sum of deposits
        const deposits = transactions.filter(t => t.type === 'Deposit');
        const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
        const valueHistory = [
          { date: goal.targetDate, value: goal.initialDeposit + totalDeposits }
        ];
        const currentValue = goal.initialDeposit + totalDeposits;
        
        const actionButtons = (
          <>
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
          </>
        );
        
        return (
          <GoalProgress
            key={goal.id}
            goal={goal}
            valueHistory={valueHistory}
            currentValue={currentValue}
            transactions={transactions}
            positions={positions}
            bonds={bonds}
            actionButtons={actionButtons}
          />
        );
      })}
    </div>
  );
} 