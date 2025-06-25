import React from 'react';
import { render, screen } from '@testing-library/react';
import GoalProgress from '../GoalProgress';
import { InvestmentGoal, PortfolioTransaction, PortfolioPosition } from '@/types';
import { Bond } from '@/types/finance';

describe('GoalProgress', () => {
  const baseGoal: InvestmentGoal = {
    id: 'g1',
    name: 'Meta Test',
    targetAmount: 0,
    targetDate: '2024-12-31',
    initialDeposit: 0,
    monthlyContribution: 0,
    currency: 'ARS',
  };

  it('should show 0% progress if targetAmount is 0', () => {
    render(
      <GoalProgress
        goal={{ ...baseGoal, targetAmount: 0 }}
        valueHistory={[]}
        currentValue={1000}
        transactions={[]}
        positions={[]}
        bonds={[]}
      />
    );
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should show 0% progress if targetAmount is falsy', () => {
    render(
      <GoalProgress
        goal={{ ...baseGoal, targetAmount: undefined as any }}
        valueHistory={[]}
        currentValue={1000}
        transactions={[]}
        positions={[]}
        bonds={[]}
      />
    );
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });
}); 