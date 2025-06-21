import { InvestmentGoal } from '@/types';

interface Props {
  goals: InvestmentGoal[];
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function GoalList({ goals }: Props) {
  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <div key={goal.id} className="p-4 border rounded shadow-sm bg-white text-gray-900">
          <h3 className="text-lg font-semibold">{goal.name}</h3>
          <p>Target: {formatCurrency(goal.targetAmount)} by {new Date(goal.targetDate).toLocaleDateString()}</p>
          <p>Initial: {formatCurrency(goal.initialDeposit)}</p>
          <p>Monthly: {formatCurrency(goal.monthlyContribution)}</p>
        </div>
      ))}
    </div>
  );
} 