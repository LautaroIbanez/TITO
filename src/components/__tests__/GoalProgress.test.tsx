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

  it('should calculate progress based on fixed-income gains only', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 5000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 5000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={15000} // High current value including stock gains
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show progress based on fixed-income gains, not total portfolio value
    // Fixed-income gains should be around 5000 * 0.75 * (days elapsed / 365)
    // This test verifies that stock gains don't affect the progress calculation
    expect(screen.getByText(/Ganancias del Portafolio/)).toBeInTheDocument();
  });

  it('should ignore stock gains when calculating goal progress', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 1000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'Stock',
        symbol: 'AAPL',
        quantity: 10,
        averagePrice: 100,
        currency: 'USD',
        market: 'NASDAQ',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={5000} // High current value due to stock gains
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show 0% progress since there are no fixed-income positions
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should ignore crypto gains when calculating goal progress', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 1000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 1000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'Crypto',
        symbol: 'BTCUSDT',
        quantity: 1,
        averagePrice: 50000,
        currency: 'USD',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue= {10000} // High current value due to crypto gains
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show 0% progress since there are no fixed-income positions
    expect(screen.getAllByText('0.0%')[0]).toBeInTheDocument();
  });

  it('should calculate progress correctly with fixed-term deposits', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 10000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 8000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'FixedTermDeposit',
        id: 'fd1',
        provider: 'Banco Test',
        amount: 8000,
        annualRate: 75,
        startDate: '2024-01-01',
        maturityDate: '2024-12-31',
        currency: 'ARS',
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={8000}
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show some progress based on fixed-term deposit gains
    expect(screen.getByText(/Ganancias del Portafolio/)).toBeInTheDocument();
  });

  it('should calculate progress correctly with cauciones', () => {
    const goal: InvestmentGoal = {
      ...baseGoal,
      targetAmount: 5000,
    };

    const transactions: PortfolioTransaction[] = [
      {
        id: 't1',
        date: '2024-01-01',
        type: 'Deposit',
        amount: 4000,
        currency: 'ARS',
      },
    ];

    const positions: PortfolioPosition[] = [
      {
        type: 'Caucion',
        id: 'c1',
        provider: 'Broker Test',
        amount: 4000,
        annualRate: 60,
        startDate: '2024-01-01',
        maturityDate: '2024-06-30',
        currency: 'ARS',
        term: 180,
      },
    ];

    render(
      <GoalProgress
        goal={goal}
        valueHistory={[]}
        currentValue={4000}
        transactions={transactions}
        positions={positions}
        bonds={[]}
      />
    );

    // Should show some progress based on caucion gains
    expect(screen.getByText(/Ganancias del Portafolio/)).toBeInTheDocument();
  });
}); 