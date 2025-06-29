import { InvestmentGoal, PortfolioTransaction, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';
import GoalProgress from './GoalProgress';
import { calculateFixedIncomeGains, calculateFixedIncomeValueHistory } from '@/utils/goalCalculator';

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
        // Calculate fixed-income value history for consistent goal progress tracking
        const valueHistory = calculateFixedIncomeValueHistory(positions, transactions, 90);
        
        // Calculate current fixed-income value for progress calculation
        const fixedIncomeGains = calculateFixedIncomeGains(positions, transactions);
        const totalDeposits = transactions
          .filter(t => t.type === 'Deposit')
          .reduce((sum, t) => sum + t.amount, 0);
        const currentValue = totalDeposits + fixedIncomeGains;
        
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